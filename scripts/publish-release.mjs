import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import process from 'node:process';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, option('--directory') ?? '.tmp/release');
const version = option('--version');
const dryRun = process.argv.includes('--dry-run');
const allowed = new Set(['--directory', option('--directory'), '--version', version, '--dry-run']);

if (!version || process.argv.slice(2).some((argument) => argument !== undefined && !allowed.has(argument))) {
  throw new Error('Usage: node scripts/publish-release.mjs --version <version> [--directory <directory>] [--dry-run]');
}
if (process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN) {
  throw new Error('Long-lived npm publication tokens are prohibited; use npm trusted publishing.');
}
if (!dryRun && (process.env.GITHUB_REF_TYPE !== 'tag' || process.env.GITHUB_REF_NAME !== `v${version}`)) {
  throw new Error(`Publication requires the exact v${version} Git tag.`);
}

const evidence = JSON.parse(await readFile(resolve(directory, 'release-evidence.json'), 'utf8'));
const releaseContract = JSON.parse(await readFile(resolve(root, 'release/release-contract.json'), 'utf8'));
const registry = releaseContract.publication.registry;
if (evidence.version !== version || evidence.tag !== `v${version}` || evidence.blockedDevelopmentBuild) {
  throw new Error(`Release evidence is not a publishable ${version} candidate.`);
}

await verifyChecksums();
const stagingTag = `${releaseContract.publication.stagingDistTagPrefix}${version.replaceAll('.', '-')}`;
if (!dryRun) {
  for (const entry of evidence.packages) await requireExistingPackage(entry.name);
}
for (const entry of evidence.packages) {
  if (!dryRun) {
    const existing = await registryMetadata(entry.name, version);
    if (existing) {
      verifyPublishedMetadata(entry, existing);
      console.log(`verified existing ${entry.name}@${version}; immutable matching version skipped`);
      continue;
    }
  }
  const args = [
    'publish',
    resolve(directory, 'packages', entry.filename),
    '--access', 'public',
    '--provenance',
    '--tag', stagingTag,
    '--registry', registry,
  ];
  if (dryRun) args.push('--dry-run');
  await execFile('npm', args, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  console.log(`${dryRun ? 'validated' : 'published'} ${entry.name}@${version}`);
}
if (!dryRun) {
  for (const entry of evidence.packages) {
    const metadata = await waitForRegistry(entry.name, version);
    verifyPublishedMetadata(entry, metadata);
  }
  console.log(`staging publication verified: ${evidence.packages.length} packages at ${version} under ${stagingTag}`);
  console.log('An authorized npm owner must now promote every package to latest with interactive 2FA before release finalization.');
}

async function requireExistingPackage(name) {
  const bootstrapVersion = releaseContract.bootstrap.version;
  const metadata = await registryMetadata(name, bootstrapVersion);
  if (!metadata) {
    throw new Error(`${name} has no reviewed ${bootstrapVersion} npm bootstrap record. Trusted publishing cannot bootstrap a new package; complete the owner-controlled bootstrap before running this workflow.`);
  }
  if (metadata.name !== name || metadata.version !== bootstrapVersion) {
    throw new Error(`${name} npm bootstrap metadata does not match ${name}@${bootstrapVersion}.`);
  }
}

async function registryMetadata(name, packageVersion) {
  try {
    const { stdout } = await execFile('npm', ['view', `${name}@${packageVersion}`, '--json', '--registry', registry], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 5 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (error) {
    if (npmNotFound(error)) return null;
    throw error;
  }
}

async function waitForRegistry(name, packageVersion) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const metadata = await registryMetadata(name, packageVersion);
    if (metadata) return metadata;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
  }
  throw new Error(`${name}@${packageVersion} was not visible on the public registry after publication.`);
}

function verifyPublishedMetadata(entry, metadata) {
  if (metadata.version !== version) throw new Error(`${entry.name} registry version is ${metadata.version}; expected ${version}.`);
  if (metadata.dist?.integrity !== entry.integrity) {
    throw new Error(`${entry.name}@${version} registry integrity does not match the reviewed archive.`);
  }
  if (!metadata.dist?.attestations) throw new Error(`${entry.name}@${version} has no npm provenance attestation metadata.`);
}

function npmNotFound(error) {
  return error?.code === 1 && /E404|404 Not Found/.test(`${error.stderr ?? ''}\n${error.stdout ?? ''}`);
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
