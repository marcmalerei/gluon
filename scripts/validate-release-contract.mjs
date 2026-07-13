import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(import.meta.dirname, '..');
const candidateIndex = process.argv.indexOf('--candidate');
const candidateVersion = candidateIndex >= 0 ? process.argv[candidateIndex + 1] : undefined;
const jsonOutput = process.argv.includes('--json');
const supportedArguments = new Set(['--candidate', '--json', candidateVersion]);

if (process.argv.slice(2).some((argument) => !supportedArguments.has(argument)) || (candidateIndex >= 0 && !candidateVersion)) {
  throw new Error('Usage: node scripts/validate-release-contract.mjs [--candidate <version>] [--json]');
}

const releaseContract = await readJson('release/release-contract.json');
const releaseContractSchema = await readJson('release/release-contract.schema.json');
const spdxSchemaDigest = createHash('sha256')
  .update(await readFile(resolve(root, releaseContract.spdxSchema.path)))
  .digest('hex');
const packageContract = await readJson('package-contract.json');
const packageContractSchema = await readJson('schemas/package-contract.schema.json');
const rootManifest = await readJson('package.json');
const versions = await readJson('docs-site/versions.json');
const lockfile = await readJson('package-lock.json');
const rootChangelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8');
const workflow = await readFile(resolve(root, '.github/workflows/release.yml'), 'utf8');
const publishScript = await readFile(resolve(root, 'scripts/publish-release.mjs'), 'utf8');
const artifactBuildScript = await readFile(resolve(root, 'scripts/build-release-artifacts.mjs'), 'utf8');
const bootstrapBuildScript = await readFile(resolve(root, 'scripts/build-npm-bootstrap-artifacts.mjs'), 'utf8');
const bootstrapPublishScript = await readFile(resolve(root, 'scripts/publish-npm-bootstrap.mjs'), 'utf8');
const hostingScript = await readFile(resolve(root, 'scripts/verify-release-hosting.mjs'), 'utf8');
const officialNames = new Set(packageContract.packages.map((entry) => entry.name));
const releaseCutEvidenceSchema = await readJson('release/release-cut-evidence.schema.json');
const compatibilityManifestSchema = await readJson('release/compatibility-manifest.schema.json');
const schemaValidator = new Ajv2020({ allErrors: true, strict: false });
addFormats(schemaValidator);
const validateReleaseContractSchema = schemaValidator.compile(releaseContractSchema);
const validatePackageContractSchema = schemaValidator.compile(packageContractSchema);
const validateReleaseCutEvidenceSchema = schemaValidator.compile(releaseCutEvidenceSchema);
const validateCompatibilityManifestSchema = schemaValidator.compile(compatibilityManifestSchema);
const manifests = [];

validateReleaseContract();
validateJsonSchema('package-contract.json', packageContract, validatePackageContractSchema);
validateEvidenceSchemaBoundary();

for (const entry of packageContract.packages) {
  if (entry.state !== 'current') throw new Error(`${entry.name} is not current; every release-group package must be current.`);
  const path = entry.directory === '.' ? 'package.json' : `${entry.directory}/package.json`;
  const manifest = await readJson(path);
  manifests.push({ entry, manifest, path });
}

const versionsInUse = new Set(manifests.map(({ manifest }) => manifest.version));
if (versionsInUse.size !== 1) throw new Error(`Release-group versions are not lockstep: ${[...versionsInUse].join(', ')}.`);
const currentVersion = [...versionsInUse][0];
if (!stableVersion(currentVersion) && currentVersion !== '0.0.0') throw new Error(`Unsupported release-group version ${currentVersion}.`);

