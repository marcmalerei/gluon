import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const siteRoot = resolve(root, 'docs-site');
const outputRoot = resolve(siteRoot, 'dist');
const versions = JSON.parse(await readFile(resolve(siteRoot, 'versions.json'), 'utf8'));
const packageContract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const base = '/gluon/';

if (!versions.supported.includes(versions.latest)) {
  throw new Error(`documentation latest ${versions.latest} is not a supported version`);
}

for (const version of versions.supported) {
  for (const page of [
    'index.html',
    'guides/index.html',
    'guides/getting-started/index.html',
    'guides/quality/index.html',
    'api/index.html',
    'cookbook/index.html',
    'migration/index.html',
    'migration/vue-to-gluon-cutover/index.html',
    'migration/vue-analyzer/index.html',
    'examples/plain.html',
    'examples/ui.html',
    'examples/vue.html',
  ]) await access(resolve(outputRoot, version, page));
}
await access(resolve(outputRoot, 'archive/index.html'));
await access(resolve(outputRoot, 'assets/docs.css'));
await access(resolve(outputRoot, 'assets/docs.js'));

const expectedEntryPoints = packageContract.packages
  .filter((entry) => entry.state === 'current')
  .reduce((total, entry) => total + entry.exports.length, 0);
const apiIndex = await readFile(resolve(root, '.tmp/docs-api/README.md'), 'utf8');
const documentedEntryPoints = (apiIndex.match(/^- \[[^\]]+\]\([^\)]+README\.md\)$/gm) ?? []).length;
if (documentedEntryPoints !== expectedEntryPoints) {
  throw new Error(`API reference documents ${documentedEntryPoints} entry points; package contract requires ${expectedEntryPoints}`);
}

const migration = await readFile(resolve(siteRoot, 'content', versions.latest, 'migration/index.md'), 'utf8');
for (const required of [
  'There is no automatic Vue-to-Gluon source converter',
  'manual redesign',
  'Supported automation',
  'Vue-to-Gluon concept map',
  'RFC 0003',
  'gluon-vue-analyze',
]) if (!migration.includes(required)) throw new Error(`migration documentation is missing: ${required}`);

const vueAnalyzer = await readFile(resolve(siteRoot, 'content', versions.latest, 'migration/vue-analyzer/index.md'), 'utf8');
for (const required of [
  '@gluonjs/vue-migration-analyzer',
  'gluon-vue-analyze',
  'schemaVersion',
  'Exit codes',
  'does not execute',
  'does not write',
  'GVA9002',
]) if (!vueAnalyzer.includes(required)) throw new Error(`Vue analyzer guide is missing: ${required}`);

const cutover = await readFile(resolve(
  siteRoot,
  'content',
  versions.latest,
  'migration/vue-to-gluon-cutover/index.md',
), 'utf8');
for (const required of [
  'Stage 0 — Establish the baseline',
  'Entry criteria',
  'Exit criteria',
  'Boundary and rollback matrix',
  'process-global live store',
  'same DOM subtree',
  'does not parse or transform Vue source',
  'VueProductHost.vue',
  'tests/vue-migration-interop.spec.ts',
]) if (!cutover.includes(required)) throw new Error(`Vue cutover playbook is missing: ${required}`);

const htmlFiles = await filesWithExtension(outputRoot, '.html');
const missingLinks = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    const currentRelative = slash(relative(outputRoot, file));
    const currentPath = currentRelative.endsWith('/index.html')
      ? `${base}${currentRelative.slice(0, -'index.html'.length)}`
      : `${base}${currentRelative}`;
    const target = new URL(href, `https://docs.invalid${currentPath}`);
    if (!target.pathname.startsWith(base)) continue;
    if (target.pathname === `${base}playground/`) continue;
    let targetRelative = decodeURIComponent(target.pathname.slice(base.length));
    if (targetRelative.endsWith('/')) targetRelative += 'index.html';
    const targetFile = resolve(outputRoot, targetRelative);
    try { await access(targetFile); }
    catch { missingLinks.push(`${currentRelative} -> ${href}`); }
  }
}
if (missingLinks.length > 0) throw new Error(`documentation has broken internal links:\n- ${missingLinks.join('\n- ')}`);

const exampleSources = (await filesWithExtension(resolve(siteRoot, 'examples'), '.ts'))
  .filter((file) => !file.endsWith('vite.config.ts'));
if (exampleSources.length < 8) throw new Error(`expected at least 8 compiled TypeScript examples, found ${exampleSources.length}`);

console.log(`documentation valid: ${htmlFiles.length} pages, ${documentedEntryPoints} public entry points, ${exampleSources.length} compiled examples, ${versions.supported.length} supported version`);

async function filesWithExtension(directory, extension) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithExtension(path, extension));
    else if (entry.isFile() && entry.name.endsWith(extension)) files.push(path);
  }
  return files.sort();
}

function slash(value) { return value.split(sep).join('/'); }
