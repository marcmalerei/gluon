import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, '.tmp/bundle-matrix');
const fixtures = ['gluon', 'lit', 'vue', 'react'];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
execFileSync('npm', ['run', 'build:core'], { cwd: root, stdio: 'inherit' });

const results = {};
for (const fixture of fixtures) {
  const source = resolve(root, 'benchmarks/bundle/fixtures', fixture);
  const target = resolve(output, fixture);
  execFileSync('npx', ['vite', 'build', source, '--outDir', target, '--manifest'], { cwd: root, stdio: 'inherit' });
  const files = await collect(target);
  const manifest = JSON.parse(await readFile(resolve(target, '.vite/manifest.json'), 'utf8'));
  const browser = await verifyParity(target, fixture);
  results[fixture] = {
    bytes: files.filter((file) => /\.(?:js|css)$/.test(file.path)).reduce((total, file) => ({ raw: total.raw + file.raw, gzip: total.gzip + file.gzip, brotli: total.brotli + file.brotli }), { raw: 0, gzip: 0, brotli: 0 }),
    moduleGraph: Object.fromEntries(Object.entries(manifest).map(([entry, value]) => [entry, { file: value.file, imports: value.imports ?? [], dynamicImports: value.dynamicImports ?? [], css: value.css ?? [] }])),
    parity: { browser },
  };
}
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const report = { schemaVersion: 1, node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(), vite: execFileSync('npx', ['vite', '--version'], { encoding: 'utf8' }).trim(), lockfileVersion: packageLock.lockfileVersion, fixtures: results, scope: 'Equivalent labelled counter fixture; results are per production entry and are not a universal framework ranking.' };
await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? collect(resolve(directory, entry.name)) : measure(resolve(directory, entry.name))))).flat();
}
async function measure(path) {
  const contents = await readFile(path);
  return { path: relative(root, path), raw: contents.byteLength, gzip: gzipSync(contents, { level: 9 }).byteLength, brotli: brotliCompressSync(contents, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength };
}

async function verifyParity(directory, fixture) {
  const server = createServer(async (request, response) => {
    const pathname = request.url === '/' ? 'index.html' : decodeURIComponent(request.url ?? '').replace(/^\//, '');
    const path = resolve(directory, pathname);
    if (!path.startsWith(directory)) return response.writeHead(400).end();
    try {
      const contents = await readFile(path);
      response.writeHead(200, { 'content-type': mimeType(path) });
      response.end(contents);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const { port } = server.address();
  const browser = await chromium.launch({ headless: true });
  try {
    const version = browser.version();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}`);
    await page.getByRole('heading', { name: 'Bundle fixture' }).waitFor();
    const button = page.getByRole('button', { name: 'Increment' });
    await button.click();
    const output = page.locator('output[aria-live="polite"]');
    if (await output.textContent() !== '1') throw new Error(`${fixture} did not preserve the required counter interaction.`);
    return version;
  } finally {
    await browser.close();
    await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  }
}

function mimeType(path) {
  return ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(path)] ?? 'application/octet-stream';
}
