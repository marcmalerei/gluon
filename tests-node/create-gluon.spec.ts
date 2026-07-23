import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, expect, test } from 'vitest';
import { transformGluonModule } from '@gluonjs/compiler';
import { analyzeGluonProject } from '@gluonjs/language-server';
import {
  AddComponentError,
  addComponent,
  addComponentHelpText,
  componentKindHelpText,
  ScaffoldError,
  helpText,
  normalizeFeatures,
  parseAddComponentArguments,
  parseCliArguments,
  planComponent,
  runCli,
  scaffoldProject,
} from '../packages/create-gluon/src/index.js';

describe('create-gluon arguments', () => {
  test('parses the documented non-interactive feature flags', () => {
    const parsed = parseCliArguments([
      'catalog', '--yes', '--name', '@team/catalog', '--router', '--store',
      '--testing', '--ui', '--ssr', '--force',
    ]);
    expect(parsed).toMatchObject({
      directory: 'catalog',
      name: '@team/catalog',
      yes: true,
      force: true,
      router: true,
      store: true,
      testing: true,
      ui: true,
      ssr: true,
    });
  });

  test('rejects conflicts and unknown arguments', () => {
    expect(() => parseCliArguments(['app', '--router', '--no-router'])).toThrow(ScaffoldError);
    expect(() => parseCliArguments(['app', '--ssr', '--no-store'])).toThrow(
      'INVALID_COMBINATION',
    );
    expect(() => parseCliArguments(['app', '--unknown'])).toThrow('CLI_ARGUMENT_UNKNOWN');
    expect(() => parseCliArguments(['app', '-x'])).toThrow('CLI_ARGUMENT_UNKNOWN');
    expect(() => parseCliArguments(['app', 'extra'])).toThrow('CLI_ARGUMENT_EXTRA');
    expect(() => parseCliArguments(['app', '--name'])).toThrow('CLI_ARGUMENT_MISSING');
    expect(() => parseCliArguments(['-h'])).not.toThrow();
    expect(parseCliArguments(['-v']).version).toBe(true);
    expect(parseCliArguments(['app', '-y']).yes).toBe(true);
  });

  test('normalizes SSR to its verified Router and Store requirements', () => {
    expect(normalizeFeatures({ ssr: true })).toEqual({
      router: true,
      store: true,
      testing: false,
      ui: false,
      ssr: true,
    });
  });
});

