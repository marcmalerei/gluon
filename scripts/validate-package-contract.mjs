import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const contract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const selectedName = process.argv[2] === '--package' ? process.argv[3] : undefined;
const packageHeaderBaseUrl = 'https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers';

if (process.argv.length > 2 && (!selectedName || process.argv.length !== 4)) {
  throw new Error('Usage: node scripts/validate-package-contract.mjs [--package <package-name>]');
}

const packages = contract.packages;
const byName = new Map(packages.map((entry) => [entry.name, entry]));

if (contract.version !== 1 || contract.versioning !== 'lockstep') {
  throw new Error('Only package contract version 1 with lockstep versioning is supported.');
}
if (contract.registry.scope !== '@gluonjs') {
  throw new Error('The package contract must use the accepted @gluonjs scope.');
}

if (byName.size !== packages.length) {
  throw new Error('Package names must be unique.');
}
if (new Set(packages.map((entry) => entry.directory)).size !== packages.length) {
  throw new Error('Package directories must be unique.');
}

if (selectedName && !byName.has(selectedName)) {
  throw new Error(`Unknown package ${selectedName}.`);
}

const validPackageName = /^(?:@gluonjs\/[a-z0-9]+(?:-[a-z0-9]+)*|create-gluon)$/;
const validExport = /^\.$|^\.\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

for (const entry of packages) {
  if (!validPackageName.test(entry.name)) {
    throw new Error(`Invalid official package name: ${entry.name}.`);
  }

  for (const exports of [entry.exports, entry.finalExports].filter(Boolean)) {
    if (new Set(exports).size !== exports.length || exports.some((item) => !validExport.test(item))) {
      throw new Error(`${entry.name} has duplicate or unsafe exports.`);
    }
  }
  if (entry.bins?.some((bin) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bin))) {
    throw new Error(`${entry.name} has an unsafe executable name.`);
  }

  for (const dependency of entry.dependencies) {
    if (!byName.has(dependency)) {
      throw new Error(`${entry.name} references undeclared package ${dependency}.`);
    }
    if (dependency === entry.name) {
      throw new Error(`${entry.name} cannot depend on itself.`);
    }
  }
}

const visiting = new Set();
const visited = new Set();

function visit(name, path = []) {
  if (visiting.has(name)) {
    throw new Error(`Package dependency cycle: ${[...path, name].join(' -> ')}.`);
  }
  if (visited.has(name)) return;

  visiting.add(name);
  const entry = byName.get(name);
  for (const dependency of entry.dependencies) visit(dependency, [...path, name]);
  visiting.delete(name);
  visited.add(name);
}

for (const entry of packages) visit(entry.name);

