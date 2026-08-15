import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import process from 'node:process';
import { resolveVscodeReleaseOptions } from './vscode-release-options.mjs';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const extension = resolve(root, 'editors/vscode');
const server = resolve(root, 'packages/language-server');
const rootManifest = await readJson(resolve(root, 'package.json'));
const extensionManifest = await readJson(resolve(extension, 'package.json'));
const serverManifest = await readJson(resolve(server, 'package.json'));
const { version, tag, output } = resolveVscodeReleaseOptions({
  argv: process.argv.slice(2),
  env: process.env,
  root,
  rootVersion: rootManifest.version,
  defaultOutput: '.tmp/release/vscode',
});

for (const [name, actual] of [['VS Code extension', extensionManifest.version], ['language server', serverManifest.version]]) {
  if (actual !== version) throw new Error(`${name} version ${actual} does not match package train ${version}.`);
}

await run(process.execPath, ['scripts/validate-vscode-client.mjs'], { cwd: root });
await run('npm', ['run', 'build:compiler'], { cwd: root });
await run('npm', ['run', 'build:language-server'], { cwd: root });
await run('npm', ['ci', '--ignore-scripts'], { cwd: extension });
await mkdir(output, { recursive: true });
const stagedServer = resolve(extension, 'server');

try {
  await rm(stagedServer, { recursive: true, force: true });
  const stagedNodeModules = resolve(stagedServer, 'node_modules');
  await mkdir(stagedNodeModules, { recursive: true });
  await cp(resolve(server, 'dist'), resolve(stagedServer, 'dist'), { recursive: true });
  await cp(resolve(server, 'package.json'), resolve(stagedServer, 'package.json'));
  const stagedPackages = new Map();
  for (const dependency of Object.keys(serverManifest.dependencies ?? {})) {
    const source = dependency === '@gluonjs/compiler'
      ? resolve(root, 'packages/compiler')
      : await locateDependency(dependency, server);
    await stageRuntimePackage(dependency, source, stagedNodeModules, stagedPackages);
  }

  const filename = `gluon-vscode-${version}.vsix`;
  const vsix = resolve(output, filename);
  await run('npm', ['run', 'package', '--', '--out', vsix], { cwd: extension });
  const digest = createHash('sha256').update(await readFile(vsix)).digest('hex');
  await writeFile(resolve(output, 'VSIX-SHA256SUMS'), `${digest}  ${filename}\n`);
  await writeFile(resolve(output, 'vscode-release-manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    version,
    tag,
    extension: extensionManifest.name,
    publisher: extensionManifest.publisher,
    languageServer: serverManifest.name,
    vsix: filename,
    sha256: digest,
  }, null, 2)}\n`);
  console.log(`VSIX built: ${vsix}`);
} finally {
  await rm(stagedServer, { recursive: true, force: true });
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function stageRuntimePackage(name, source, destinationNodeModules, stagedPackages) {
  const manifest = await readJson(resolve(source, 'package.json'));
  const prior = stagedPackages.get(name);
  if (prior) {
    if (prior !== manifest.version) throw new Error(`Runtime dependency ${name} resolves to both ${prior} and ${manifest.version}.`);
    return;
  }
  stagedPackages.set(name, manifest.version);
  const destination = resolve(destinationNodeModules, ...name.split('/'));
  await mkdir(destination, { recursive: true });
  await cp(resolve(source, 'package.json'), resolve(destination, 'package.json'));
  if (source.startsWith(resolve(root, 'packages'))) {
    for (const entry of manifest.files ?? []) {
      const path = resolve(source, entry);
      if (await exists(path)) await cp(path, resolve(destination, entry), { recursive: true });
    }
  } else {
    await cp(source, destination, {
      recursive: true,
      force: true,
      filter: (path) => path === source || !path.startsWith(`${resolve(source, 'node_modules')}/`),
    });
  }
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    await stageRuntimePackage(dependency, await locateDependency(dependency, source), destinationNodeModules, stagedPackages);
  }
}

async function locateDependency(name, source) {
  let directory = source;
  while (true) {
    const candidate = resolve(directory, 'node_modules', ...name.split('/'));
    if (await exists(resolve(candidate, 'package.json'))) return candidate;
    const parent = resolve(directory, '..');
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error(`Cannot resolve runtime dependency ${name} from ${source}.`);
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}