for (const { entry, manifest, path } of manifests) {
  if (manifest.name !== entry.name) throw new Error(`${path} names ${manifest.name}; expected ${entry.name}.`);
  if (manifest.publishConfig?.access !== 'public' || manifest.publishConfig?.provenance !== true) {
    throw new Error(`${entry.name} must publish publicly with npm provenance.`);
  }
  if (manifest.license !== 'MIT') throw new Error(`${entry.name} must declare MIT.`);
  for (const required of ['dist', 'README.md', 'LICENSE', 'CHANGELOG.md']) {
    if (!manifest.files?.includes(required)) throw new Error(`${entry.name} files must include ${required}.`);
  }
  for (const field of ['dependencies', 'peerDependencies']) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) {
      if (officialNames.has(name) && version !== currentVersion) {
        throw new Error(`${entry.name} ${field}.${name} must equal lockstep version ${currentVersion}; found ${version}.`);
      }
    }
  }
  const lockEntry = lockfile.packages[entry.directory === '.' ? '' : entry.directory];
  if (!lockEntry || lockEntry.version !== currentVersion) {
    throw new Error(`package-lock.json does not record ${entry.name}@${currentVersion}.`);
  }
}

if (versions.latest !== currentVersion || !versions.supported.includes(currentVersion)) {
  throw new Error(`Documentation latest/supported versions must include the lockstep package version ${currentVersion}.`);
}
await access(resolve(root, 'docs-site/content', currentVersion));

const privateValues = new Set(manifests.map(({ manifest }) => manifest.private));
if (privateValues.size !== 1 || ![true, false].includes([...privateValues][0])) {
  throw new Error('Every release-group manifest must use one explicit private boolean.');
}
const packagesPrivate = [...privateValues][0];

if (candidateVersion) await validateCandidate(candidateVersion);
else validateDevelopmentState();

validateWorkflow();

const result = {
  schemaVersion: 1,
  releaseGroup: releaseContract.releaseGroup,
  packageCount: manifests.length,
  version: currentVersion,
  candidate: candidateVersion ?? null,
  packagesPrivate,
  bootstrap: releaseContract.bootstrap,
  npmOwnerRecovery: releaseContract.npmOwnerRecovery,
  githubReleaseEnvironment: releaseContract.githubReleaseEnvironment,
  githubReleaseTagProtection: releaseContract.githubReleaseTagProtection,
  supportBoundary: releaseContract.supportBoundary,
  publicationState: packageContract.registry.publicationState,
  scopeControl: packageContract.registry.scopeControl,
  externalPrerequisites: releaseContract.externalPrerequisites,
  valid: true,
};

if (jsonOutput) console.log(JSON.stringify(result, null, 2));
else console.log(`release contract valid: ${manifests.length} packages at ${currentVersion}; publication ${packageContract.registry.publicationState}`);

