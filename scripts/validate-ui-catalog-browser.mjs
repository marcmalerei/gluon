import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const outputRoot = resolve(root, 'docs-site/dist');
const catalog = JSON.parse(await readFile(resolve(root, 'docs-site/data/ui-catalog.json'), 'utf8'));
const versions = JSON.parse(await readFile(resolve(root, 'docs-site/versions.json'), 'utf8'));

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relativeUrl = decodeURIComponent(url.pathname).replace(/^\/gluon\/?/, '');
    let file = resolve(outputRoot, relativeUrl || 'index.html');
    if (!file.startsWith(`${outputRoot}${sep}`) && file !== outputRoot) throw new Error('path escapes docs output');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    response.end(await readFile(file));
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
if (!address || typeof address === 'string') throw new Error('catalog test server did not expose a TCP port');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const pageErrors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${origin}/gluon/${versions.latest}/guides/ui-catalog/`, { waitUntil: 'networkidle' });

  if (await page.title() !== 'UI catalog | Gluon') throw new Error('catalog page title is incorrect');
  if (await page.locator('[data-ui-catalog-card]').count() !== catalog.entries.length) {
    throw new Error('catalog card count does not match generated manifest data');
  }
  if (await page.locator('[data-preview-fallback]').count() !== 0) {
    throw new Error('catalog contains a generic preview fallback');
  }
  if (await page.locator('[data-ui-catalog-status]').textContent() !== `${catalog.entries.length} components shown`) {
    throw new Error('catalog status does not report the initial component count');
  }

  await page.getByRole('button', { name: 'Molecules' }).click();
  const moleculeCount = catalog.entries.filter((entry) => entry.layer === 'molecule').length;
  if (await page.locator('[data-ui-catalog-card]:visible').count() !== moleculeCount) {
    throw new Error('layer filter does not isolate molecule cards');
  }
  if (await page.locator('[data-ui-catalog-status]').textContent() !== `${moleculeCount} components shown`) {
    throw new Error('layer filter does not update the accessible result count');
  }

  await page.getByRole('button', { name: 'All' }).click();
  await page.locator('[data-ui-catalog-search]').fill('Avatar');
  if (await page.locator('[data-ui-catalog-card]:visible').count() !== 1) {
    throw new Error('catalog search does not isolate the requested component');
  }
  if (await page.locator('[data-ui-catalog-card]:visible h2').textContent() !== 'Avatar') {
    throw new Error('catalog search selected the wrong component');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-ui-catalog-search]').fill('');
  const mobileLayout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    previewVisible: Boolean(document.querySelector('[data-ui-catalog-card]:not([hidden]) .ui-catalog-preview')),
  }));
  if (mobileLayout.documentWidth > mobileLayout.viewportWidth || !mobileLayout.previewVisible) {
    throw new Error(`catalog mobile layout is invalid: ${JSON.stringify(mobileLayout)}`);
  }
  if (pageErrors.length) throw new Error(`catalog emitted browser errors:\n- ${pageErrors.join('\n- ')}`);
} finally {
  await browser.close();
  await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept()));
}

console.log(`UI catalog browser contract valid: ${catalog.entries.length} previews, filtering, search, and 390px layout`);

function contentType(file) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
  })[extname(file)] ?? 'application/octet-stream';
}
