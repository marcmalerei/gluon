import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'examples/component-library/dist');
const evidenceDirectory = resolve(root, '.tmp/quality-evidence');
const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'));
const entry = manifest['index.html'];
const expectedDynamicEntries = [
  'library/src/product-badge.ts',
  'library/src/product-picker.ts',
];
if (!entry?.isEntry || JSON.stringify(entry.dynamicImports) !== JSON.stringify(expectedDynamicEntries)) {
  throw new Error('Component-library entry must retain the exact badge and picker dynamic imports.');
}
const dynamicEntries = Object.fromEntries(expectedDynamicEntries.map((source) => {
  const chunk = manifest[source];
  if (!chunk?.isDynamicEntry || typeof chunk.file !== 'string') throw new Error(`Missing dynamic component chunk for ${source}.`);
  return [source, chunk.file];
}));
if (new Set(Object.values(dynamicEntries)).size !== expectedDynamicEntries.length) {
  throw new Error('Component-library modules must emit distinct dynamic chunks.');
}

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    const path = resolve(dist, relative);
    if (!path.startsWith(`${dist}/`) && path !== resolve(dist, 'index.html')) return response.writeHead(400).end();
    const body = await readFile(path);
    response.writeHead(200, { 'content-type': contentType(path) });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Component-library loader verifier did not bind a TCP port.');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const requests = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.getByRole('heading', { name: 'Packed library consumer' }).waitFor();
  await page.getByText('In stock').waitFor();
  const badgeFile = `/${dynamicEntries['library/src/product-badge.ts']}`;
  const pickerFile = `/${dynamicEntries['library/src/product-picker.ts']}`;
  if (!requests.includes(badgeFile) || requests.includes(pickerFile)) {
    throw new Error('Initial loader requests must include only the requested badge component chunk.');
  }
  const initialRequests = [...requests];
  if (await page.locator('[data-loader-status]').textContent() !== 'Picker: idle') throw new Error('Picker must remain idle before an explicit request.');

  const loadButton = page.getByRole('button', { name: 'Load product picker' });
  await loadButton.click();
  await page.getByText('Picker: loaded').waitFor();
  const picker = page.locator('example-product-picker');
  await picker.locator('[aria-label="Increase quantity"]').click();
  if (await picker.locator('output').textContent() !== '2') throw new Error('Loaded product picker interaction failed.');
  await loadButton.click();
  await page.getByText('Picker: loaded').waitFor();
  if (requests.filter((path) => path === pickerFile).length !== 1) throw new Error('Cached picker loads must not request another chunk.');

  await mkdir(evidenceDirectory, { recursive: true });
  const screenshot = resolve(evidenceDirectory, 'component-library-loader.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  const chunks = Object.fromEntries(await Promise.all(Object.entries(dynamicEntries).map(async ([source, file]) => [
    source,
    { file, bytes: (await stat(resolve(dist, file))).size },
  ])));
  const report = {
    schemaVersion: 1,
    browser: { name: 'chromium', version: browser.version() },
    chunks,
    initialRequests,
    requests,
    assertions: {
      initialBadgeOnly: true,
      pickerRequestedOnce: true,
      cacheHitWithoutRequest: true,
      interaction: 'quantity 1 -> 2',
    },
  };
  await writeFile(resolve(evidenceDirectory, 'component-library-loader.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise((resolveServer, rejectServer) => server.close((error) => error ? rejectServer(error) : resolveServer()));
}

function contentType(path) {
  return ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(path)] ?? 'application/octet-stream';
}
