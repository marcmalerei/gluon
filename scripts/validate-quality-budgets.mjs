import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { basename, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const budgets = JSON.parse(await readFile(resolve(root, 'quality-budgets.json'), 'utf8'));
const dist = resolve(root, 'examples/shop/dist');
const assets = resolve(dist, 'assets');
const assetNames = await readdir(assets);
const entries = assetNames.filter((name) => /^index-[^.]+\.js$/.test(name));
if (entries.length !== 1) throw new Error(`quality budget: expected one shop entry, found ${entries.length}`);

const html = await readFile(resolve(dist, 'index.html'));
const manifest = JSON.parse(await readFile(resolve(dist, 'gluon-assets.json'), 'utf8'));
const initialFiles = [manifest.entry, ...(manifest.imports ?? [])].map((file) => basename(file));
const initialJavaScript = await Promise.all(initialFiles.map((file) => readFile(resolve(assets, file))));
const imageNames = assetNames.filter((name) => /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(name)).sort();
const imageBytes = (await Promise.all(imageNames.map(async (name) => (await stat(resolve(assets, name))).size)))
  .reduce((total, size) => total + size, 0);
const actual = {
  htmlBytes: html.byteLength,
  entryBytes: initialJavaScript.reduce((total, file) => total + file.byteLength, 0),
  entryGzipBytes: initialJavaScript.reduce((total, file) => total + gzipSync(file, { level: 9 }).byteLength, 0),
  imageBytes,
  imageCount: imageNames.length,
};

const budgetEntries = Object.entries(budgets.shop);
const missingBudgets = Object.keys(actual).filter((metric) => !Object.hasOwn(budgets.shop, metric));
const unknownBudgets = budgetEntries.filter(([metric]) => !Object.hasOwn(actual, metric)).map(([metric]) => metric);
const invalidBudgets = budgetEntries.filter(([, maximum]) => !Number.isFinite(maximum) || maximum < 0).map(([metric]) => metric);
if (missingBudgets.length > 0 || unknownBudgets.length > 0 || invalidBudgets.length > 0) {
  throw new Error(`quality budget schema invalid: ${JSON.stringify({ missingBudgets, unknownBudgets, invalidBudgets })}`);
}

const failures = budgetEntries.flatMap(([metric, maximum]) => {
  const value = actual[metric];
  return value > maximum ? [`${metric} ${value} exceeds ${maximum} by ${value - maximum}`] : [];
});
if (failures.length > 0) {
  throw new Error(`GLUON quality budget failed:\n- ${failures.join('\n- ')}\nActual: ${JSON.stringify(actual)}`);
}
console.log(`quality budgets valid: ${JSON.stringify(actual)}`);
