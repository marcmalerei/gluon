import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageContract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const lockfile = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const officialNames = new Set(packageContract.packages.map(({ name }) => name));
const aggregate = JSON.parse(execFileSync('npm', [
  'sbom',
  '--package-lock-only',
  '--legacy-peer-deps',
  '--sbom-format',
  'spdx',
], { cwd: root, encoding: 'utf8' }));
const aggregatePackages = new Set(aggregate.packages.map(({ name, versionInfo }) => `${name}@${versionInfo}`));
let checkedDependencies = 0;

for (const entry of packageContract.packages) {
  const manifest = JSON.parse(await readFile(resolve(root, entry.directory, 'package.json'), 'utf8'));
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      const version = dependencyVersion(name);
      if (!aggregatePackages.has(`${name}@${version}`)) {
        throw new Error(`Aggregate SPDX SBOM is missing declared dependency ${name}@${version} for ${entry.name}.`);
      }
      checkedDependencies += 1;
    }
  }
}

console.log(`aggregate SPDX closure valid: ${checkedDependencies} declared package dependencies`);

function dependencyVersion(name) {
  if (officialNames.has(name)) return rootManifest.version;
  const version = lockfile.packages[`node_modules/${name}`]?.version;
  if (!version) throw new Error(`package-lock.json has no installed version for ${name}.`);
  return version;
}