async function validateCurrentPackage(entry) {
  const directory = resolve(root, entry.directory);
  const packageJson = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  const readme = await readFile(resolve(directory, 'README.md'), 'utf8');
  const headerAssetName = entry.directory === '.' ? 'core' : entry.directory.split('/').at(-1);
  const headerAssetPath = `docs/assets/package-headers/${headerAssetName}.png`;
  const headerAssetUrl = `${packageHeaderBaseUrl}/${headerAssetName}.png`;
  const headerAsset = await readFile(resolve(root, headerAssetPath));

  if (packageJson.name !== entry.name) {
    throw new Error(`${entry.name} does not match ${packageJson.name} in package.json.`);
  }
  if (packageJson.license !== 'MIT') {
    throw new Error(`${entry.name} must declare the authorized MIT license.`);
  }
  if (headerAsset.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
    || headerAsset.readUInt32BE(16) !== 1983
    || headerAsset.readUInt32BE(20) !== 793) {
    throw new Error(`${entry.name} package header must be a 1983×793 PNG at ${headerAssetPath}.`);
  }

  const expectedHeader = [
    '<!-- gluon-package-header:start -->',
    '<p align="center">',
    `  <img src="${headerAssetUrl}" alt="${entry.name} — Gluon package header" width="100%">`,
    '</p>',
    '<!-- gluon-package-header:end -->',
  ].join('\n');
  if (!readme.startsWith(expectedHeader)) {
    throw new Error(`${entry.name} README must start with its exact Gluon package header.`);
  }
  for (const token of [
    '<!-- gluon-package-header:start -->',
    '<!-- gluon-package-header:end -->',
    headerAssetUrl,
  ]) {
    if (readme.split(token).length !== 2) {
      throw new Error(`${entry.name} README must contain exactly one ${token}.`);
    }
  }
  if (!/```(?:bash|html|js|sh|ts|tsx)\n[\s\S]+?```/.test(readme)) {
    throw new Error(`${entry.name} README must contain a fenced, runnable usage example.`);
  }
  if ((entry.bins ?? []).length === 0) {
    const escapedPackageName = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const publicImport = new RegExp(
      `(?:from\\s+['"]${escapedPackageName}(?:\\/[^'"]+)?['"]|import\\s*\\(\\s*['"]${escapedPackageName}(?:\\/[^'"]+)?['"]\\s*\\))`,
    );
    if (!publicImport.test(readme)) {
      throw new Error(`${entry.name} README usage example must import its public package entry point.`);
    }
  }

  const actualOfficialDependencies = new Set(
    ['dependencies', 'peerDependencies']
      .flatMap((field) => Object.keys(packageJson[field] ?? {}))
      .filter((name) => byName.has(name)),
  );
  const expectedCurrentDependencies = new Set(entry.currentDependencies ?? entry.dependencies);
  if (
    actualOfficialDependencies.size !== expectedCurrentDependencies.size
    || [...actualOfficialDependencies].some((name) => !expectedCurrentDependencies.has(name))
  ) {
    throw new Error(`${entry.name} installed official dependencies do not match its current package contract.`);
  }

  const exportNames = Object.keys(packageJson.exports ?? {});
  if (JSON.stringify(exportNames.sort()) !== JSON.stringify([...entry.exports].sort())) {
    throw new Error(`${entry.name} package.json exports do not match its package contract.`);
  }
  const binNames = Object.keys(packageJson.bin ?? {});
  if (JSON.stringify(binNames.sort()) !== JSON.stringify([...(entry.bins ?? [])].sort())) {
    throw new Error(`${entry.name} package.json executables do not match its package contract.`);
  }

  const requiredPackFiles = ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md'];
  for (const required of ['LICENSE', 'CHANGELOG.md']) {
    if (!packageJson.files?.includes(required)) {
      throw new Error(`${entry.name} must include ${required} in its files allowlist.`);
    }
  }

  const exportTargets = [];
  for (const [exportName, targets] of Object.entries(packageJson.exports)) {
    for (const condition of ['types', 'import']) {
      const target = targets?.[condition];
      if (typeof target !== 'string' || !target.startsWith('./')) {
        throw new Error(`${entry.name} export ${exportName} requires a relative ${condition} target.`);
      }
      const relativeTarget = target.slice(2);
      await access(resolve(directory, relativeTarget));
      exportTargets.push(relativeTarget);
    }
  }
  for (const [binName, target] of Object.entries(packageJson.bin ?? {})) {
    if (typeof target !== 'string' || !target.startsWith('./')) {
      throw new Error(`${entry.name} executable ${binName} requires a relative target.`);
    }
    const relativeTarget = target.slice(2);
    const source = await readFile(resolve(directory, relativeTarget), 'utf8');
    if (!source.startsWith('#!/usr/bin/env node\n')) {
      throw new Error(`${entry.name} executable ${binName} requires a Node shebang.`);
    }
    exportTargets.push(relativeTarget);
  }

  const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: directory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const packResult = JSON.parse(packOutput)[0];
  const packedFiles = new Set(packResult.files.map((file) => file.path));

  for (const required of [...requiredPackFiles, ...exportTargets]) {
    if (!packedFiles.has(required)) {
      throw new Error(`${entry.name} pack output is missing ${required}.`);
    }
  }
}

const selectedPackages = selectedName ? [byName.get(selectedName)] : packages;

for (const entry of selectedPackages) {
  if (entry.state === 'current') await validateCurrentPackage(entry);
  console.log(`validated ${entry.name} (${entry.state}: ${entry.exports.join(', ')})`);
}

console.log(`package contract valid: ${selectedPackages.length} package${selectedPackages.length === 1 ? '' : 's'}`);
