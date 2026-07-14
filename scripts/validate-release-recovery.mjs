import { execFileSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(import.meta.dirname, '..');
const version = option('--version');
const allowPendingEvidence = process.argv.includes('--allow-pending-evidence');
const supported = new Set(['--version', version, '--allow-pending-evidence']);

if (!version || process.argv.slice(2).some((argument) => argument !== undefined && !supported.has(argument))) {
  throw new Error('Usage: node scripts/validate-release-recovery.mjs --version <version> [--allow-pending-evidence]');
}

const manifestPath = `release/recovery/${version}.json`;
if (!await fileExists(manifestPath)) {
  if ((process.env.GITHUB_REF_NAME ?? '').includes('-recovery.')) {
    throw new Error(`Recovery tag ${process.env.GITHUB_REF_NAME} has no ${manifestPath}.`);
  }
  console.log(`release recovery not configured for ${version}`);
  process.exit(0);
}

const manifest = await readJson(manifestPath);
const schema = await readJson('release/recovery-manifest.schema.json');
const validator = new Ajv2020({ allErrors: true, strict: false });
addFormats(validator);
const validate = validator.compile(schema);
if (!validate(manifest)) {
  const errors = validate.errors?.map((entry) => `${entry.instancePath || '/'} ${entry.message}`).join('; ');
  throw new Error(`${manifestPath} failed schema validation: ${errors}.`);
}

const canonicalTag = `v${version}`;
const expectedPaths = [
  '.github/workflows/release.yml',
  `docs-site/content/${version}/guides/releasing/index.md`,
  'docs/releasing.md',
  `release/compatibility/${version}.json`,
  `release/evidence/${version}.json`,
  'release/recovery-manifest.schema.json',
  manifestPath,
  'scripts/publish-release.mjs',
  'scripts/validate-release-contract.mjs',
  'scripts/validate-release-recovery.mjs',
  'scripts/verify-release-hosting.mjs',
];
if (manifest.releaseVersion !== version
  || manifest.canonicalTag !== canonicalTag
  || manifest.recoveryTag !== `${canonicalTag}-recovery.1`
  || JSON.stringify(manifest.allowedCanonicalDeltaPaths) !== JSON.stringify(expectedPaths)) {
  throw new Error(`${manifestPath} does not match the exact one-time ${version} recovery boundary.`);
}

const canonicalTagCommit = git('rev-list', '-n', '1', canonicalTag);
const canonicalTagTree = git('rev-parse', `${canonicalTag}^{tree}`);
const failedEvidenceTree = git('rev-parse', `${manifest.failedEvidenceCommit}^{tree}`);
if (canonicalTagCommit !== manifest.canonicalTagCommit
  || canonicalTagTree !== manifest.canonicalTagTree
  || failedEvidenceTree !== manifest.canonicalTagTree) {
  throw new Error(`${manifestPath} does not match the immutable canonical tag and reviewed evidence tree.`);
}
requireAncestor(manifest.failedTestedCommit, manifest.failedEvidenceCommit,
  'The failed evidence commit does not descend from its recorded tested commit.');

const changed = git('diff', '--name-only', canonicalTag, 'HEAD').split('\n').filter(Boolean);
const allowed = new Set(expectedPaths);
const forbidden = changed.filter((path) => !allowed.has(path));
if (forbidden.length > 0) {
  throw new Error(`Recovery changes package or application inputs outside the exact allowlist: ${forbidden.join(', ')}.`);
}

const evidencePath = `release/evidence/${version}.json`;
const compatibilityPath = `release/compatibility/${version}.json`;
const evidenceExists = await fileExists(evidencePath);
const compatibilityExists = await fileExists(compatibilityPath);
if (evidenceExists !== compatibilityExists) {
  throw new Error('Recovery release-cut evidence and compatibility manifest must be added together.');
}
if (!allowPendingEvidence && !evidenceExists) {
  throw new Error(`Recovery publication requires ${evidencePath} and ${compatibilityPath}.`);
}

if (process.env.GITHUB_REF_TYPE === 'tag') {
  if (process.env.GITHUB_REF_NAME !== manifest.recoveryTag) {
    throw new Error(`The ${version} recovery may run only from ${manifest.recoveryTag}.`);
  }
  const recoveryCommit = git('rev-list', '-n', '1', manifest.recoveryTag);
  const head = git('rev-parse', 'HEAD');
  if (recoveryCommit !== head) throw new Error(`${manifest.recoveryTag} does not resolve to HEAD.`);
  requireAncestor(manifest.canonicalTagCommit, head,
    `${manifest.recoveryTag} must merge the immutable canonical tag history.`);
  requireAncestor(manifest.failedEvidenceCommit, head,
    `${manifest.recoveryTag} must merge the reviewed release branch history.`);
}

console.log(`release recovery valid: ${manifest.recoveryTag} preserves ${canonicalTag} package inputs with ${changed.length} allowlisted path change(s)`);

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function requireAncestor(ancestor, descendant, message) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd: root, stdio: 'ignore' });
  } catch {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

async function fileExists(path) {
  try {
    await access(resolve(root, path));
    return true;
  } catch {
    return false;
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}
