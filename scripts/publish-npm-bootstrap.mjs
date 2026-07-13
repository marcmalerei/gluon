import { execFile as execFileCallback, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import process from 'node:process';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const releaseContract = await readJson('release/release-contract.json');
const packageContract = await readJson('package-contract.json');
const bootstrap = releaseContract.bootstrap;
const directory = resolve(root, option('--directory') ?? bootstrap.artifactDirectory);
const dryRun = process.argv.includes('--dry-run');
const confirmed = process.argv.includes('--confirm-owner-controlled-bootstrap');
const allowed = new Set([
  '--directory',
  option('--directory'),
  '--dry-run',
  '--confirm-owner-controlled-bootstrap',
]);

if (process.argv.slice(2).some((argument) => argument !== undefined && !allowed.has(argument))) {
  throw new Error('Usage: node scripts/publish-npm-bootstrap.mjs [--directory <directory>] [--dry-run] [--confirm-owner-controlled-bootstrap]');
}
if (process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN) {
  throw new Error('Long-lived npm publication tokens are prohibited for the owner-controlled bootstrap.');
}
if (!dryRun && !confirmed) {
  throw new Error('Bootstrap publication is immutable; pass --confirm-owner-controlled-bootstrap after reviewing every archive.');
}

const evidence = JSON.parse(await readFile(resolve(directory, 'bootstrap-evidence.json'), 'utf8'));
validateEvidence(evidence);
await verifyChecksums();
await reproduceArtifacts(evidence);

if (!dryRun) {
  await requireCleanMain(evidence.sourceCommit);
  await requireNpmOwner();
}

const registryState = new Map();
if (!dryRun) {
  for (const entry of evidence.packages) {
    const packument = await registryPackument(entry.name);
    if (packument && !packument.versions?.[bootstrap.version]) {
      throw new Error(`${entry.name} already exists without the reviewed ${bootstrap.version} bootstrap record; stop before publishing.`);
    }
    if (packument) verifyBootstrapMetadata(entry, packument);
    registryState.set(entry.name, packument);
  }
}

for (const entry of evidence.packages) {
  if (!dryRun && registryState.get(entry.name)) {
    console.log(`verified existing ${entry.name}@${bootstrap.version}; immutable matching bootstrap skipped`);
    continue;
  }
  const args = [
    'publish',
    resolve(directory, 'packages', entry.filename),
    '--access', bootstrap.access,
    '--tag', bootstrap.distTag,
    '--ignore-scripts',
  ];
  if (dryRun) args.push('--dry-run');
  execFileSync('npm', args, { cwd: root, stdio: 'inherit' });
  console.log(`${dryRun ? 'validated' : 'published'} ${entry.name}@${bootstrap.version}`);
  if (!dryRun) verifyBootstrapMetadata(entry, await waitForRegistry(entry.name));
}

console.log(`${dryRun ? 'bootstrap dry-run valid' : 'bootstrap publication verified'}: ${evidence.packages.length} packages at ${bootstrap.version} under ${bootstrap.distTag}; latest ${dryRun ? 'forbidden by contract' : 'absent'}`);

function validateEvidence(evidenceValue) {
  const expectedNames = packageContract.packages.map(({ name }) => name);
  const actualNames = evidenceValue.packages?.map(({ name }) => name) ?? [];
  if (evidenceValue.version !== bootstrap.version
    || evidenceValue.distTag !== bootstrap.distTag
    || evidenceValue.identity !== bootstrap.identity
    || evidenceValue.latestAllowed !== false
    || JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error('Bootstrap evidence does not match the reviewed release and package contracts.');
  }
}

async function requireCleanMain(sourceCommit) {
  const branch = (await run('git', ['branch', '--show-current'])).trim();
  const head = (await run('git', ['rev-parse', 'HEAD'])).trim();
  const upstream = (await run('git', ['rev-parse', 'origin/main'])).trim();
  const dirty = (await run('git', ['status', '--porcelain'])).trim();
  if (branch !== 'main' || head !== sourceCommit || head !== upstream || dirty) {
    throw new Error('Bootstrap publication requires clean main at the exact reviewed origin/main commit used to build the artifacts.');
  }
}

async function reproduceArtifacts(reviewedEvidence) {
  const reproduced = resolve(root, '.tmp/npm-bootstrap-reproduced');
  try {
    await run('node', ['scripts/build-npm-bootstrap-artifacts.mjs', '--output', reproduced]);
    const reproducedEvidence = JSON.parse(await readFile(resolve(reproduced, 'bootstrap-evidence.json'), 'utf8'));
    const reviewedChecksums = await readFile(resolve(directory, 'SHA256SUMS'), 'utf8');
    const reproducedChecksums = await readFile(resolve(reproduced, 'SHA256SUMS'), 'utf8');
    if (JSON.stringify(reproducedEvidence) !== JSON.stringify(reviewedEvidence)
      || reproducedChecksums !== reviewedChecksums) {
      throw new Error('Bootstrap artifacts do not match an independent rebuild from the reviewed source commit.');
    }
  } finally {
    await rm(reproduced, { recursive: true, force: true });
  }
}

async function requireNpmOwner() {
  const user = (await run('npm', ['whoami'])).trim();
  const scope = packageContract.registry.scope.replace(/^@/, '');
  const members = JSON.parse(await run('npm', ['org', 'ls', scope, '--json']));
  if (members[user] !== 'owner') {
    throw new Error(`${user} is not an owner of npm organization ${scope}.`);
  }
}

async function registryPackument(name) {
  const url = `${releaseContract.publication.registry}/${encodeURIComponent(name)}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`npm registry returned HTTP ${response.status} for ${name}.`);
  return response.json();
}

async function waitForRegistry(name) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const packument = await registryPackument(name);
    if (packument?.versions?.[bootstrap.version]) return packument;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
  }
  throw new Error(`${name}@${bootstrap.version} was not visible on npm after publication.`);
}

function verifyBootstrapMetadata(entry, packument) {
  const metadata = packument.versions?.[bootstrap.version];
  if (!metadata) throw new Error(`${entry.name} is missing ${bootstrap.version}.`);
  if (metadata.dist?.integrity !== entry.integrity) {
    throw new Error(`${entry.name}@${bootstrap.version} registry integrity does not match the reviewed archive.`);
  }
  if (packument['dist-tags']?.[bootstrap.distTag] !== bootstrap.version) {
    throw new Error(`${entry.name} does not map ${bootstrap.distTag} to ${bootstrap.version}.`);
  }
  if (bootstrap.latestAllowed === false && packument['dist-tags']?.latest) {
    throw new Error(`${entry.name} unexpectedly has latest=${packument['dist-tags'].latest} during bootstrap.`);
  }
}

async function verifyChecksums() {
  const manifest = await readFile(resolve(directory, 'SHA256SUMS'), 'utf8');
  for (const line of manifest.trim().split('\n')) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) throw new Error(`Invalid checksum line: ${line}`);
    const actual = createHash('sha256').update(await readFile(resolve(directory, match[2]))).digest('hex');
    if (actual !== match[1]) throw new Error(`Checksum mismatch for ${match[2]}.`);
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function run(command, args) {
  const { stdout } = await execFile(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
