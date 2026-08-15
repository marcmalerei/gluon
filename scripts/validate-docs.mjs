import { access, readFile, readdir } from 'node:fs/promises';
import { basename, dirname, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const siteRoot = resolve(root, 'docs-site');
const outputRoot = resolve(siteRoot, 'dist');
const versions = JSON.parse(await readFile(resolve(siteRoot, 'versions.json'), 'utf8'));
const packageContract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const packageDocs = JSON.parse(await readFile(resolve(siteRoot, 'package-docs.json'), 'utf8'));
const base = '/gluon/';
validatePackageDocs(packageDocs, packageContract);

if (!versions.supported.includes(versions.latest)) {
  throw new Error(`documentation latest ${versions.latest} is not a supported version`);
}

for (const version of versions.supported) {
  for (const page of [
    'index.html',
    'guides/index.html',
    'guides/getting-started/index.html',
    'guides/components/index.html',
    'guides/quality/index.html',
    'api/index.html',
    'cookbook/index.html',
    'migration/index.html',
    'migration/upgrade/index.html',
    'migration/vue-to-gluon-cutover/index.html',
    'migration/vue-analyzer/index.html',
    'migration/vue-codemod-decision/index.html',
    'examples/plain.html',
    'examples/ui.html',
    'examples/vue.html',
  ]) await access(resolve(outputRoot, version, page));
}
await access(resolve(outputRoot, 'archive/index.html'));
await access(resolve(outputRoot, 'latest/index.html'));
await access(resolve(outputRoot, versions.latest, 'packages/index.html'));
await access(resolve(outputRoot, 'latest', 'packages', 'index.html'));

const currentPackages = packageContract.packages.filter((entry) => entry.state === 'current');
const packageIndexHtml = await readFile(resolve(outputRoot, versions.latest, 'packages/index.html'), 'utf8');
if ((packageIndexHtml.match(/data-package-card/g) ?? []).length !== currentPackages.length) {
  throw new Error(`package portal lists ${(packageIndexHtml.match(/data-package-card/g) ?? []).length} packages; contract requires ${currentPackages.length}`);
}
if (!packageIndexHtml.includes('public entry points')) {
  throw new Error('package portal index must name the displayed metric as public entry points.');
}
if (!packageIndexHtml.includes(`href="/gluon/${versions.latest}/migration/upgrade/"`)) {
  throw new Error('package portal index must link to the versioned upgrade guide.');
}
for (const entry of currentPackages) {
  const packageSlug = entry.name === '@gluonjs/core' ? 'core' : entry.name.replace(/^@gluonjs\//, '');
  const packageHtml = await readFile(resolve(outputRoot, versions.latest, 'packages', packageSlug, 'index.html'), 'utf8');
  const packageJson = JSON.parse(await readFile(resolve(root, entry.directory, 'package.json'), 'utf8'));
  const docsEntry = packageDocs.packages.find((candidate) => candidate.name === entry.name);
  for (const required of [
    `<title>${entry.name} · Gluon ${versions.latest}</title>`,
    `<meta name="description" content="${escapeHtml(packageJson.description)}">`,
    'Install and start',
    'Purpose',
    'Use cases',
    'Public entry points',
    'Dependencies and peers',
    'Scope and limits',
    'Related guides',
    'Verified integration notes',
  ]) if (!packageHtml.includes(required)) throw new Error(`${entry.name} package portal is missing: ${required}`);
  if (!docsEntry) throw new Error(`package docs are missing for ${entry.name}`);
  if (!packageHtml.includes(escapeHtml(docsEntry.starter.code))) {
    throw new Error(`${entry.name} package portal does not render the documented starter code.`);
  }
  if (!packageHtml.includes(`>${escapeHtml(docsEntry.starter.language)}<`)) {
    throw new Error(`${entry.name} package portal does not render the documented starter language.`);
  }
  if (!packageHtml.includes(escapeHtml(docsEntry.purpose))) {
    throw new Error(`${entry.name} package portal does not render the documented purpose.`);
  }
  for (const item of docsEntry.useCases) {
    if (!packageHtml.includes(`<li>${escapeHtml(item)}</li>`)) {
      throw new Error(`${entry.name} package portal does not render use case ${item}.`);
    }
  }
  for (const item of docsEntry.limits) {
    if (!packageHtml.includes(`<li>${escapeHtml(item)}</li>`)) {
      throw new Error(`${entry.name} package portal does not render scope limit ${item}.`);
    }
  }
  for (const item of docsEntry.integrationNotes) {
    if (!packageHtml.includes(`<li>${escapeHtml(item)}</li>`)) {
      throw new Error(`${entry.name} package portal does not render integration note ${item}.`);
    }
  }
  for (const guide of docsEntry.relatedGuides) {
    if (!packageHtml.includes(`href="${guide.href}"`) || !packageHtml.includes(`>${escapeHtml(guide.label)}<`)) {
      throw new Error(`${entry.name} package portal does not render related guide ${guide.label} -> ${guide.href}.`);
    }
  }
}

for (const entry of currentPackages) {
  const packageJson = JSON.parse(await readFile(resolve(root, entry.directory, 'package.json'), 'utf8'));
  const sourceRoot = entry.directory === '.' ? 'src' : `${entry.directory}/src`;
  const html = await readFile(resolve(outputRoot, versions.latest, 'api/generated', sourceRoot, 'index.html'), 'utf8');
  if (!html.includes(`<title>${escapeHtml(entry.name)} · Gluon ${versions.latest}</title>`)) {
    throw new Error(`${entry.name} API landing page has no package-specific title`);
  }
  if (!html.includes(`<meta name="description" content="${escapeHtml(packageJson.description)}">`)) {
    throw new Error(`${entry.name} API landing page has no package-specific description`);
  }
  if (!html.includes(`>${escapeHtml(entry.name)}</a>`)) {
    throw new Error(`${entry.name} API landing page has no package-specific breadcrumb`);
  }
}
for (const entry of currentPackages) {
  const packageSlug = entry.name === '@gluonjs/core' ? 'core' : entry.name.replace(/^@gluonjs\//, '');
  const latestPackageHtml = await readFile(resolve(outputRoot, 'latest', 'packages', packageSlug, 'index.html'), 'utf8');
  if (!latestPackageHtml.includes(`<link rel="canonical" href="https://marcmalerei.github.io/gluon/${versions.latest}/packages/${packageSlug}/">`)) {
    throw new Error(`${entry.name} package portal latest alias does not preserve the versioned canonical URL`);
  }
}
for (const page of [
  ['latest', 'index.html'],
  ['latest', 'guides', 'components', 'index.html'],
  ['latest', 'api', 'index.html'],
  ['latest', 'migration', 'index.html'],
  ['latest', 'migration', 'vue-to-gluon-cutover', 'index.html'],
]) {
  const html = await readFile(resolve(outputRoot, ...page), 'utf8');
  if (!html.includes(`<link rel="canonical" href="https://marcmalerei.github.io/gluon/${versions.latest}/`)) {
    throw new Error(`latest alias page is missing versioned canonical metadata: ${page.join('/')}`);
  }
}
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

const componentGuide = await readFile(resolve(
  siteRoot,
  'content',
  versions.latest,
  'guides/components/index.md',
), 'utf8');
const upgradeGuide = await readFile(resolve(
  siteRoot,
  'content',
  versions.latest,
  'migration/upgrade/index.md',
), 'utf8');
const normalizedUpgradeGuide = upgradeGuide.replace(/\s+/g, ' ');
for (const required of [
  '# Gluon upgrade guide',
  'Supported release-to-release upgrades are the versioned lines recorded in the release archive and changelog.',
  'A deprecated API remains for at least the next stable minor',
  'Private repository imports and deep package internals are unsupported',
  'Node `^22.12.0 || ^24.0.0`',
  'Playwright Chromium, Firefox, and WebKit lanes',
  'constructable `CSSStyleSheet`, `replaceSync()`, and `adoptedStyleSheets`',
  'single-package app',
  'Workspace or root consumer',
  'Verification matrix',
]) if (!normalizedUpgradeGuide.includes(required)) throw new Error(`upgrade guide is missing: ${required}`);
for (const required of [
  'npm ci',
  'git diff -- package.json package-lock.json',
  'npm run typecheck',
  'npm run build',
  'npm test',
  'npm ls --depth=0 @gluonjs/core',
  'npm install --save-exact @gluonjs/core@1.9.0',
  'npm install --workspace ./apps/storefront --save-exact',
  'npm pkg get workspaces',
  'git restore package.json package-lock.json',
]) if (!upgradeGuide.includes(required)) throw new Error(`upgrade guide commands are missing: ${required}`);
for (const required of [
  '/gluon/1.9.0/reference/diagnostics/',
  'https://www.npmjs.com/org/gluonjs',
]) if (!upgradeGuide.includes(required)) throw new Error(`upgrade guide link is missing: ${required}`);
for (const required of [
  'SSR and hydration',
  'Router deep links and back/forward',
  'Store persistence',
  'Usage-driven component styles',
  'Language server and editor tooling',
]) if (!upgradeGuide.includes(required)) throw new Error(`upgrade guide verification matrix is missing: ${required}`);
for (const required of [
  'The four terms to know',
  'Choose an authoring model',
  'Declare properties',
  'Declare and emit events',
  'Complete compiled example',
  'Lifecycle and ownership',
  'Public class map',
  'property binding',
  'preventDefault()',
  'updateComplete',
]) if (!componentGuide.includes(required)) throw new Error(`component authoring guide is missing: ${required}`);

const publicClassFiles = apiSymbolFiles.filter((file) => file.includes('/classes/'));
for (const classFile of publicClassFiles) {
  const className = basename(classFile, '.md');
  if (!componentGuide.includes(`\`${className}\``)) {
    throw new Error(`component authoring class map is missing public class ${className}`);
  }
}

const componentExample = await readFile(resolve(siteRoot, 'examples/component-authoring.ts'), 'utf8');
for (const required of [
  'satisfies PropertyDeclarations<ProductCardProperties>',
  'satisfies EventDeclarations<ProductCardEvents>',
  'attribute: false',
  'reflect: true',
  "this.emit('add-to-bag'",
  '.product=${product}',
  '@add-to-bag=${event(onAddToBag, { once: true })}',
  'addEvent.preventDefault()',
]) if (!componentExample.includes(required)) throw new Error(`compiled component authoring example is missing: ${required}`);

const gluonElementReference = await readFile(resolve(
  root,
  '.tmp/docs-api/src/classes/GluonElement.md',
), 'utf8');
for (const required of [
  'Base class for a stateful Gluon Custom Element',
  'Declares reactive inputs',
  'Declares native output events',
  'Resolves after the currently scheduled render',
  'Dispatches a typed native `CustomEvent`',
  'Runs a callback once after the first render',
]) if (!gluonElementReference.includes(required)) throw new Error(`GluonElement reference is missing: ${required}`);
for (const inheritedPlatformMember of ['### accessKey', '### ariaLabel', '### onclick']) {
  if (gluonElementReference.includes(inheritedPlatformMember)) {
    throw new Error(`GluonElement reference includes inherited platform member: ${inheritedPlatformMember}`);
  }
}

const propertyDeclarationReference = await readFile(resolve(
  root,
  '.tmp/docs-api/src/interfaces/PropertyDeclaration.md',
), 'utf8');
for (const required of [
  'built-in String, Number, Boolean, Object, or Array',
  'disables attribute transport',
  'accepted property writes back',
  'per-instance objects and arrays',
  'whether a write schedules an update',
  'when no value or default was provided',
]) if (!propertyDeclarationReference.includes(required)) throw new Error(`PropertyDeclaration reference is missing: ${required}`);

const eventDeclarationReference = await readFile(resolve(
  root,
  '.tmp/docs-api/src/interfaces/EventDeclaration.md',
), 'utf8');
for (const required of [
  'travels through ancestor elements',
  'crosses a Shadow DOM boundary',
  'cancel the event with `preventDefault()`',
  'diagnostic message for invalid detail',
]) if (!eventDeclarationReference.includes(required)) throw new Error(`EventDeclaration reference is missing: ${required}`);
if (apiExampleManifest.symbolPages !== apiSymbolFiles.length
  || apiExampleManifest.entries.length !== apiSymbolFiles.length) {
  throw new Error(`API examples cover ${apiExampleManifest.entries.length} pages; generated API has ${apiSymbolFiles.length} symbol pages`);
}
if (apiExampleManifest.dependencyExamples !== 0) {
  throw new Error(`API reference still contains ${apiExampleManifest.dependencyExamples} generic runtime-owner consumer examples`);
}
if (apiExampleManifest.curatedExamples !== apiExampleManifest.symbolPages) {
  throw new Error(`API reference has ${apiExampleManifest.curatedExamples} reviewed examples for ${apiExampleManifest.symbolPages} symbol pages`);
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
  for (const genericCopy of [
    'with representative values',
    'when the application already owns its required runtime dependencies',
    'without recreating framework-owned runtime state',
  ]) if (markdown.includes(genericCopy)) throw new Error(`Generated API example contains generic purpose copy: ${entry.path}`);
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
for (const required of ["label: 'Add to bag'", "variant: ButtonVariant = 'primary'", "size: ButtonSize = 'large'", 'onClick: (event: MouseEvent)', 'Button(button)']) {
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
const invalidExternalLinks = [];
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:)/.test(href)) {
      const external = href.startsWith('http') ? new URL(href) : undefined;
      if (external?.hostname === 'github.com'
        && external.pathname.startsWith('/marcmalerei/gluon/blob/')
        && external.pathname.endsWith('.html')) {
        invalidExternalLinks.push(`${slash(relative(outputRoot, file))} -> ${href}`);
      }
      continue;
    }
    if (href.startsWith('#')) continue;
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
if (invalidExternalLinks.length > 0) {
  throw new Error(`documentation rewrote curated GitHub links to generated HTML:\n- ${invalidExternalLinks.join('\n- ')}`);
}

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
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

function validatePackageDocs(packageDocs, packageContract) {
  if (!packageDocs || packageDocs.version !== 1 || !Array.isArray(packageDocs.packages)) {
    throw new Error('docs-site/package-docs.json must contain version 1 and a packages array.');
  }
  const currentPackages = packageContract.packages.filter((entry) => entry.state === 'current');
  if (packageDocs.packages.length !== currentPackages.length) {
    throw new Error(`docs-site/package-docs.json must describe ${currentPackages.length} current packages.`);
  }
  const names = new Set();
  for (const entry of packageDocs.packages) {
    if (names.has(entry.name)) throw new Error(`docs-site/package-docs.json contains duplicate package metadata for ${entry.name}.`);
    names.add(entry.name);
    if (!currentPackages.some((pkg) => pkg.name === entry.name)) {
      throw new Error(`docs-site/package-docs.json contains unknown package ${entry.name}.`);
    }
    for (const field of ['name', 'purpose', 'starter', 'useCases', 'limits', 'relatedGuides', 'integrationNotes']) {
      if (!(field in entry)) throw new Error(`docs-site/package-docs.json is missing ${field} for ${entry.name}.`);
    }
    if (!isTrimmedNonEmptyString(entry.purpose)) {
      throw new Error(`docs-site/package-docs.json purpose must be a non-empty trimmed string for ${entry.name}.`);
    }
    if (!isTrimmedNonEmptyString(entry.starter?.language) || !isTrimmedNonEmptyString(entry.starter?.code)) {
      throw new Error(`docs-site/package-docs.json starter metadata must include non-empty trimmed language and code for ${entry.name}.`);
    }
    for (const listName of ['useCases', 'limits', 'integrationNotes']) {
      if (!Array.isArray(entry[listName]) || entry[listName].length === 0 || entry[listName].some((value) => !isTrimmedNonEmptyString(value))) {
        throw new Error(`docs-site/package-docs.json ${listName} must be a non-empty array of non-empty trimmed strings for ${entry.name}.`);
      }
    }
    if (!Array.isArray(entry.relatedGuides) || entry.relatedGuides.length === 0) {
      throw new Error(`docs-site/package-docs.json relatedGuides must be a non-empty list of {label, href} objects for ${entry.name}.`);
    }
    const relatedLabels = new Set();
    const relatedHrefs = new Set();
    for (const guide of entry.relatedGuides) {
      if (!isTrimmedNonEmptyString(guide?.label) || !isTrimmedNonEmptyString(guide?.href)) {
        throw new Error(`docs-site/package-docs.json relatedGuides entries must include trimmed label and href strings for ${entry.name}.`);
      }
      if (!isSupportedGuideHref(guide.href)) {
        throw new Error(`docs-site/package-docs.json relatedGuides href must use a versioned Gluon docs path for ${entry.name}: ${guide.href}`);
      }
      if (relatedLabels.has(guide.label)) {
        throw new Error(`docs-site/package-docs.json relatedGuides contains duplicate label ${guide.label} for ${entry.name}.`);
      }
      if (relatedHrefs.has(guide.href)) {
        throw new Error(`docs-site/package-docs.json relatedGuides contains duplicate href ${guide.href} for ${entry.name}.`);
      }
      relatedLabels.add(guide.label);
      relatedHrefs.add(guide.href);
    }
  }
}

function isTrimmedNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0 && value === value.trim();
}

function isSupportedGuideHref(href) {
  return /^\/gluon\/(?:latest|\d+\.\d+\.\d+)\/(?:api|cookbook|guides|migration|reference|examples)(?:\/[A-Za-z0-9._~!$&'()*+,;=:@/-]*)?\/?$/.test(href)
    || /^\/gluon\/(?:latest|\d+\.\d+\.\d+)\/(?:api|cookbook|guides|migration|reference|examples)\/(?:[A-Za-z0-9._~!$&'()*+,;=:@/-]+\/)?(?:index\.html|index\.md)?$/.test(href);
}
