import { createServer } from 'node:http';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const directory = await mkdtemp(resolve(tmpdir(), 'gluon-component-library-clean-'));

try {
  const archives = [];
  for (const packageDirectory of ['packages/reactivity', '.', 'packages/quarks', 'examples/component-library/library']) {
    const packed = JSON.parse((await execFile('npm', [
      'pack', '--json', '--ignore-scripts', '--pack-destination', directory,
    ], { cwd: resolve(root, packageDirectory) })).stdout)[0];
    archives.push(resolve(directory, packed.filename));
  }

  const consumer = resolve(directory, 'consumer');
  await mkdir(resolve(consumer, 'src'), { recursive: true });
  await writeFile(resolve(consumer, 'package.json'), JSON.stringify({
    name: 'component-library-clean-consumer', private: true, type: 'module',
  }, null, 2));
  await writeFile(resolve(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, lib: ['ES2022', 'DOM'] },
    include: ['src/**/*.ts'],
  }, null, 2));
  await writeFile(resolve(consumer, 'index.html'), '<main id="app"></main><script type="module" src="/src/main.ts"></script>');
  await writeFile(resolve(consumer, 'src/main.ts'), `
    import { createApp, html } from '@gluonjs/core';
    import { ProductBadge } from '@gluonjs/example-component-library';
    const app = createApp(() => html\`<section><p>\${ProductBadge('In stock')}</p><example-product-picker value="1"></example-product-picker></section>\`).mount(document.querySelector('#app')!);
    Object.assign(window, { componentLibraryUnmount: () => app.unmount() });
  `);
  await execFile('npm', ['install', ...archives, 'vite@8.1.4', 'typescript@5.9.3', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: consumer, maxBuffer: 20 * 1024 * 1024,
  });
  await execFile(resolve(consumer, 'node_modules/.bin/tsc'), ['--noEmit'], { cwd: consumer });
  await execFile(resolve(consumer, 'node_modules/.bin/vite'), ['build'], { cwd: consumer });

  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      const body = await readFile(resolve(consumer, 'dist', relative));
      response.writeHead(200, { 'content-type': contentType(relative) });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Clean component-library consumer server did not bind a TCP port.');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}`);
    const picker = page.locator('example-product-picker');
    await picker.locator('[aria-label="Increase quantity"]').click();
    if (await picker.locator('output').textContent() !== '2' || !await page.getByText('In stock').count()) {
      throw new Error('Packed component-library consumer browser flow is incomplete.');
    }
    await page.evaluate(() => window.componentLibraryUnmount());
    if (await page.locator('example-product-picker').count() !== 0) throw new Error('Packed component-library consumer teardown is incomplete.');
  } finally {
    await browser.close();
    await new Promise((resolveServer, rejectServer) => server.close((error) => error ? rejectServer(error) : resolveServer()));
  }
  console.log('component-library clean install valid: packed public package, typecheck, production build, browser interaction, and teardown');
} finally {
  await rm(directory, { recursive: true, force: true });
}

function contentType(path) {
  return extname(path) === '.js' ? 'text/javascript' : extname(path) === '.css' ? 'text/css' : 'text/html';
}
