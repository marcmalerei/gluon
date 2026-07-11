import { execFile as execFileCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import process from 'node:process';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const repository = process.env.GITHUB_REPOSITORY;
const expectedEnvironment = process.env.GLUON_RELEASE_ENVIRONMENT;
const releaseVersion = process.env.RELEASE_VERSION;

if (!repository) throw new Error('GITHUB_REPOSITORY is required.');
if (!releaseVersion) throw new Error('RELEASE_VERSION is required.');
if (process.env.GITHUB_REPOSITORY_VISIBILITY !== 'public') {
  throw new Error(`Release publication requires a public repository; found ${process.env.GITHUB_REPOSITORY_VISIBILITY ?? 'unknown'}.`);
}
if (expectedEnvironment !== 'npm') throw new Error('Release publication must run in the protected npm environment.');
if (process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN) {
  throw new Error('Long-lived npm publication tokens are prohibited; use npm trusted publishing.');
}

const immutable = await githubJson(`repos/${repository}/immutable-releases`);
if (immutable.enabled !== true) throw new Error('GitHub immutable releases must be enabled before publication.');

const environment = await githubJson(`repos/${repository}/environments/npm`);
const reviewerRule = environment.protection_rules?.find((rule) => rule.type === 'required_reviewers');
if (!reviewerRule || reviewerRule.prevent_self_review !== true || !Array.isArray(reviewerRule.reviewers) || reviewerRule.reviewers.length === 0) {
  throw new Error('The npm environment requires named reviewers with self-review prevention.');
}
if (environment.can_admins_bypass !== false) {
  throw new Error('The npm environment must disallow administrator bypass.');
}
if (environment.deployment_branch_policy?.custom_branch_policies !== true) {
  throw new Error('The npm environment requires a custom release-tag deployment policy.');
}
const deploymentPolicies = await githubJson(`repos/${repository}/environments/npm/deployment-branch-policies`);
if (!deploymentPolicies.branch_policies?.some((policy) => policy.type === 'tag' && ['v*', 'v*.*.*'].includes(policy.name))) {
  throw new Error('The npm environment must restrict deployments to v-prefixed release tags.');
}

const rulesets = await githubJson(`repos/${repository}/rulesets?includes_parents=true`);
let protectedReleaseTags = false;
for (const summary of rulesets.filter((entry) => entry.target === 'tag' && entry.enforcement === 'active')) {
  const ruleset = await githubJson(`repos/${repository}/rulesets/${summary.id}`);
  const includes = ruleset.conditions?.ref_name?.include ?? [];
  const ruleTypes = new Set(ruleset.rules?.map((rule) => rule.type));
  const coversReleaseTags = includes.includes('~ALL') || includes.some((pattern) => ['refs/tags/v*', 'refs/tags/v*.*.*'].includes(pattern));
  if (coversReleaseTags && ['creation', 'update', 'deletion'].every((type) => ruleTypes.has(type))) {
    protectedReleaseTags = true;
    break;
  }
}
if (!protectedReleaseTags) throw new Error('An active ruleset must protect v-prefixed release tags.');

const manualEvidence = JSON.parse(await readFile(resolve(root, 'release/evidence', `${releaseVersion}.json`), 'utf8'));
const runId = /\/actions\/runs\/(\d+)$/.exec(manualEvidence.automatedQualityRun.url)?.[1];
if (!runId) throw new Error('Manual release evidence has no exact Quality Gates run URL.');
const qualityRun = JSON.parse((await execFile('gh', ['api', `repos/${repository}/actions/runs/${runId}`], {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024,
})).stdout);
if (qualityRun.conclusion !== 'success' || qualityRun.head_sha !== manualEvidence.testedCommit
  || qualityRun.name !== 'Quality Gates' || !qualityRun.path?.endsWith('/quality-gates.yml')) {
  throw new Error('Manual release evidence Quality Gates run does not prove the tested commit passed.');
}
try {
  await execFile('git', ['merge-base', '--is-ancestor', manualEvidence.testedCommit, 'HEAD'], { cwd: root });
} catch {
  throw new Error('The manually tested commit is not an ancestor of the release tag.');
}
const changedAfterTesting = (await execFile('git', ['diff', '--name-only', manualEvidence.testedCommit, 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
})).stdout.trim().split('\n').filter(Boolean);
const evidencePath = `release/evidence/${releaseVersion}.json`;
const compatibilityPath = `release/compatibility/${releaseVersion}.json`;
const permittedEvidenceChanges = new Set([evidencePath, compatibilityPath]);
if (changedAfterTesting.some((path) => !permittedEvidenceChanges.has(path))) {
  throw new Error(`Acceptance-relevant files changed after manual testing: ${changedAfterTesting.filter((path) => !permittedEvidenceChanges.has(path)).join(', ')}.`);
}

console.log(`release hosting valid: ${repository} is public, immutable releases enabled, npm environment active, tested commit verified`);

async function githubJson(path) {
  return JSON.parse((await execFile('gh', ['api', path], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })).stdout);
}
