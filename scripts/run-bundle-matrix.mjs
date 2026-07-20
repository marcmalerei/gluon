import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

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
  results[fixture] = files.filter((file) => /\.(?:js|css)$/.test(file.path)).reduce((total, file) => ({ raw: total.raw + file.raw, gzip: total.gzip + file.gzip, brotli: total.brotli + file.brotli }), { raw: 0, gzip: 0, brotli: 0 });
}
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const report = { schemaVersion: 1, node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(), lockfileVersion: packageLock.lockfileVersion, fixtures: results, scope: 'Equivalent labelled counter fixture; results are per production entry and are not a universal framework ranking.' };
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