describe('create-gluon scaffolding', () => {
  test('writes the minimal public-boundary starter', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-minimal-'));
    const result = await scaffoldProject({ directory: 'starter', cwd });
    const manifest = JSON.parse(await readFile(join(result.directory, 'package.json'), 'utf8'));
    const app = await readFile(join(result.directory, 'src/app.ts'), 'utf8');
    const quantityControl = await readFile(join(result.directory, 'src/quantity-control.ts'), 'utf8');
    expect(result.features).toEqual({
      router: false,
      store: false,
      testing: false,
      ui: false,
      ssr: false,
    });
    expect(manifest.dependencies).toEqual({ '@gluonjs/core': '1.3.0' });
    expect(manifest.scripts).toMatchObject({ test: 'npm run typecheck', build: 'vite build' });
    expect(app).toContain("from '@gluonjs/core'");
    expect(app).not.toContain('/src/');
    expect(quantityControl).toContain('defineGluonElement');
    expect(quantityControl).toContain('formAssociated: true');
    expect(quantityControl).toContain("elementEvent<{ quantity: number }>({ cancelable: true })");
  });

  test('writes the universal testing and UI surfaces', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-universal-'));
    const result = await scaffoldProject({
      directory: 'starter',
      cwd,
      ssr: true,
      testing: true,
      ui: true,
    });
    const manifest = JSON.parse(await readFile(join(result.directory, 'package.json'), 'utf8'));
    const app = await readFile(join(result.directory, 'src/app.ts'), 'utf8');
    const main = await readFile(join(result.directory, 'src/main.ts'), 'utf8');
    const server = await readFile(join(result.directory, 'src/server.ts'), 'utf8');
    const styles = await readFile(join(result.directory, 'src/styles.ts'), 'utf8');
    const testSource = await readFile(join(result.directory, 'src/app.spec.ts'), 'utf8');
    const readme = await readFile(join(result.directory, 'README.md'), 'utf8');
    expect(result.features).toEqual({
      router: true,
      store: true,
      testing: true,
      ui: true,
      ssr: true,
    });
    expect(manifest.dependencies).toMatchObject({
      '@gluonjs/core': '1.3.0',
      '@gluonjs/atoms': '1.3.0',
      '@gluonjs/router': '1.3.0',
      '@gluonjs/reactivity': '1.3.0',
      '@gluonjs/store': '1.3.0',
      '@gluonjs/ssr': '1.3.0',
    });
    expect(app).toContain("from '@gluonjs/atoms'");
    expect(app).toContain('Button({');
    expect(app).toContain("variant: count % 2 === 0 ? 'primary' : 'secondary'");
    expect(app).toContain("'aria-label': 'Increment starter action count'");
    expect(app).toContain('data: { starterAction: true }');
    expect(app).not.toContain('atomStyles');
    expect(main).toContain("installUi(document, { theme: 'light', hydrate: true })");
    expect(main).toContain('styleSelection: starterHydrationStyleSelection');
    expect(main).toContain('appStyleOwner.dispose()');
    expect(styles).toContain('--starter-accent: #c8ff00');
    expect(styles).toContain('--gluon-button-background: var(--starter-accent)');
    expect(styles).not.toMatch(/\bbutton\s*\{/);
    expect(testSource).toContain('getComputedStyle(button).minBlockSize');
    expect(testSource).toContain('recovered: false');
    expect(readme).toContain('exact stylesheet dependencies automatically');
    expect(readme).toContain('do not adopt the deprecated aggregate Atom sheet');
    expect(server).toContain("from '@gluonjs/ssr'");
    expect(server).toContain("styles: createStarterStyleSelection('light')");
    expect(result.files).toContain('vitest.config.ts');
  });

  test('protects non-empty targets and invalid package names', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-errors-'));
    const target = join(cwd, 'existing');
    await scaffoldProject({ directory: target });
    await expect(scaffoldProject({ directory: target })).rejects.toMatchObject({
      code: 'DIRECTORY_NOT_EMPTY',
    });
    await expect(scaffoldProject({ directory: 'valid', name: 'Invalid Name', cwd })).rejects
      .toMatchObject({ code: 'INVALID_PROJECT_NAME' });
    await expect(scaffoldProject({ directory: '', cwd })).rejects
      .toMatchObject({ code: 'INVALID_DIRECTORY' });
    await expect(scaffoldProject({ directory: 'bad\0path', cwd })).rejects
      .toMatchObject({ code: 'INVALID_DIRECTORY' });
  });

  test('supports force for maintained file refreshes', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-force-'));
    const result = await scaffoldProject({ directory: 'starter', cwd });
    await writeFile(join(result.directory, 'src/app.ts'), 'old');
    await scaffoldProject({ directory: 'starter', cwd, force: true, router: true });
    expect(await readFile(join(result.directory, 'src/app.ts'), 'utf8')).toContain('RouterView');
  });
});

test('runCli exposes help and stable --yes behavior', async () => {
  const output = new PassThrough();
  let written = '';
  output.on('data', (chunk) => { written += chunk.toString(); });
  await runCli(['--help'], { output });
  expect(written).toBe(helpText);

  written = '';
  await runCli(['--version'], { output });
  expect(written).toBe('1.3.0\n');

  written = '';
  const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-cli-'));
  const result = await runCli(['app', '--yes', '--router'], { cwd, output });
  expect(result?.features.router).toBe(true);
  expect(written).toContain('Next: npm install && npm run dev');

  const universal = await runCli(['universal', '--yes', '--ssr'], { cwd, output });
  expect(universal?.features).toMatchObject({ router: true, store: true, ssr: true });

  await expect(runCli(['--yes'], { cwd, output })).rejects.toThrow('CLI_ARGUMENT_MISSING');
});

