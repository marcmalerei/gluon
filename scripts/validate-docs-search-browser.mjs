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
    const relativeUrl = decodeURIComponent(url.pathname).replace(/^\/gluon\/?/, '');
    let file = resolve(outputRoot, relativeUrl || 'index.html');
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
if (!address || typeof address === 'string') throw new Error('documentation test server did not expose a TCP port');
const origin = `http://127.0.0.1:${address.port}`;
const packageUrl = `${origin}/gluon/${versions.latest}/packages/core/`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(packageUrl);
  const opener = page.locator('[data-search-open]');
  await opener.click();
  await page.locator('[data-search-input]').waitFor();
  await expectFocused(page, '[data-search-input]', 'search input receives focus when opened');

  await page.locator('[data-search-input]').fill('store');
  const results = page.locator('[data-search-result]');
  if (await results.count() < 2) throw new Error('global search did not return multiple contextual Store results');
  const firstResult = results.first();
  for (const selector of ['small', 'strong', 'p']) {
    if (!(await firstResult.locator(selector).textContent())?.trim()) throw new Error(`search result is missing ${selector} context`);
  }

  await page.locator('[data-search-input]').press('ArrowDown');
  await expectFocused(page, '[data-search-result="0"]', 'ArrowDown focuses the first result');
  await page.keyboard.press('ArrowDown');
  await expectFocused(page, '[data-search-result="1"]', 'ArrowDown advances between results');
  await page.keyboard.press('ArrowUp');
  await expectFocused(page, '[data-search-result="0"]', 'ArrowUp returns to the previous result');

  const target = await firstResult.getAttribute('href');
  if (!target) throw new Error('search result has no navigable URL');
  await Promise.all([
    page.waitForURL((url) => url.pathname === new URL(target, origin).pathname),
    page.keyboard.press('Enter'),
  ]);

  await page.goto(packageUrl);
  await opener.click();
  await page.locator('[data-search-input]').fill('definitely-no-such-gluon-page');
  if (!((await page.locator('[data-search-status]').textContent()) ?? '').includes('No results')) {
    throw new Error('empty search results do not expose a useful status');
  }
  await page.locator('[data-search-close]').focus();
  await page.keyboard.press('Tab');
  await expectFocused(page, '[data-search-input]', 'Tab wraps inside the modal search dialog');
  await page.keyboard.press('Shift+Tab');
  await expectFocused(page, '[data-search-close]', 'Shift+Tab wraps inside the modal search dialog');
  await page.keyboard.press('Escape');
  if (!(await page.locator('[data-search-panel]').getAttribute('hidden') !== null)) throw new Error('Escape did not close the search overlay');
  await expectFocused(page, '[data-search-open]', 'closing search restores focus to its trigger');

  await page.route('**/assets/search-index.json', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.reload();
  await opener.click();
  await page.locator('[data-search-status]').filter({ hasText: 'temporarily unavailable' }).waitFor();
  await page.keyboard.press('Escape');

  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const noScriptPage = await noScript.newPage();
    await noScriptPage.goto(packageUrl);
    if (!(await noScriptPage.locator('.search-noscript-fallback').isVisible())) throw new Error('no-script search fallback is not visible');
    const staticNavigation = noScriptPage.locator('[data-sidebar] a').first();
    if (!(await staticNavigation.isVisible()) || !(await staticNavigation.getAttribute('href'))) {
      throw new Error('documentation navigation is not browsable without JavaScript');
    }
    if (await noScriptPage.locator('[data-search-open]').isVisible()) throw new Error('inert search trigger remains visible without JavaScript');
  } finally {
    await noScript.close();
  }
} finally {
  await browser.close();
  await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept()));
}

console.log('documentation search browser contract valid: package pages, keyboard, focus, failure, and no-script paths');

async function expectFocused(page, selector, context) {
  const focused = await page.locator(selector).evaluate((element) => element === document.activeElement);
  if (!focused) throw new Error(context);
}

function contentType(file) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
  })[extname(file)] ?? 'application/octet-stream';
}
