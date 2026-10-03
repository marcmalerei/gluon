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
  if (await page.locator('[data-preview-rendered]').count() !== catalog.entries.length) {
    throw new Error('catalog does not render a preview region for every component');
  }
  for (const card of await page.locator('[data-ui-catalog-card]').all()) {
    const contract = await card.evaluate((element) => ({
      variantCount: element.querySelectorAll('.ui-catalog-preview-contract > div:first-child li').length,
      stateCount: element.querySelectorAll('.ui-catalog-preview-contract > div:last-child li').length,
      expectedVariants: Number(element.getAttribute('data-variant-count')),
      expectedStates: Number(element.getAttribute('data-state-count')),
      preview: element.querySelector('[data-preview-rendered]')?.dataset.preview ?? '',
      anatomy: element.querySelector('[data-preview-anatomy]')?.dataset.previewAnatomy ?? '',
      anatomyChildren: element.querySelector('[data-preview-anatomy]')?.children.length ?? 0,
    }));
    if (contract.variantCount !== contract.expectedVariants || contract.stateCount !== contract.expectedStates) {
      throw new Error(`catalog preview contract is incomplete: ${JSON.stringify(contract)}`);
    }
    if (!contract.preview || contract.anatomy !== contract.preview || contract.anatomyChildren === 0) {
      throw new Error(`catalog preview anatomy is incomplete: ${JSON.stringify(contract)}`);
    }
  }
  if (await page.locator('[data-preview="aspect-ratio"] .ui-sample-ratio').count() !== 3) {
    throw new Error('aspect-ratio preview does not show all ratio variants');
  }
  if (await page.locator('[data-preview="avatar"] .ui-sample-avatar-set > span').count() !== 3) {
    throw new Error('avatar preview does not show image, initials, and fallback variants');
  }
  if (await page.locator('[data-preview="table"] table').count() !== 1) {
    throw new Error('table preview does not preserve native table anatomy');
  }
  if (await page.locator('[data-preview="tabs"] [role="tablist"] [role="tab"]').count() !== 3) {
    throw new Error('tabs preview does not show a native tablist anatomy');
  }
  if (await page.locator('[data-preview="segmented"] [role="toolbar"] [aria-pressed]').count() !== 3) {
    throw new Error('segmented preview does not show toggle-button anatomy');
  }
  if (await page.locator('[data-preview="otp"] .ui-sample-otp > span').count() !== 6) {
    throw new Error('one-time-password preview does not show six code segments');
  }
  if (await page.locator('[data-preview="password"] .ui-sample-field + button').count() !== 1) {
    throw new Error('password preview does not show its visibility control');
  }
  if (await page.locator('[data-preview="page-layout"] .ui-sample-page-layout > .is-header').count() !== 1) {
    throw new Error('page-layout preview does not show its header anatomy');
  }
  if (await page.locator('[data-preview="split-pane"] .ui-sample-split-pane > .is-primary').count() !== 1) {
    throw new Error('split-pane preview does not show its primary anatomy');
  }
  if (await page.locator('[data-preview="popover"] [role="dialog"]').count() !== 1) {
    throw new Error('popover preview does not show its labelled dialog anatomy');
  }
  if (await page.locator('[data-preview="sheet"] .ui-sample-sheet-overlay .ui-sample-sheet').count() !== 1) {
    throw new Error('sheet preview does not show its edge-panel anatomy');
  }
  if (await page.locator('[data-preview="date-picker"] input[type="date"]').count() !== 1) {
    throw new Error('date-picker preview does not show native date anatomy');
  }
  if (await page.locator('[data-preview="file-upload"] input[type="file"]').count() !== 1
    || await page.locator('[data-preview="file-upload"] .ui-sample-file-upload li').count() !== 2) {
    throw new Error('file-upload preview does not show native input and selected-file anatomy');
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
