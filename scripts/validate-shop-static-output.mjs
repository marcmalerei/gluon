import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if ('document' in globalThis) throw new Error('Static shop verification must run without a browser document.');

const outputDirectory = resolve(import.meta.dirname, '../examples/shop/dist-static');
const manifest = JSON.parse(await readFile(resolve(outputDirectory, 'gluon-static.json'), 'utf8'));
const expectedPages = ['/', '/shop', '/products/orbit-lamp', '/shipping', '/returns'];
const expectedDynamicRoutes = ['/products/:slug', '/checkout', '/orders/:id'];

assertExact('static pages', manifest.pages.map(({ url }) => url), expectedPages);
assertExact('dynamic fallbacks', manifest.dynamicRoutes, expectedDynamicRoutes);

for (const page of manifest.pages) {
  const html = await readFile(resolve(outputDirectory, page.file), 'utf8');
  if (!html.includes('data-gluon-state') || !html.includes('<script type="module"')) {
    throw new Error(`${page.url} is missing hydratable state or its production entry.`);
  }
}

for (const asset of [manifest.assets.entry, ...manifest.assets.imports, ...manifest.assets.assets]) {
  await access(resolve(outputDirectory, asset.replace(/^\//, '')));
}

console.log(`static shop valid: ${manifest.pages.length} pages, ${manifest.dynamicRoutes.length} dynamic fallbacks, hydratable output and assets`);

function assertExact(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected ${label}: ${JSON.stringify(actual)}.`);
  }
}
