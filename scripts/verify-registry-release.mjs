import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import process from 'node:process';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const version = option('--version');
const output = resolve(root, option('--output') ?? '.tmp/release/registry-verification.json');
const directory = resolve(root, option('--directory') ?? '.tmp/release');
const packageContract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const fixture = resolve(root, '.tmp/registry-verification');

if (!version) throw new Error('Usage: node scripts/verify-registry-release.mjs --version <version> [--directory <directory>] [--output <file>]');
const releaseEvidence = JSON.parse(await readFile(resolve(directory, 'release-evidence.json'), 'utf8'));
if (releaseEvidence.version !== version || releaseEvidence.blockedDevelopmentBuild) {
  throw new Error(`Release evidence is not a publishable ${version} candidate.`);
}
const evidenceByName = new Map(releaseEvidence.packages.map((entry) => [entry.name, entry]));
await rm(fixture, { recursive: true, force: true });
await mkdir(fixture, { recursive: true });

const dependencies = Object.fromEntries(packageContract.packages.map((entry) => [entry.name, version]));
await writeFile(resolve(fixture, 'package.json'), `${JSON.stringify({
  name: 'gluon-registry-verification',
  version: '0.0.0',
  private: true,
  type: 'module',
  dependencies,
}, null, 2)}\n`, 'utf8');

await run('npm', ['install', '--ignore-scripts', '--package-lock=true', '--audit=false', '--fund=false'], fixture);

const imports = [];
for (const entry of packageContract.packages) {
  for (const [index, exportName] of entry.exports.entries()) {
    const specifier = exportName === '.' ? entry.name : `${entry.name}/${exportName.slice(2)}`;
    imports.push(`import type * as Package${imports.length} from '${specifier}';`);
  }
}
imports.push('export type RegistryTypes = unknown;');
await writeFile(resolve(fixture, 'index.ts'), `${imports.join('\n')}\n`, 'utf8');
await writeFile(resolve(fixture, 'tsconfig.json'), `${JSON.stringify({ compilerOptions: {
  target: 'ES2023',
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  strict: true,
  noEmit: true,
  skipLibCheck: false,
}, files: ['index.ts'] }, null, 2)}\n`, 'utf8');
await run(resolve(root, 'node_modules/.bin/tsc'), ['-p', resolve(fixture, 'tsconfig.json')], fixture);

const packages = [];
for (const entry of packageContract.packages) {
  const metadata = JSON.parse(await run('npm', ['view', `${entry.name}@${version}`, '--json'], fixture));
  const latest = (await run('npm', ['view', `${entry.name}`, 'dist-tags.latest'], fixture)).trim();
  if (metadata.version !== version) throw new Error(`${entry.name} registry version is ${metadata.version}; expected ${version}.`);
  if (latest !== version) throw new Error(`${entry.name} latest tag is ${latest}; expected ${version}.`);
  if (metadata.dist?.integrity !== evidenceByName.get(entry.name)?.integrity) {
    throw new Error(`${entry.name}@${version} registry integrity does not match the reviewed archive.`);
  }
  if (!metadata.dist?.attestations) throw new Error(`${entry.name}@${version} has no npm provenance attestation metadata.`);
  packages.push({ name: entry.name, version: metadata.version, latest, integrity: metadata.dist.integrity, attestations: metadata.dist.attestations });
}

const result = {
  schemaVersion: 1,
  version,
  verifiedAt: new Date().toISOString(),
  cleanRoomInstall: true,
  publicTypeDeclarations: true,
  packages,
};
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
await rm(fixture, { recursive: true, force: true });
console.log(`registry release verified: ${packages.length} packages at ${version}`);

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function run(command, args, cwd) {
  const { stdout } = await execFile(command, args, { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}
