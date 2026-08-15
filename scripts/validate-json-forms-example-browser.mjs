import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const outputRoot = resolve(root, 'docs-site/dist');
const versions = JSON.parse(await readFile(resolve(root, 'docs-site/versions.json'), 'utf8'));
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname).replace(/^\/gluon\/?/, '');
    let file = resolve(outputRoot, relative || 'index.html');
    if (!file.startsWith(`${outputRoot}${sep}`) && file !== outputRoot) throw new Error('path escapes documentation output');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise((accept, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', accept);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('JSON Forms example server did not expose a TCP port');
const origin = `http://127.0.0.1:${address.port}`;
const exampleUrl = `${origin}/gluon/${versions.latest}/examples/json-forms.html`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(exampleUrl);
  await page.waitForFunction(() => Boolean(
    document.querySelector('gluon-json-form')?.shadowRoot?.querySelector('input'),
  ));
  await page.waitForFunction(() => [...document.querySelector('gluon-json-form')?.shadowRoot?.querySelectorAll('button') ?? []]
    .some((button) => button.textContent?.includes('hinzufügen')));

  const initial = await page.locator('gluon-json-form').evaluate((element) => {
    const form = element;
    return {
      label: form.shadowRoot?.querySelector('[part="form"]')?.getAttribute('aria-label'),
      addLabel: [...form.shadowRoot?.querySelectorAll('button') ?? []]
        .find((button) => button.textContent?.includes('hinzufügen'))?.textContent?.trim(),
    };
  });
  if (initial.label !== 'Handover rules') throw new Error('maintained example did not preserve the application-authored schema title');
  if (initial.addLabel !== 'Weiteren Benachrichtigungskanal hinzufügen') throw new Error('maintained example did not render localized array controls');

  const valid = await page.locator('gluon-json-form').evaluate(async (element) => {
    const form = element;
    const email = form.shadowRoot?.querySelector('input[type="email"]');
    if (!(email instanceof HTMLInputElement)) return true;
    email.value = '';
    email.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await form.updateComplete;
    return form.reportValidity();
  });
  if (valid) throw new Error('maintained example accepted missing required localized data');
  await page.waitForFunction(() => document.querySelector('gluon-json-form')?.shadowRoot?.textContent?.includes('Dieses Feld ist erforderlich.'));

  await page.locator('gluon-json-form').evaluate(async (element) => {
    const form = element;
    const add = [...form.shadowRoot?.querySelectorAll('button') ?? []]
      .find((button) => button.textContent?.includes('hinzufügen'));
    add?.click();
    await form.updateComplete;
  });
  const mobile = await page.locator('gluon-json-form').evaluate((element) => {
    const form = element;
    const remove = [...form.shadowRoot?.querySelectorAll('button') ?? []]
      .find((button) => button.textContent?.includes('entfernen'));
    return {
      removeLabel: remove?.textContent?.trim(),
      removeHeight: remove?.getBoundingClientRect().height ?? 0,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      hostOverflow: form.scrollWidth - form.clientWidth,
    };
  });
  if (mobile.removeLabel !== 'Benachrichtigungskanal 1 entfernen') throw new Error('localized item numbering did not render in the maintained example');
  if (mobile.removeHeight < 44) throw new Error(`localized item control is below 44px: ${mobile.removeHeight}`);
  if (mobile.pageOverflow > 1 || mobile.hostOverflow > 1) throw new Error(`localized example overflows at 390px: ${JSON.stringify(mobile)}`);

  await page.locator('gluon-json-form').evaluate(async (element) => {
    const form = element;
    form.schema = { type: 'string' };
    await form.updateComplete;
  });
  await page.waitForFunction(() => document.querySelector('gluon-json-form')?.shadowRoot?.textContent?.includes('Konfigurationshinweis:'));
} finally {
  await browser.close();
  await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept()));
}

console.log('JSON Forms maintained example browser contract valid: German copy, validation, diagnostics, 390px layout, and 44px controls');

function contentType(file) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  })[extname(file)] ?? 'application/octet-stream';
}
