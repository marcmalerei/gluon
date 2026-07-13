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
const releaseContract = JSON.parse(await readFile(resolve(root, 'release/release-contract.json'), 'utf8'));

if (!repository) throw new Error('GITHUB_REPOSITORY is required.');
if (!releaseVersion) throw new Error('RELEASE_VERSION is required.');
if (process.env.GITHUB_REPOSITORY_VISIBILITY !== 'public') {
  throw new Error(`Release publication requires a public repository; found ${process.env.GITHUB_REPOSITORY_VISIBILITY ?? 'unknown'}.`);
}
if (expectedEnvironment !== 'npm') throw new Error('Release publication must run in the protected npm environment.');
if (process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN) {
  throw new Error('Long-lived npm publication tokens are prohibited; use npm trusted publishing.');
}

const environment = await githubJson(`repos/${repository}/environments/npm`);
const reviewerRule = environment.protection_rules?.find((rule) => rule.type === 'required_reviewers');
if (reviewerRule) {
  throw new Error('The accepted single-operator npm environment must not require a second-person reviewer.');
}
const waitTimerRule = environment.protection_rules?.find((rule) => rule.type === 'wait_timer');
if (waitTimerRule) {
  throw new Error('The accepted single-operator npm environment must not imply an uncontracted wait timer.');
}
if (environment.can_admins_bypass !== false) {
  throw new Error('The npm environment must disallow administrator bypass.');
}
if (environment.deployment_branch_policy?.custom_branch_policies !== true) {
  throw new Error('The npm environment requires a custom release-tag deployment policy.');
}
const deploymentPolicies = await githubJson(`repos/${repository}/environments/npm/deployment-branch-policies`);
if (!Array.isArray(deploymentPolicies.branch_policies)
  || deploymentPolicies.branch_policies.length !== 1
  || deploymentPolicies.branch_policies[0].type !== 'tag'
  || deploymentPolicies.branch_policies[0].name !== 'v*') {
  throw new Error('The npm environment must permit only the exact v* release-tag pattern.');
}

const rulesets = await githubJson(`repos/${repository}/rulesets?includes_parents=true`);
const releaseTagProtection = releaseContract.githubReleaseTagProtection;
const operator = await githubJson(`users/${releaseTagProtection.operator}`);
const evidencePath = releaseContract.releaseCutEvidencePath.replace('{version}', releaseVersion);
const releaseCutEvidence = JSON.parse(await readFile(resolve(root, evidencePath), 'utf8'));
const immutablePreflight = releaseCutEvidence.hostingPreflight?.immutableReleases;
if (immutablePreflight?.enabled !== true
  || immutablePreflight.checkedBy !== releaseContract.npmOwnerRecovery.owner
  || !Number.isFinite(Date.parse(immutablePreflight.checkedAt))
  || immutablePreflight.checkedAt !== releaseCutEvidence.acceptedAt) {
  throw new Error('Release-cut evidence must record the sole operator\'s successful immutable-releases preflight.');
}
const rulesetPreflight = releaseCutEvidence.hostingPreflight?.releaseTagRulesets;
if (!Number.isInteger(rulesetPreflight?.creationRulesetId)
  || !Number.isInteger(rulesetPreflight?.immutabilityRulesetId)
  || rulesetPreflight.creationRulesetId === rulesetPreflight.immutabilityRulesetId
  || rulesetPreflight.creationBypass?.actorId !== operator.id
  || rulesetPreflight.creationBypass?.actorType !== releaseTagProtection.creationBypassActorType
  || rulesetPreflight.creationBypass?.bypassMode !== releaseTagProtection.creationBypassMode
  || rulesetPreflight.immutabilityBypassActorCount !== 0
  || rulesetPreflight.checkedBy !== releaseContract.npmOwnerRecovery.owner
  || !Number.isFinite(Date.parse(rulesetPreflight.checkedAt))
  || rulesetPreflight.checkedAt !== releaseCutEvidence.acceptedAt) {
  throw new Error('Release-cut evidence must record the sole operator\'s exact release-tag ruleset bypass preflight.');
}
const activeTagRulesets = new Map(rulesets
  .filter((entry) => entry.target === 'tag' && entry.enforcement === 'active')
  .map((entry) => [entry.id, entry]));