function validateReleaseContract() {
  validateJsonSchema('release/release-contract.json', releaseContract, validateReleaseContractSchema);
  if (releaseContract.schemaVersion !== 1 || releaseContract.releaseGroup !== packageContract.releaseGroup) {
    throw new Error('Release and package contracts must describe the same version-1 release group.');
  }
  if (!stableVersion(releaseContract.targetVersion)) throw new Error('Release target must be a stable semantic version.');
  if (releaseContract.tagPrefix !== 'v' || releaseContract.environment !== 'npm') {
    throw new Error('Release contract must use v-prefixed tags and the protected npm environment.');
  }
  if (releaseContract.publication?.identity !== 'npm-trusted-publishing' || releaseContract.publication?.longLivedTokenAllowed !== false) {
    throw new Error('Release publication must use npm trusted publishing without long-lived tokens.');
  }
  if (releaseContract.publication?.stagingDistTagPrefix !== 'gluon-staging-v'
    || releaseContract.publication?.promotion !== 'interactive-2fa') {
    throw new Error('Release publication must stage under a non-latest dist-tag and require interactive 2FA promotion.');
  }
  const expectedNpmOwnerRecovery = {
    model: 'single-owner',
    owner: 'marcmalerei',
    secondOwnerRequired: false,
    mfaMode: 'auth-and-writes',
    linkedGitHubAccountRequired: true,
    recoveryCodesRequired: true,
    recoveryCodeStorage: 'outside-second-factor-device',
    npmSupportRecoveryRiskAccepted: true,
  };
  if (Object.entries(expectedNpmOwnerRecovery)
    .some(([field, expected]) => releaseContract.npmOwnerRecovery?.[field] !== expected)) {
    throw new Error('npm owner recovery must use the accepted single-owner, auth-and-writes MFA, linked-GitHub, separately stored recovery-code policy.');
  }
  const expectedGithubReleaseEnvironment = {
    name: 'npm',
    approvalModel: 'single-operator',
    requiredReviewers: 0,
    independentHumanApprovalRequired: false,
    selfReviewPreventionRequired: false,
    waitTimerMinutes: 0,
    administratorBypassAllowed: false,
    deploymentBranchPatterns: [],
    deploymentTagPatterns: ['v*'],
    longLivedNpmSecretsAllowed: false,
    singleOperatorImmutableStagingRiskAccepted: true,
  };
  if (Object.entries(expectedGithubReleaseEnvironment).some(([field, expected]) => {
    const actual = releaseContract.githubReleaseEnvironment?.[field];
    return Array.isArray(expected) ? JSON.stringify(actual) !== JSON.stringify(expected) : actual !== expected;
  })) {
    throw new Error('GitHub release publication must use the accepted no-reviewer single-operator npm environment policy.');
  }
  const expectedGithubReleaseTagProtection = {
    model: 'operator-created-immutable-tags',
    operator: 'marcmalerei',
    includePatterns: ['refs/tags/v*'],
    creationBypassActorType: 'User',
    creationBypassMode: 'always',
    updateBypassAllowed: false,
    deletionBypassAllowed: false,
  };
  if (Object.entries(expectedGithubReleaseTagProtection).some(([field, expected]) => {
    const actual = releaseContract.githubReleaseTagProtection?.[field];
    return Array.isArray(expected) ? JSON.stringify(actual) !== JSON.stringify(expected) : actual !== expected;
  })) {
    throw new Error('GitHub release tags must be operator-created and immutable without update or deletion bypass.');
  }
  const expectedSupportBoundary = {
    model: 'automated-engine-evidence-only',
    brandedBrowserSupportClaimed: false,
    operatingSystemSupportClaimed: false,
    deviceSupportClaimed: false,
    assistiveTechnologySupportClaimed: false,
    manualBrowserDeviceEvidenceRequired: false,
    manualAssistiveTechnologyEvidenceRequired: false,
    singleOperatorRiskAccepted: true,
  };
  if (Object.entries(expectedSupportBoundary)
    .some(([field, expected]) => releaseContract.supportBoundary?.[field] !== expected)) {
    throw new Error('Release support must remain limited to automated engine evidence without branded browser, platform, device, or assistive-technology claims.');
  }
  if (!prereleaseVersion(releaseContract.bootstrap?.version)
    || releaseContract.bootstrap.version === releaseContract.targetVersion
    || releaseContract.bootstrap.distTag === releaseContract.publication.distTag
    || releaseContract.bootstrap.latestPolicy !== 'absent-or-reviewed-bootstrap-until-first-supported-release'
    || releaseContract.bootstrap.identity !== 'owner-interactive-2fa') {
    throw new Error('npm bootstrap must use a distinct prerelease, a non-latest reviewed dist-tag, the temporary bootstrap latest policy, and owner-controlled interactive 2FA.');
  }
  if (!releaseContract.bootstrap.supersededRecords.every((entry) => packageContract.packages.some(({ name }) => name === entry.name)
    && entry.version !== releaseContract.bootstrap.version
    && entry.integrity.startsWith('sha512-')
    && /^[a-f0-9]{40}$/.test(entry.shasum))) {
    throw new Error('Superseded npm bootstrap records must identify an official package, a distinct version, and exact registry digests.');
  }
  if (JSON.stringify(releaseContract.bootstrap.packageFiles) !== JSON.stringify(['package.json', 'README.md', 'LICENSE'])) {
    throw new Error('npm bootstrap archives must contain only package.json, README.md, and LICENSE.');
  }
  if (!releaseContract.spdxSchema.source.includes(`/${releaseContract.spdxSchema.sourceCommit}/`)) {
    throw new Error('SPDX schema source URL must pin the declared source commit.');
  }
  if (spdxSchemaDigest !== releaseContract.spdxSchema.sha256) {
    throw new Error(`${releaseContract.spdxSchema.path} SHA-256 does not match the pinned release contract.`);
  }
  for (const format of ['spdx-2.3', 'cyclonedx-1.7']) {
    if (!releaseContract.artifacts?.aggregateSbomFormats?.includes(format)
      || !releaseContract.artifacts?.perPackageSbomFormats?.includes(format)) {
      throw new Error(`Release contract must require aggregate and per-package ${format} SBOMs.`);
    }
  }
  if (!releaseContract.externalPrerequisites.includes('existing-npm-package-records')) {
    throw new Error('Release contract must record the npm package-existence prerequisite for trusted publishing.');
  }
  if (!releaseContract.externalPrerequisites.includes('npm-single-owner-recovery-and-mfa')
    || releaseContract.externalPrerequisites.includes('npm-recovery-owners-and-mfa')) {
    throw new Error('Release contract must record the accepted single-owner npm recovery and MFA prerequisite.');
  }
  if (!releaseContract.externalPrerequisites.includes('verified-single-operator-npm-environment')
    || releaseContract.externalPrerequisites.includes('protected-npm-environment')) {
    throw new Error('Release contract must record the accepted single-operator GitHub npm environment prerequisite.');
  }
  for (const superseded of ['release-cut-browser-device-evidence', 'release-cut-assistive-technology-evidence']) {
    if (releaseContract.externalPrerequisites.includes(superseded)) {
      throw new Error(`Release contract must not retain superseded manual evidence prerequisite ${superseded}.`);
    }
  }
}

