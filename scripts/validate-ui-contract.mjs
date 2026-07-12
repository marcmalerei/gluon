import { access, readFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, '.tmp/core-without-ui');
const ownerOutput = resolve(root, '.tmp/ui-owner-only');
const expected = new Map([
  ['@gluonjs/quarks', ['q/quark/fragment', 'createFocusScope', 'Overlay', 'Dialog', 'Popover', 'Listbox', 'Field']],
  ['@gluonjs/atoms', ['Button', 'Icon', 'Input', 'Label', 'installUi']],
  ['@gluonjs/molecules', ['Card', 'FormField']],
  ['@gluonjs/organisms', ['AppShell']],
]);
const manifestExports = new Map([
  ['@gluonjs/quarks', 'quarkManifest'],
  ['@gluonjs/atoms', 'atomManifest'],
  ['@gluonjs/molecules', 'moleculeManifest'],
  ['@gluonjs/organisms', 'organismManifest'],
]);

for (const [packageName, names] of expected) {
  const directoryName = packageName.split('/')[1];
  const manifestSource = await readFile(resolve(root, `packages/${directoryName}/src/manifest.ts`), 'utf8');
  const packageMatch = manifestSource.match(/package: '([^']+)'/);
  if (!manifestSource.includes('schemaVersion: 1') || packageMatch?.[1] !== packageName) {
    throw new Error(`${packageName} does not export its schemaVersion 1 manifest.`);
  }
  const actualNames = [...manifestSource.matchAll(/\{ name: '([^']+)'/g)].map((match) => match[1]);
  if (JSON.stringify(actualNames) !== JSON.stringify(names)) {
    throw new Error(`${packageName} manifest entries do not match the stable inventory.`);
  }
  if ((manifestSource.match(/extension: '/g) ?? []).length !== actualNames.length) {
    throw new Error(`${packageName} does not publish extension metadata for every stable entry.`);
  }
  const builtIndex = await readFile(resolve(root, `packages/${directoryName}/dist/index.js`), 'utf8');
  if (!builtIndex.includes(manifestExports.get(packageName))) {
    throw new Error(`${packageName} built entry does not export its stable manifest.`);
  }
  const readme = await readFile(resolve(root, `packages/${directoryName}/README.md`), 'utf8');
  const exampleSource = await readFile(resolve(root, 'docs-site/examples/ui-system.ts'), 'utf8');
  for (const name of actualNames) {
    if (
      !manifestSource.includes("status: 'stable'")
      || !manifestSource.includes('accessibility:')
      || !readme.toLowerCase().includes(name.split('/')[0].toLowerCase())
    ) {
      throw new Error(`${packageName} ${name} lacks stable accessibility documentation.`);
    }
    const exampleName = name === 'q/quark/fragment' ? 'q' : name;
    if (!exampleSource.includes(exampleName)) {
      throw new Error(`${packageName} ${name} is missing from the interactive UI example.`);
    }
  }
  await access(resolve(root, 'docs-site/examples/ui-system.ts'));
  await access(resolve(root, 'tests/ui-system.spec.ts'));
  await access(resolve(root, 'tests/ui-visual.spec.ts'));
}

await access(resolve(root, 'docs/ui-extensibility.md'));
const scorecardTasks = JSON.parse(await readFile(
  resolve(root, 'benchmarks/dx/specification-v1.json'),
  'utf8',
));
const themedControlsTask = scorecardTasks.tasks.find(({ id }) => id === 'T2-themed-controls');
if (!themedControlsTask?.observableOutcomes.some((outcome) => outcome.includes('branded purchase button'))
  || !themedControlsTask.observableOutcomes.some((outcome) => outcome.includes('custom icon'))) {
  throw new Error('Canonical DX task T2 does not retain the brand-variant and custom-icon outcomes.');
}

try {
  await build({
    configFile: false,
    logLevel: 'silent',
    resolve: { alias: { '@gluonjs/core': resolve(root, 'src/index.ts') } },
    build: {
      emptyOutDir: true,
      minify: false,
      outDir: output,
      rollupOptions: {
        input: resolve(root, 'tests-fixtures/core-without-ui/main.ts'),
        output: { entryFileNames: 'core-only.js' },
      },
    },
  });
  const files = await readdir(output);
  const source = (await Promise.all(files
    .filter((file) => file.endsWith('.js'))
    .map((file) => readFile(resolve(output, file), 'utf8')))).join('\n');
  for (const marker of ['gluon-button', 'gluon-card', 'gluon-app-shell', 'gluon-overlay']) {
    if (source.includes(marker)) throw new Error(`Core-only bundle contains UI marker ${marker}.`);
  }
} finally {
  await rm(output, { force: true, recursive: true });
}

try {
  await build({
    configFile: false,
    logLevel: 'silent',
    resolve: { alias: {
      '@gluonjs/core': resolve(root, 'src/index.ts'),
      '@gluonjs/quarks': resolve(root, 'packages/quarks/src/index.ts'),
      '@gluonjs/atoms': resolve(root, 'packages/atoms/src/index.ts'),
      '@gluonjs/reactivity': resolve(root, 'packages/reactivity/src/index.ts'),
    } },
    build: {
      emptyOutDir: true,
      minify: false,
      outDir: ownerOutput,
      rollupOptions: {
        input: resolve(root, 'tests-fixtures/ui-owner-only/main.ts'),
        output: { entryFileNames: 'ui-owner-only.js' },
      },
    },
  });
  const files = await readdir(ownerOutput);
  const source = (await Promise.all(files
    .filter((file) => file.endsWith('.js'))
    .map((file) => readFile(resolve(ownerOutput, file), 'utf8')))).join('\n');
  for (const marker of ['gluon-card', 'gluon-form-field', 'gluon-app-shell']) {
    if (source.includes(marker)) throw new Error(`UI-owner-only bundle contains unselected marker ${marker}.`);
  }
} finally {
  await rm(ownerOutput, { force: true, recursive: true });
}

console.log('UI contract valid: 4 optional packages, 15 typed extension entries, canonical DX T2 extensions, Core-only and UI-owner-only bundles exclude unselected UI markers');
