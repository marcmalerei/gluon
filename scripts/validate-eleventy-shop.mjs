import { execFile as execFileCallback } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'examples/shop/dist-eleventy');
await rm(output, { recursive: true, force: true });
await execFile(resolve(root, 'node_modules/.bin/eleventy'), [
  '--config', resolve(root, 'examples/shop/eleventy.config.mjs'),
  '--input', resolve(root, 'examples/shop/eleventy-routes'),
  '--output', output,
], { cwd: root, maxBuffer: 10 * 1024 * 1024 });

for (const route of ['index.html', 'shop/index.html', 'products/orbit-lamp/index.html']) {
  const eleventy = await readFile(resolve(output, route), 'utf8');
  const viteStatic = await readFile(resolve(root, 'examples/shop/dist-static', route), 'utf8');
  const markers = route.includes('orbit-lamp')
    ? ['Orbit Lamp', 'gluon-product-configurator', 'data-gluon-state']
    : route.startsWith('shop/') ? ['Shop all objects', 'Orbit Lamp', 'data-gluon-state']
      : ['Objects that work the way you do.', 'Shop the collection', 'data-gluon-state'];
  for (const marker of markers) {
    if (!eleventy.includes(marker) || !viteStatic.includes(marker)) {
      throw new Error(`${route} diverged at required visible marker ${marker}`);
    }
  }
  if (!eleventy.includes('data-gluon-style=') || !eleventy.includes('rel="modulepreload"')
    || !eleventy.includes('type="module"') || eleventy.includes('<style>')) {
    throw new Error(`${route} did not preserve Gluon style, resource, and hydration transport.`);
  }
}
const manifestAssets = JSON.parse(await readFile(resolve(root, 'examples/shop/dist/gluon-assets.json'), 'utf8'));
await readFile(resolve(output, manifestAssets.entry.replace(/^\//, '')));
console.log('Eleventy GLUON GOODS output valid: 3 canonical routes, assets, styles, state, and hydration entry');