function validateEvidenceSchemaBoundary() {
  const automatedQualityRun = {
    url: 'https://github.com/marcmalerei/gluon/actions/runs/1',
    conclusion: 'success',
  };
  const releaseCutEvidenceFixture = {
    schemaVersion: 1,
    releaseVersion: releaseContract.targetVersion,
    testedCommit: '0'.repeat(40),
    cutAt: '2026-07-13T00:00:00.000Z',
    automatedQualityRun,
    supportBoundary: releaseContract.supportBoundary,
    acceptedBy: releaseContract.npmOwnerRecovery.owner,
    acceptedAt: '2026-07-13T00:00:00.000Z',
  };
  validateJsonSchema('release-cut evidence schema fixture', releaseCutEvidenceFixture, validateReleaseCutEvidenceSchema);
  for (const forbidden of ['browserDeviceRows', 'assistiveTechnologyRows', 'approvedBy', 'approvedAt']) {
    if (validateReleaseCutEvidenceSchema({ ...releaseCutEvidenceFixture, [forbidden]: [] })) {
      throw new Error(`Release-cut evidence schema must reject superseded manual field ${forbidden}.`);
    }
  }

  const evidence = ['https://github.com/marcmalerei/gluon/actions/runs/1'];
  const compatibilityFixture = {
    schemaVersion: 1,
    releaseVersion: releaseContract.targetVersion,
    sourceCommit: releaseCutEvidenceFixture.testedCommit,
    cutAt: releaseCutEvidenceFixture.cutAt,
    automatedQualityRun,
    supportBoundary: {
      model: 'playwright-engine-and-node-evidence',
      brandedProductSupportClaimed: false,
    },
    engineTargets: [
      ['playwright-chromium', 'Chromium', 'Blink'],
      ['playwright-firefox', 'Firefox', 'Gecko'],
      ['playwright-webkit', 'WebKit', 'WebKit'],
    ].map(([id, browserBinary, engine]) => ({
      id,
      browserBinary,
      browserVersion: '1.0.0',
      engine,
      engineVersion: '1.0.0',
      runner: 'automated-fixture',
      mode: 'headless-automated',
      evidence,
      outcome: 'pass',
    })),
    nodeTargets: [
      { id: 'node-22-lts', version: '22.12.0', releaseStatus: 'maintenance-lts', evidence, outcome: 'pass' },
      { id: 'node-24-lts', version: '24.0.0', releaseStatus: 'active-lts', evidence, outcome: 'pass' },
    ],
    surfaces: ['client-rendering', 'server-rendering', 'streaming', 'hydration', 'static-generation']
      .map((id) => ({ id, evidence, outcome: 'pass' })),
  };
  validateJsonSchema('compatibility manifest schema fixture', compatibilityFixture, validateCompatibilityManifestSchema);
  if (validateCompatibilityManifestSchema({ ...compatibilityFixture, browserTargets: [] })) {
    throw new Error('Compatibility manifest schema must reject superseded branded browser targets.');
  }
}

