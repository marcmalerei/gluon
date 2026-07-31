import { execFile as execFileCallback, execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { availableParallelism, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const concurrency = fixtureConcurrency();
const startedAt = performance.now();
const temporaryRoot = await mkdtemp(join(tmpdir(), 'create-gluon-matrix-'));
const artifactDirectory = join(temporaryRoot, 'artifacts');
const fixtureDirectory = join(temporaryRoot, 'fixtures');

const packageSources = new Map([
  ['@gluonjs/reactivity', 'packages/reactivity'],
  ['@gluonjs/compiler', 'packages/compiler'],
  ['@gluonjs/core', '.'],
  ['@gluonjs/router', 'packages/router'],
  ['@gluonjs/store', 'packages/store'],
  ['@gluonjs/ssr', 'packages/ssr'],
  ['@gluonjs/vite', 'packages/vite'],
  ['@gluonjs/test-utils', 'packages/test-utils'],
  ['@gluonjs/devtools-api', 'packages/devtools-api'],
  ['@gluonjs/devtools', 'packages/devtools'],
  ['@gluonjs/language-server', 'packages/language-server'],
  ['@gluonjs/quarks', 'packages/quarks'],
  ['@gluonjs/atoms', 'packages/atoms'],
  ['@gluonjs/molecules', 'packages/molecules'],
  ['@gluonjs/organisms', 'packages/organisms'],
]);

try {
  await mkdir(artifactDirectory, { recursive: true });
  const archives = packWorkspacePackages();
  const { addComponent, scaffoldProject } = await import(
    pathToFileURL(resolve(root, 'packages/create-gluon/dist/index.js')).href
  );
  const matrix = supportedMatrix();
  const componentsOnly = process.argv.includes('--components-only');
  const fixtures = [];
  for (const [index, features] of (componentsOnly ? [] : matrix).entries()) {
    const name = matrixName(index, features);
    const result = await scaffoldProject({ directory: name, cwd: fixtureDirectory, ...features });
    await pointOfficialDependenciesAtArchives(result.directory, archives, features);
    fixtures.push({
      directory: result.directory,
      testing: features.testing,
      commands: [
        ['npm', ['run', 'typecheck']],
        ['npm', ['run', 'check:templates']],
        ['npm', ['test']],
        ['npm', ['run', 'build']],
      ],
      success: `validated starter ${index + 1}/${matrix.length}: ${name}`,
    });
  }
  const componentKinds = [
    ['atom', 'PrimitiveAction'],
    ['molecule', 'DeliveryPanel'],
    ['organism', 'CheckoutRegion'],
    ['element', 'AccountControl'],
    ['headless', 'DialogFocus'],
  ];
  for (const [index, [kind, name]] of componentKinds.entries()) {
    const directory = `component-${kind}`;
    const result = await scaffoldProject({
      directory,
      cwd: fixtureDirectory,
      ssr: true,
      testing: true,
      ui: true,
    });
    await addComponent({
      root: result.directory,
      kind,
      name,
      ...(kind === 'element' ? { tagName: 'app-account-control' } : {}),
    });
    await pointOfficialDependenciesAtArchives(result.directory, archives, result.features);
    fixtures.push({
      directory: result.directory,
      testing: true,
      commands: [
        ['npm', ['run', 'typecheck']],
        ['npm', ['run', 'check:templates']],
        ['npm', ['run', 'test:components']],
        ['npm', ['run', 'build']],
        ['npm', ['pack', '--dry-run', '--json', '--ignore-scripts']],
      ],
      success: `validated component ${index + 1}/${componentKinds.length}: ${kind}`,
    });
  }
  const retainedDirectory = join(fixtureDirectory, 'retained-dx-scorecard');
  await cp(resolve(root, 'benchmarks/dx/fixtures/gluon'), retainedDirectory, { recursive: true });
  await pointOfficialDependenciesAtArchives(retainedDirectory, archives, {
    router: true, store: true, testing: true, ui: true, ssr: true,
  });
  fixtures.push({
    directory: retainedDirectory,
    testing: true,
    commands: [
      ['npm', ['run', 'typecheck']],
      ['npm', ['run', 'check:templates']],
      ['npm', ['test']],
      ['npm', ['run', 'build']],
    ],
    success: 'validated retained DX scorecard fixture',
  });

  const installStartedAt = performance.now();
  await mapWithConcurrency(fixtures, concurrency, ({ directory }) => run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'],
    directory,
  ));
  process.stdout.write(`installed ${fixtures.length} isolated fixtures in ${formatDuration(installStartedAt)}\n`);
  await installFixtureChromium(fixtures.filter(({ testing }) => testing));

  const validationStartedAt = performance.now();
  await mapWithConcurrency(fixtures, concurrency, async ({ commands, directory, success }) => {
    for (const [command, arguments_] of commands) await run(command, arguments_, directory);
    process.stdout.write(`${success}\n`);
    await rm(directory, { recursive: true, force: true });
  });
  process.stdout.write(`validated ${fixtures.length} fixtures in ${formatDuration(validationStartedAt)}\n`);
  process.stdout.write(`create-gluon fixture matrix valid: ${componentsOnly ? 0 : matrix.length} applications, ${componentKinds.length} component kinds, and 1 retained DX fixture with concurrency ${concurrency} in ${formatDuration(startedAt)}\n`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

function packWorkspacePackages() {
  const archives = new Map();
  for (const [name, directory] of packageSources) {
    const output = execFileSync(
      'npm',
      ['pack', resolve(root, directory), '--pack-destination', artifactDirectory, '--json', '--ignore-scripts'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const result = JSON.parse(output)[0];
    archives.set(name, join(artifactDirectory, basename(result.filename)));
  }
  return archives;
}

function supportedMatrix() {
  const matrix = [];
  for (let bits = 0; bits < 16; bits += 1) {
    matrix.push({
      router: Boolean(bits & 1),
      store: Boolean(bits & 2),
      testing: Boolean(bits & 4),
      ui: Boolean(bits & 8),
      ssr: false,
    });
  }
  for (let bits = 0; bits < 4; bits += 1) {
    matrix.push({
      router: true,
      store: true,
      testing: Boolean(bits & 1),
      ui: Boolean(bits & 2),
      ssr: true,
    });
  }
  return matrix;
}

function matrixName(index, features) {
  const selected = Object.entries(features).filter(([, enabled]) => enabled).map(([name]) => name);
  return `${String(index + 1).padStart(2, '0')}-${selected.join('-') || 'minimal'}`;
}

async function pointOfficialDependenciesAtArchives(directory, archives, features) {
  const path = join(directory, 'package.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  const required = new Set(['@gluonjs/reactivity', '@gluonjs/compiler', '@gluonjs/core', '@gluonjs/language-server', '@gluonjs/vite']);
  if (features.router || features.ssr || features.testing) required.add('@gluonjs/router');
  if (features.store || features.ssr || features.testing) required.add('@gluonjs/store');
  if (features.ssr) required.add('@gluonjs/ssr');
  if (features.testing) required.add('@gluonjs/test-utils');
  if (features.ui) {
    required.add('@gluonjs/quarks');
    required.add('@gluonjs/atoms');
  }
  for (const name of [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]) {
    if (name.startsWith('@gluonjs/')) required.add(name);
  }
  if (required.has('@gluonjs/devtools')) required.add('@gluonjs/devtools-api');

  for (const name of required) {
    const archive = archives.get(name);
    if (!archive) throw new Error(`Missing packed archive for ${name}.`);
    if (name in manifest.dependencies) manifest.dependencies[name] = `file:${archive}`;
    else manifest.devDependencies[name] = `file:${archive}`;
  }
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function run(command, arguments_, cwd) {
  try {
    await execFile(command, arguments_, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const stdout = error?.stdout?.toString() ?? '';
    const stderr = error?.stderr?.toString() ?? '';
    throw new Error(`${command} ${arguments_.join(' ')} failed in ${cwd}\n${stdout}${stderr}`);
  }
}

async function installFixtureChromium(fixtures) {
  const representatives = new Map();
  for (const { directory } of fixtures) {
    const manifest = JSON.parse(await readFile(join(directory, 'node_modules/playwright/package.json'), 'utf8'));
    const group = representatives.get(manifest.version) ?? { directory, fixtures: 0 };
    group.fixtures += 1;
    representatives.set(manifest.version, group);
  }
  for (const [version, { directory, fixtures: fixtureCount }] of representatives) {
    await run('npx', ['playwright', 'install', 'chromium'], directory);
    process.stdout.write(`provisioned Playwright ${version} Chromium for ${fixtureCount} testing fixtures\n`);
  }
}

async function mapWithConcurrency(values, limit, operation) {
  let nextIndex = 0;
  let failure;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (!failure) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      try {
        await operation(values[index], index);
      } catch (error) {
        failure ??= error;
      }
    }
  });
  await Promise.all(workers);
  if (failure) throw failure;
}

function fixtureConcurrency() {
  const argument = process.argv.find((value) => value.startsWith('--concurrency='));
  const fallback = Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2)));
  const value = argument?.slice('--concurrency='.length)
    ?? process.env.GLUON_FIXTURE_CONCURRENCY
    ?? fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new TypeError('Fixture concurrency must be a positive integer.');
  }
  return parsed;
}

function formatDuration(started) {
  return `${((performance.now() - started) / 1000).toFixed(2)}s`;
}