test('runCli collects interactive feature choices', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-interactive-'));
  const output = new PassThrough();
  const answers = ['interactive-app', '', 'y', 'n', 'y', 'n'];
  const result = await runCli([], {
    cwd,
    output,
    prompt: { question: async () => answers.shift() ?? '', close() {} },
  });
  expect(result?.features).toEqual({
    router: true,
    store: true,
    testing: false,
    ui: true,
    ssr: false,
  });
});

test('runCli rejects empty and invalid interactive answers', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-interactive-errors-'));
  await expect(runCli([], {
    cwd,
    output: new PassThrough(),
    prompt: { question: async () => '', close() {} },
  })).rejects
    .toMatchObject({ code: 'INVALID_DIRECTORY' });

  const answers = ['app', 'maybe'];
  await expect(runCli([], {
    cwd,
    output: new PassThrough(),
    prompt: { question: async () => answers.shift() ?? '', close() {} },
  })).rejects
    .toThrow('CLI_ANSWER_INVALID');
});

describe('create-gluon add-component arguments', () => {
  test('parses the stable non-interactive component flags', () => {
    expect(parseAddComponentArguments([
      'PurchaseAction', '--kind', 'molecule', '--root', 'app', '--path', 'src/ui',
      '--tag', 'app-purchase', '--dry-run', '--overwrite', '--confirm-overwrite', '--yes',
    ])).toEqual({
      kind: 'molecule',
      name: 'PurchaseAction',
      root: 'app',
      path: 'src/ui',
      tagName: 'app-purchase',
      yes: true,
      dryRun: true,
      overwrite: true,
      confirmOverwrite: true,
      help: false,
    });
  });

  test('rejects unsupported kinds, missing values, and incomplete overwrite intent', () => {
    expect(() => parseAddComponentArguments(['Thing', '--kind', 'page'])).toThrow('INVALID_COMPONENT_KIND');
    expect(() => parseAddComponentArguments(['Thing', '--kind'])).toThrow('CLI_ARGUMENT_MISSING');
    expect(() => parseAddComponentArguments(['Thing', '--unknown'])).toThrow('CLI_ARGUMENT_UNKNOWN');
    expect(() => parseAddComponentArguments(['One', 'Two'])).toThrow('CLI_ARGUMENT_EXTRA');
    expect(() => parseAddComponentArguments(['Thing', '--confirm-overwrite'])).toThrow('OVERWRITE_NOT_CONFIRMED');
  });
});

