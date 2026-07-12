import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { basename, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const shopDist = resolve(root, 'examples/shop/dist');
const assetsDirectory = resolve(shopDist, 'assets');
const assetNames = await readdir(assetsDirectory);
const entryNames = assetNames.filter((name) => /^index-[^.]+\.js$/.test(name));

if (entryNames.length !== 1) {
  throw new Error(`Expected exactly one shop JavaScript entry, found ${entryNames.length}.`);
}

const html = await measure(resolve(shopDist, 'index.html'));
const manifest = JSON.parse(await readFile(resolve(shopDist, 'gluon-assets.json'), 'utf8'));
const initialFiles = [manifest.entry, ...(manifest.imports ?? [])].map((file) => basename(file));
const initialMeasurements = await Promise.all(initialFiles.map((file) => measure(resolve(assetsDirectory, file))));
const entry = {
  paths: initialMeasurements.map(({ path }) => path),
  bytes: initialMeasurements.reduce((total, measurement) => total + measurement.bytes, 0),
  gzipBytes: initialMeasurements.reduce((total, measurement) => total + measurement.gzipBytes, 0),
};
const imageNames = assetNames.filter((name) => name.endsWith('.webp')).sort();
const imageSizes = await Promise.all(imageNames.map(async (name) => (
  await stat(resolve(assetsDirectory, name))
).size));

console.log(JSON.stringify({
  html,
  entry,
  images: {
    count: imageNames.length,
    bytes: imageSizes.reduce((total, size) => total + size, 0),
  },
}, null, 2));

async function measure(path) {
  const contents = await readFile(path);
  return {
    path: relative(root, path),
    bytes: contents.byteLength,
    gzipBytes: gzipSync(contents, { level: 9 }).byteLength,
  };
}
