import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const coreManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const reactivityVersion = coreManifest.version;

if (coreManifest.dependencies?.['@gluonjs/reactivity']) {
  throw new Error('@gluonjs/core must not install a private @gluonjs/reactivity runtime dependency.');
}
if (coreManifest.peerDependencies?.['@gluonjs/reactivity'] !== reactivityVersion) {
  throw new Error('@gluonjs/core must require the exact lockstep @gluonjs/reactivity peer.');
}

const fixture = await mkdtemp(join(tmpdir(), 'gluon-reactivity-singleton-'));
try {
  const coreArchive = await pack(root, fixture);
  const reactivityArchive = await pack(resolve(root, 'packages/reactivity'), fixture);
  const consumer = join(fixture, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({
    name: 'gluon-reactivity-singleton-consumer',
    private: true,
    type: 'module',
    dependencies: {
      '@gluonjs/core': `file:${coreArchive}`,
      '@gluonjs/reactivity': `file:${reactivityArchive}`,
    },
  }, null, 2));
  await execFile('npm', [
    'install',
    '--ignore-scripts',
    '--package-lock=true',
    '--audit=false',
    '--fund=false',
  ], { cwd: consumer });

  const lockfile = JSON.parse(await readFile(join(consumer, 'package-lock.json'), 'utf8'));
  const nestedReactivity = 'node_modules/@gluonjs/core/node_modules/@gluonjs/reactivity';
  if (lockfile.packages[nestedReactivity]) {
    throw new Error(`Consumer install created a duplicate Reactivity runtime at ${nestedReactivity}.`);
  }
  const installedCore = lockfile.packages['node_modules/@gluonjs/core'];
  if (installedCore?.peerDependencies?.['@gluonjs/reactivity'] !== reactivityVersion) {
    throw new Error('Packed @gluonjs/core must retain its exact Reactivity peer dependency.');
  }

  const consumerReactivity = await resolveEsmReactivity(consumer);
  const coreReactivity = await resolveEsmReactivity(join(consumer, 'node_modules/@gluonjs/core'));
  if (consumerReactivity !== coreReactivity) {
    throw new Error(`Core resolves ${coreReactivity}; consumer resolves ${consumerReactivity}.`);
  }

  console.log(`validated one Reactivity runtime at ${consumerReactivity}`);
} finally {
  await rm(fixture, { recursive: true, force: true });
}

async function pack(directory, destination) {
  const { stdout } = await execFile('npm', [
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    destination,
  ], { cwd: directory });
  const [result] = JSON.parse(stdout);
  if (!result?.filename) throw new Error(`npm pack returned no archive for ${directory}.`);
  return resolve(destination, result.filename);
}

async function resolveEsmReactivity(directory) {
  const resolver = join(directory, '.gluon-reactivity-resolver.mjs');
  await writeFile(resolver, "console.log(import.meta.resolve('@gluonjs/reactivity'));\n");
  try {
    const { stdout } = await execFile(process.execPath, [resolver], { cwd: directory });
    return stdout.trim();
  } finally {
    await rm(resolver, { force: true });
  }
}