describe('create-gluon add-component planning and writes', () => {
  test('prints a complete dry-run plan without mutating the project', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-dry-'));
    const project = await scaffoldProject({ directory: 'app', cwd });
    const originalManifest = await readFile(join(project.directory, 'package.json'), 'utf8');
    const result = await planComponent({
      root: project.directory,
      kind: 'atom',
      name: 'PurchaseAction',
      dryRun: true,
    });
    expect(result.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'package.json', action: 'update' }),
      expect.objectContaining({ path: 'src/components/index.ts', action: 'create' }),
      expect.objectContaining({ path: 'src/components/purchase-action.ts', action: 'create' }),
      expect.objectContaining({ path: 'src/components/purchase-action.spec.ts', action: 'create' }),
      expect.objectContaining({ path: 'vitest.config.ts', action: 'create' }),
    ]));
    await expect(readFile(join(project.directory, 'src/components/purchase-action.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(join(project.directory, 'package.json'), 'utf8')).toBe(originalManifest);
  });

  test('generates every supported kind with public imports, tests, and deterministic exports', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-kinds-'));
    const expectations = [
      ['atom', 'PrimitiveAction', "from '@gluonjs/atoms'", 'createStyleSheetSelection'],
      ['molecule', 'DeliveryPanel', "from '@gluonjs/molecules'", "from '@gluonjs/atoms'"],
      ['organism', 'CheckoutRegion', "from '@gluonjs/organisms'", "from '@gluonjs/molecules'"],
      ['element', 'AccountControl', 'defineGluonElement', 'context.onCleanup'],
      ['headless', 'ModalFocus', 'createFocusScope', 'caller owns markup'],
    ] as const;
    for (const [kind, name, sourceMarker, ownershipMarker] of expectations) {
      const project = await scaffoldProject({ directory: kind, cwd });
      const result = await addComponent({ root: project.directory, kind, name });
      const slug = result.operations.find(({ path }) => path.endsWith('.ts') && !path.endsWith('.spec.ts') && path !== 'src/components/index.ts')!.path.split('/').at(-1)!.replace('.ts', '');
      const source = await readFile(join(project.directory, `src/components/${slug}.ts`), 'utf8');
      const testSource = await readFile(join(project.directory, `src/components/${slug}.spec.ts`), 'utf8');
      const barrel = await readFile(join(project.directory, 'src/components/index.ts'), 'utf8');
      expect(source).toContain(sourceMarker);
      expect(source).toContain(ownershipMarker);
      expect(source).not.toContain('/src/');
      expect(testSource).toContain("from '@gluonjs/test-utils'");
      expect(barrel).toContain(`export * from './${slug}.js';`);
      const manifest = JSON.parse(await readFile(join(project.directory, 'package.json'), 'utf8'));
      expect(manifest.scripts['test:components']).toBe('vitest run src/components');
      expect(manifest.devDependencies).toMatchObject({
        '@gluonjs/test-utils': '1.3.0',
        '@vitest/browser-playwright': '^4.0.18',
        playwright: '^1.58.2',
        vitest: '^4.0.18',
      });
    }
    const elementUsage = await readFile(join(cwd, 'element/src/components/account-control.usage.html'), 'utf8');
    expect(elementUsage).toContain('<app-account-control label="Continue">');
    expect(elementUsage).toContain("addEventListener('activate'");
  });

  test('emits HMR-transformable and language-tooling-visible public component contracts', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-tooling-'));
    const project = await scaffoldProject({ directory: 'app', cwd });
    await addComponent({ root: project.directory, kind: 'atom', name: 'SaveAction' });
    await addComponent({
      root: project.directory,
      kind: 'element',
      name: 'AccountControl',
      tagName: 'app-account-control',
    });
    const atom = await readFile(join(project.directory, 'src/components/save-action.ts'), 'utf8');
    const element = await readFile(join(project.directory, 'src/components/account-control.ts'), 'utf8');
    const atomTransform = transformGluonModule(atom, '/app/save-action.ts', { development: true });
    const elementTransform = transformGluonModule(element, '/app/account-control.ts', { development: true });
    expect(atomTransform.diagnostics).toEqual([]);
    expect(atomTransform.code).toContain('__gluonHmrComponent');
    expect(atomTransform.code).toContain('__gluonHmrStyle');
    expect(elementTransform.diagnostics).toEqual([]);
    expect(elementTransform.code).toContain('__gluonHmrFunctionalElement');
    const analyses = analyzeGluonProject([
      { uri: '/app/save-action.ts', text: atom },
      { uri: '/app/account-control.ts', text: element },
    ]);
    expect(analyses.flatMap(({ diagnostics }) => diagnostics)).toEqual([]);
    expect(analyses.flatMap(({ declarations }) => declarations)).toContainEqual(expect.objectContaining({
      tagName: 'app-account-control',
      props: ['label', 'disabled', 'metadata'],
      events: ['activate'],
      slots: ['default', 'help'],
    }));
  });

  test('sorts only its marked barrel region and preserves application-owned exports', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-barrel-'));
    const project = await scaffoldProject({ directory: 'app', cwd });
    await mkdir(join(project.directory, 'src/components'), { recursive: true });
    await writeFile(join(project.directory, 'src/components/index.ts'), "export { Existing } from './existing.js';\n");
    await addComponent({ root: project.directory, kind: 'atom', name: 'ZuluAction' });
    await addComponent({ root: project.directory, kind: 'headless', name: 'AlphaFocus' });
    const barrel = await readFile(join(project.directory, 'src/components/index.ts'), 'utf8');
    expect(barrel.startsWith("export { Existing } from './existing.js';")).toBe(true);
    expect(barrel.indexOf("./alpha-focus.js")).toBeLessThan(barrel.indexOf("./zulu-action.js"));
    expect(barrel.match(/create-gluon:add-component:exports/g)).toHaveLength(2);
  });

  test('requires separate overwrite intent and confirmation for generated collisions', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-overwrite-'));
    const project = await scaffoldProject({ directory: 'app', cwd });
    await addComponent({ root: project.directory, kind: 'atom', name: 'SaveAction' });
    const target = join(project.directory, 'src/components/save-action.ts');
    await writeFile(target, 'application-owned content\n');
    await expect(addComponent({ root: project.directory, kind: 'atom', name: 'SaveAction' }))
      .rejects.toMatchObject({ code: 'FILE_COLLISION' });
    await expect(addComponent({ root: project.directory, kind: 'atom', name: 'SaveAction', overwrite: true }))
      .rejects.toMatchObject({ code: 'OVERWRITE_NOT_CONFIRMED' });
    await addComponent({
      root: project.directory,
      kind: 'atom',
      name: 'SaveAction',
      overwrite: true,
      confirmOverwrite: true,
    });
    expect(await readFile(target, 'utf8')).toContain('defineAtom');
  });

  test('rejects names, traversal, absolute paths, invalid tags, and symlink escapes before writes', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-safety-'));
    const project = await scaffoldProject({ directory: 'app', cwd });
    const invalid = [
      () => addComponent({ root: project.directory, kind: 'atom', name: 'bad-name' }),
      () => addComponent({ root: project.directory, kind: 'atom', name: 'ValidName', path: '../outside' }),
      () => addComponent({ root: project.directory, kind: 'atom', name: 'ValidName', path: join(cwd, 'absolute') }),
      () => addComponent({ root: project.directory, kind: 'element', name: 'ValidName', tagName: 'Invalid' }),
    ];
    for (const rejectInvalidInput of invalid) {
      await expect(rejectInvalidInput()).rejects.toBeInstanceOf(AddComponentError);
    }
    const outside = join(cwd, 'outside');
    await mkdir(outside);
    await symlink(outside, join(project.directory, 'src/components'));
    await expect(addComponent({ root: project.directory, kind: 'atom', name: 'SafeAction' }))
      .rejects.toMatchObject({ code: 'SYMLINK_ESCAPE' });
    await expect(readFile(join(outside, 'safe-action.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('owns reserved custom-element tag rejection before it can escape the assertion', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-reserved-tag-'));
    const project = await scaffoldProject({ directory: 'app', cwd });

    await expect(addComponent({
      root: project.directory,
      kind: 'element',
      name: 'ValidName',
      tagName: 'annotation-xml',
    })).rejects.toMatchObject({
      code: 'INVALID_CUSTOM_ELEMENT_NAME',
      message: 'INVALID_CUSTOM_ELEMENT_NAME: "annotation-xml" is not a valid autonomous Custom Element name.',
    });
    await expect(readFile(join(project.directory, 'src/components/valid-name.ts')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('fails invalid manifests before creating component paths', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-invalid-'));
    const project = await scaffoldProject({ directory: 'app', cwd });
    await writeFile(join(project.directory, 'package.json'), '{invalid');
    await expect(addComponent({ root: project.directory, kind: 'atom', name: 'SafeAction' }))
      .rejects.toMatchObject({ code: 'INVALID_PROJECT_MANIFEST' });
    await expect(readFile(join(project.directory, 'src/components/safe-action.ts'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

test('runCli documents and executes interactive and dry-run add-component flows', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'create-gluon-component-cli-'));
  const project = await scaffoldProject({ directory: 'app', cwd });
  const output = new PassThrough();
  let written = '';
  output.on('data', (chunk) => { written += chunk.toString(); });
  await runCli(['add-component', '--help'], { output });
  expect(written).toContain(addComponentHelpText);
  expect(written).toContain(componentKindHelpText);

  written = '';
  const dryRun = await runCli([
    'add-component', 'OrderPanel', '--kind', 'molecule', '--root', project.directory, '--dry-run', '--yes',
  ], { output });
  expect(dryRun).toMatchObject({ kind: 'molecule', name: 'OrderPanel', dryRun: true });
  expect(written).toContain('No files were written.');

  written = '';
  const answers = ['headless', 'DialogFocus'];
  const interactive = await runCli(['add-component', '--root', project.directory], {
    output,
    prompt: { question: async () => answers.shift() ?? '', close() {} },
  });
  expect(interactive).toMatchObject({ kind: 'headless', name: 'DialogFocus' });
  expect(written).toContain('behavior-only wrapper');
});
