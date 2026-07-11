import { cp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateStaticSite } from '../packages/ssr/dist/static.js';
import { renderShopRequest } from '../examples/shop/dist-server/server.js';

const repositoryRoot = resolve(import.meta.dirname, '..');
const assets = JSON.parse(await readFile(resolve(repositoryRoot, 'examples/shop/dist/gluon-assets.json'), 'utf8'));
const result = await generateStaticSite({
  routes: ['/', '/shop', '/products/orbit-lamp', '/shipping', '/returns'],
  dynamicRoutes: ['/products/:slug', '/checkout', '/orders/:id'],
  outputDirectory: resolve(repositoryRoot, 'examples/shop/dist-static'),
  assets,
  render: (url) => renderShopRequest(url, { assets }),
});
await cp(
  resolve(repositoryRoot, 'examples/shop/dist/assets'),
  resolve(repositoryRoot, 'examples/shop/dist-static/assets'),
  { recursive: true },
);
console.log(`generated ${result.pages.length} static GLUON GOODS routes; ${result.dynamicRoutes.length} dynamic fallback`);