if (!activeTagRulesets.has(rulesetPreflight.creationRulesetId)
  || !activeTagRulesets.has(rulesetPreflight.immutabilityRulesetId)) {
  throw new Error('The preflight release-tag rulesets must remain active.');
}
const creationRuleset = await githubJson(`repos/${repository}/rulesets/${rulesetPreflight.creationRulesetId}`);
const immutabilityRuleset = await githubJson(`repos/${repository}/rulesets/${rulesetPreflight.immutabilityRulesetId}`);
for (const ruleset of [creationRuleset, immutabilityRuleset]) {
  const includes = ruleset.conditions?.ref_name?.include ?? [];
  const excludes = ruleset.conditions?.ref_name?.exclude ?? [];
  if (JSON.stringify(includes) !== JSON.stringify(releaseTagProtection.includePatterns) || excludes.length !== 0) {
    throw new Error('Active release-tag rulesets must cover exactly the contracted v-prefixed tag pattern.');
  }
}
const creationRuleTypes = new Set(creationRuleset.rules?.map((rule) => rule.type));
const immutabilityRuleTypes = new Set(immutabilityRuleset.rules?.map((rule) => rule.type));
if (!creationRuleTypes.has('creation')) {
  throw new Error('The active creation ruleset must restrict v-prefixed release-tag creation.');
}
if (!immutabilityRuleTypes.has('update') || !immutabilityRuleTypes.has('deletion')) {
  throw new Error('The active immutability ruleset must prevent update and deletion of v-prefixed release tags.');
}
if (Object.entries(releaseContract.supportBoundary)
  .some(([field, expected]) => releaseCutEvidence.supportBoundary?.[field] !== expected)
  || releaseCutEvidence.acceptedBy !== releaseContract.npmOwnerRecovery.owner) {
  throw new Error('Release-cut evidence must record the contracted automated-only support boundary and sole operator acceptance.');
}
const runId = /\/actions\/runs\/(\d+)$/.exec(releaseCutEvidence.automatedQualityRun.url)?.[1];
if (!runId) throw new Error('Release-cut evidence has no exact Quality Gates run URL.');
const qualityRun = JSON.parse((await execFile('gh', ['api', `repos/${repository}/actions/runs/${runId}`], {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024,
})).stdout);
if (qualityRun.conclusion !== 'success' || qualityRun.head_sha !== releaseCutEvidence.testedCommit
  || qualityRun.name !== 'Quality Gates' || !qualityRun.path?.endsWith('/quality-gates.yml')) {
  throw new Error('Release-cut evidence Quality Gates run does not prove the tested commit passed.');
}
try {
  await execFile('git', ['merge-base', '--is-ancestor', releaseCutEvidence.testedCommit, 'HEAD'], { cwd: root });
} catch {
  throw new Error('The automated release-cut commit is not an ancestor of the release tag.');
}
const changedAfterTesting = (await execFile('git', ['diff', '--name-only', releaseCutEvidence.testedCommit, 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
})).stdout.trim().split('\n').filter(Boolean);
const compatibilityPath = releaseContract.compatibilityManifestPath.replace('{version}', releaseVersion);
const permittedEvidenceChanges = new Set([evidencePath, compatibilityPath]);
if (changedAfterTesting.some((path) => !permittedEvidenceChanges.has(path))) {
  throw new Error(`Acceptance-relevant files changed after the automated Quality Gates run: ${changedAfterTesting.filter((path) => !permittedEvidenceChanges.has(path)).join(', ')}.`);
}

console.log(`release hosting valid: ${repository} is public, immutable releases recorded enabled, npm environment active, tested commit verified`);

async function githubJson(path) {
  return JSON.parse((await execFile('gh', ['api', path], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })).stdout);
}