function validateDevelopmentState() {
  if (packageContract.registry.publicationState === 'blocked') {
    if (!packagesPrivate) throw new Error('Blocked packages must remain private until the release-cut PR.');
    if (packageContract.registry.scopeControl !== 'unverified') {
      throw new Error('Blocked publication must not claim verified scope control.');
    }
    if (!rootChangelog.includes('## [Unreleased]')) throw new Error('Blocked development state requires an Unreleased changelog section.');
    return;
  }
  if (packageContract.registry.publicationState !== 'ready') {
    throw new Error(`Unknown publication state ${packageContract.registry.publicationState}.`);
  }
}

async function validateCandidate(version) {
  if (!stableVersion(version)) throw new Error(`Release candidate ${version} is not a stable semantic version.`);
  if (version !== releaseContract.targetVersion) throw new Error(`Release candidate ${version} does not match contracted target ${releaseContract.targetVersion}.`);
  if (currentVersion !== version) throw new Error(`Release candidate ${version} does not match package version ${currentVersion}.`);
  if (packagesPrivate) throw new Error('Release-candidate packages must set private to false.');
  if (packageContract.registry.publicationState !== 'ready' || packageContract.registry.scopeControl !== 'verified') {
    throw new Error('Release candidate requires ready publication state and verified npm scope control.');
  }
  if (!new RegExp(`^## \\[${escapeRegExp(version)}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm').test(rootChangelog)) {
    throw new Error(`Root changelog has no dated ${version} release section.`);
  }
  for (const { entry } of manifests) {
    const changelog = await readFile(resolve(root, entry.directory, 'CHANGELOG.md'), 'utf8');
    if (!new RegExp(`^## \\[${escapeRegExp(version)}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm').test(changelog)) {
      throw new Error(`${entry.name} changelog has no dated ${version} release section.`);
    }
  }
  await validateReleaseCutEvidence(version);
  await validateCompatibilityManifest(version);
}

