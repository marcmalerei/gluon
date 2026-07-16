import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gluonEleventyPlugin } from '@gluonjs/ssr/eleventy';
import { renderShopRequest } from './dist-server/server.js';

export default async function configure(eleventyConfig) {
  const assets = JSON.parse(await readFile(resolve(import.meta.dirname, 'dist/gluon-assets.json'), 'utf8'));
  eleventyConfig.addPlugin(gluonEleventyPlugin, {
    assets,
    nonce: 'gluon-shop-eleventy',
    csp: "default-src 'self'; style-src 'self' 'nonce-gluon-shop-eleventy'",
    dynamicFallbacks: ['/products/:slug', '/checkout', '/orders/:id'],
    createRequest: ({ url, assets, nonce }) => ({
      render: () => renderShopRequest(url, { assets, nonce }),
    }),
  });
  eleventyConfig.addPassthroughCopy({
    [resolve(import.meta.dirname, 'dist/assets')]: 'assets',
  });
}
