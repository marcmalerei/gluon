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
    'migration/vue-codemod-decision/index.html',
    'examples/plain.html',
    'examples/ui.html',
    'examples/vue.html',
  ]) await access(resolve(outputRoot, version, page));
}
await access(resolve(outputRoot, 'archive/index.html'));
await access(resolve(outputRoot, 'assets/docs.css'));
await access(resolve(outputRoot, 'assets/docs.js'));
const docsStyles = await readFile(resolve(outputRoot, 'assets/docs.css'), 'utf8');
if (!docsStyles.includes('.content h1 { overflow-wrap: anywhere;')) {
  throw new Error('documentation CSS must wrap long generated API titles on mobile');
}

const expectedEntryPoints = packageContract.packages
  .filter((entry) => entry.state === 'current')
  .reduce((total, entry) => total + entry.exports.length, 0);
const apiIndex = await readFile(resolve(root, '.tmp/docs-api/README.md'), 'utf8');
const documentedEntryPoints = (apiIndex.match(/^- \[[^\]]+\]\([^\)]+README\.md\)$/gm) ?? []).length;
if (documentedEntryPoints !== expectedEntryPoints) {
  throw new Error(`API reference documents ${documentedEntryPoints} entry points; package contract requires ${expectedEntryPoints}`);
}

const apiExampleManifest = JSON.parse(await readFile(resolve(root, '.tmp/api-examples/manifest.json'), 'utf8'));
const apiSymbolPattern = /\/(?:functions|classes|interfaces|type-aliases|variables)\/[^/]+\.md$/;
const apiSymbolFiles = (await filesWithExtension(resolve(root, '.tmp/docs-api'), '.md'))
  .map((file) => slash(relative(resolve(root, '.tmp/docs-api'), file)))
  .filter((file) => apiSymbolPattern.test(`/${file}`))
  .sort();
if (apiExampleManifest.symbolPages !== apiSymbolFiles.length
  || apiExampleManifest.entries.length !== apiSymbolFiles.length) {
  throw new Error(`API examples cover ${apiExampleManifest.entries.length} pages; generated API has ${apiSymbolFiles.length} symbol pages`);
}
const examplePaths = apiExampleManifest.entries.map(({ path }) => path).sort();
if (JSON.stringify(examplePaths) !== JSON.stringify(apiSymbolFiles)) {
  throw new Error('API example manifest paths do not match the generated symbol pages');
}
for (const entry of apiExampleManifest.entries) {
  const markdown = await readFile(resolve(root, '.tmp/docs-api', entry.path), 'utf8');
  if (!markdown.includes('\n## Example\n') || !markdown.includes(`from '${entry.module}'`)) {
    throw new Error(`Generated API example is missing or uses the wrong public module: ${entry.path}`);
  }
  for (const placeholder of [/\bdeclare const\b/, /\btype Example\s*=/, /\bvoid value\b/]) {
    if (placeholder.test(markdown)) throw new Error(`Generated API example contains a compiler-only placeholder: ${entry.path}`);
  }
  const html = await readFile(resolve(outputRoot, versions.latest, 'api/generated', entry.htmlPath), 'utf8');
  if (!html.includes('id="example"') || !html.includes('class="language-ts"')) {
    throw new Error(`Rendered API example is missing from ${entry.htmlPath}`);
  }
}
const memoryHistoryExample = await readFile(resolve(
  root,
  '.tmp/docs-api/packages/router/src/functions/createMemoryHistory.md',
), 'utf8');
for (const required of [
  'tests, server requests',
  'final item in `initialEntries` is the current location',
  'must contain at least one entry',
  'until `destroy()` is called',
  '## Throws',
  "from '@gluonjs/router/memory'",
  'history.listen',
  'history.go(-1)',
  'history.destroy()',
]) if (!memoryHistoryExample.includes(required)) throw new Error(`createMemoryHistory API example is missing: ${required}`);

const routerOptionsExample = await readFile(resolve(
  root,
  '.tmp/docs-api/packages/router/src/interfaces/RouterOptions.md',
), 'utf8');
for (const required of [
  "from '@gluonjs/router/memory'",
  "createMemoryHistory(['/products'])",
  "routes: [{ path: '/products' }]",
  'scrollBehavior(_to, _from, savedPosition)',
  'savedPosition ?? { left: 0, top: 0 }',
  'satisfies RouterOptions',
  'router.destroy()',
]) if (!routerOptionsExample.includes(required)) throw new Error(`RouterOptions API example is missing: ${required}`);

const buttonPropsExample = await readFile(resolve(
  root,
  '.tmp/docs-api/packages/atoms/src/interfaces/ButtonProps.md',
), 'utf8');
for (const required of ['disabled: true', "label: 'example'", 'onClick: (event)']) {
  if (!buttonPropsExample.includes(required)) throw new Error(`ButtonProps API example is missing: ${required}`);
}

const defineStoreExample = await readFile(resolve(
  root,
  '.tmp/docs-api/packages/store/src/functions/defineStore.md',
), 'utf8');
for (const required of ["id: 'counter'", 'state: () => ({ count: 0 })', 'store.$patch', 'manager.dispose()']) {
  if (!defineStoreExample.includes(required)) throw new Error(`defineStore API example is missing: ${required}`);
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

const vueCodemodDecision = await readFile(resolve(
  siteRoot,
  'content',
  versions.latest,
  'migration/vue-codemod-decision/index.md',
), 'utf8');
for (const required of [
  'no-go',
  '17 fixture files',
  '52 inventory',
  '0/14',
  'Static component registration',
  'Native Custom Element transport',
  'Router and Store',
  'SSR and hydration',
  'False positives',
  'new accepted RFC',
]) if (!vueCodemodDecision.includes(required)) throw new Error(`Vue codemod decision is missing: ${required}`);

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