async function validateReleaseCutEvidence(version) {
  const path = releaseContract.releaseCutEvidencePath.replace('{version}', version);
  const evidence = await readJson(path);
  validateJsonSchema(path, evidence, validateReleaseCutEvidenceSchema);
  if (evidence.schemaVersion !== 1 || evidence.releaseVersion !== version) {
    throw new Error(`${path} does not describe release ${version}.`);
  }
  if (!/^[a-f0-9]{40}$/.test(evidence.testedCommit ?? '')) throw new Error(`${path} requires an exact tested commit.`);
  for (const field of ['cutAt', 'acceptedAt']) {
    if (!Number.isFinite(Date.parse(evidence[field]))) throw new Error(`${path} has invalid ${field}.`);
  }
  if (evidence.automatedQualityRun?.conclusion !== 'success'
    || !/^https:\/\/github\.com\/marcmalerei\/gluon\/actions\/runs\/\d+$/.test(evidence.automatedQualityRun?.url ?? '')) {
    throw new Error(`${path} requires a successful Quality Gates run URL.`);
  }
  if (Object.entries(releaseContract.supportBoundary)
    .some(([field, expected]) => evidence.supportBoundary?.[field] !== expected)
    || evidence.acceptedBy !== releaseContract.npmOwnerRecovery.owner) {
    throw new Error(`${path} must record the contracted automated-only support boundary and sole operator acceptance.`);
  }
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', evidence.testedCommit, 'HEAD'], { cwd: root, stdio: 'ignore' });
  } catch {
    throw new Error(`${path} tested commit is not an ancestor of the candidate commit.`);
  }
  const compatibilityPath = releaseContract.compatibilityManifestPath.replace('{version}', version);
  const permittedEvidenceChanges = new Set([path, compatibilityPath]);
  const changedAfterTesting = execFileSync('git', ['diff', '--name-only', evidence.testedCommit, 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim().split('\n').filter(Boolean);
  if (changedAfterTesting.some((changed) => !permittedEvidenceChanges.has(changed))) {
    throw new Error(`${path} tested commit is stale; changed after testing: ${changedAfterTesting.filter((changed) => !permittedEvidenceChanges.has(changed)).join(', ')}.`);
  }
}

async function validateCompatibilityManifest(version) {
  const path = releaseContract.compatibilityManifestPath.replace('{version}', version);
  const manifest = await readJson(path);
  validateJsonSchema(path, manifest, validateCompatibilityManifestSchema);
  const evidencePath = releaseContract.releaseCutEvidencePath.replace('{version}', version);
  const releaseCutEvidence = await readJson(evidencePath);
  if (manifest.releaseVersion !== version || manifest.sourceCommit !== releaseCutEvidence.testedCommit) {
    throw new Error(`${path} must describe release ${version} and the automated release-cut commit.`);
  }
  if (manifest.automatedQualityRun.url !== releaseCutEvidence.automatedQualityRun.url
    || manifest.automatedQualityRun.conclusion !== 'success') {
    throw new Error(`${path} must reference the release-cut Quality Gates run.`);
  }
  if (manifest.supportBoundary?.model !== 'playwright-engine-and-node-evidence'
    || manifest.supportBoundary?.brandedProductSupportClaimed !== false) {
    throw new Error(`${path} must reject branded-product compatibility claims.`);
  }
  requireUniqueIds(path, 'engineTargets', manifest.engineTargets, [
    'playwright-chromium',
    'playwright-firefox',
    'playwright-webkit',
  ]);
  requireUniqueIds(path, 'nodeTargets', manifest.nodeTargets, ['node-22-lts', 'node-24-lts']);
  requireUniqueIds(path, 'surfaces', manifest.surfaces, [
    'client-rendering',
    'server-rendering',
    'streaming',
    'hydration',
    'static-generation',
  ]);
}

function requireUniqueIds(path, field, rows, requiredIds) {
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) throw new Error(`${path} ${field} IDs must be unique.`);
  for (const id of requiredIds) if (!ids.has(id)) throw new Error(`${path} ${field} is missing ${id}.`);
}

function validateJsonSchema(path, value, validator) {
  if (validator(value)) return;
  const errors = validator.errors?.map((entry) => `${entry.instancePath || '/'} ${entry.message}`).join('; ');
  throw new Error(`${path} failed schema validation: ${errors}.`);
}

