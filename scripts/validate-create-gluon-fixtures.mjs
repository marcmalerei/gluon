import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
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
  for (const [index, features] of (componentsOnly ? [] : matrix).entries()) {
    const name = matrixName(index, features);
    const result = await scaffoldProject({ directory: name, cwd: fixtureDirectory, ...features });
    await pointOfficialDependenciesAtArchives(result.directory, archives, features);
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], result.directory);
    run('npm', ['run', 'typecheck'], result.directory);
    run('npm', ['run', 'check:templates'], result.directory);
    run('npm', ['test'], result.directory);
    run('npm', ['run', 'build'], result.directory);
    process.stdout.write(`validated starter ${index + 1}/${matrix.length}: ${name}\n`);
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
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], result.directory);
    run('npm', ['run', 'typecheck'], result.directory);
    run('npm', ['run', 'check:templates'], result.directory);
    run('npm', ['run', 'test:components'], result.directory);
    run('npm', ['run', 'build'], result.directory);
    run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], result.directory);
    process.stdout.write(`validated component ${index + 1}/${componentKinds.length}: ${kind}\n`);
  }
  process.stdout.write(`create-gluon fixture matrix valid: ${componentsOnly ? 0 : matrix.length} applications and ${componentKinds.length} component kinds\n`);
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

function run(command, arguments_, cwd) {
  try {
    execFileSync(command, arguments_, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1' },
    });
  } catch (error) {
    const stdout = error?.stdout?.toString() ?? '';
    const stderr = error?.stderr?.toString() ?? '';
    throw new Error(`${command} ${arguments_.join(' ')} failed in ${cwd}\n${stdout}${stderr}`);
  }
}