function validateWorkflow() {
  for (const required of [
    'environment: npm',
    'id-token: write',
    'actions/attest-build-provenance@977bb373ede98d70efdf65b84cb5f73e068dcc2a # v3',
    'release:publish',
    'inputs.phase == \'finalize\'',
    'gh release create',
    '--draft',
    'gh release edit',
  ]) if (!workflow.includes(required)) throw new Error(`Release workflow is missing ${required}.`);
  for (const required of ["'publish'", "'--provenance'", "'--access', 'public'", "'--tag', stagingTag", 'requireExistingPackage']) {
    if (!publishScript.includes(required)) throw new Error(`Release publisher is missing ${required}.`);
  }
  if (!publishScript.includes('releaseContract.bootstrap.version')) {
    throw new Error('Release publisher must verify the exact contracted bootstrap package record.');
  }
  for (const [name, command] of Object.entries({
    'release:bootstrap:artifacts': 'node scripts/build-npm-bootstrap-artifacts.mjs',
    'release:bootstrap:publish': 'node scripts/publish-npm-bootstrap.mjs --directory .tmp/npm-bootstrap',
    'check:release-bootstrap': 'node scripts/build-npm-bootstrap-artifacts.mjs --check',
  })) {
    if (rootManifest.scripts?.[name] !== command) throw new Error(`package.json must define ${name} as ${command}.`);
  }
  for (const required of ['bootstrap.packageFiles', 'publishConfig', "'README.md'", "'LICENSE'"]) {
    if (!bootstrapBuildScript.includes(required)) throw new Error(`npm bootstrap builder is missing ${required}.`);
  }
  for (const required of [
    'confirm-owner-controlled-bootstrap',
    'NPM_TOKEN',
    'NODE_AUTH_TOKEN',
    "'--tag', bootstrap.distTag",
    'bootstrap.supersededRecords',
    'waiting for npm registry visibility',
    'requireCleanMain',
    'requireNpmOwner',
    'reproduceArtifacts',
  ]) if (!bootstrapPublishScript.includes(required)) throw new Error(`npm bootstrap publisher is missing ${required}.`);
  for (const match of workflow.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g)) {
    if (!/^[a-f0-9]{40}$/.test(match[1])) {
      throw new Error(`Release workflow action ref ${match[1]} is not an immutable commit SHA.`);
    }
  }
  if (!hostingScript.includes('immutable-releases') || !hostingScript.includes("!== 'public'")) {
    throw new Error('Release hosting verification must require public, immutable GitHub releases.');
  }
  for (const required of [
    "rule.type === 'required_reviewers'",
    "rule.type === 'wait_timer'",
    'environment.can_admins_bypass !== false',
    'deploymentPolicies.branch_policies.length !== 1',
    "deploymentPolicies.branch_policies[0].name !== 'v*'",
    "ruleTypes.has('creation')",
    "ruleTypes.has('update')",
    "ruleTypes.has('deletion')",
    'bypassActors.length === 0',
    'releaseCutEvidence.supportBoundary',
    'releaseCutEvidence.acceptedBy',
  ]) if (!hostingScript.includes(required)) {
    throw new Error(`Release hosting verification is missing single-operator environment control ${required}.`);
  }
  for (const required of ['releaseCutEvidencePath', "'release-cut-evidence.json'", "'compatibility-manifest.json'"]) {
    if (!artifactBuildScript.includes(required)) throw new Error(`Release artifact builder must retain ${required}.`);
  }
  if (artifactBuildScript.includes('manualEvidencePath') || artifactBuildScript.includes('manual-release-evidence.json')) {
    throw new Error('Release artifact builder must not retain the superseded manual evidence contract.');
  }
  for (const required of ['release-cut-evidence.json', 'compatibility-manifest.json']) {
    if (!workflow.includes(required)) throw new Error(`Release workflow must retain ${required}.`);
  }
  if (workflow.includes('manual-release-evidence.json')) {
    throw new Error('Release workflow must not retain the superseded manual-release-evidence asset.');
  }
  if (hostingScript.includes('requires named reviewers')) {
    throw new Error('Release hosting verification must not retain the superseded second-person reviewer requirement.');
  }
  for (const forbidden of ['NPM_TOKEN', 'NODE_AUTH_TOKEN']) {
    if (workflow.includes(forbidden)) throw new Error(`Release workflow must not reference long-lived ${forbidden}.`);
  }
}

function stableVersion(value) {
  return /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(value);
}

function prereleaseVersion(value) {
  return /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*$/.test(value ?? '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
