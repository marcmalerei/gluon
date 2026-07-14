import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';
import process from 'node:process';
import Ajv from 'ajv';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const packageContract = await readJson('package-contract.json');
const releaseContract = await readJson('release/release-contract.json');
const lockfile = await readJson('package-lock.json');
const spdxSchemaSource = await readFile(resolve(root, releaseContract.spdxSchema.path));
if (sha256(spdxSchemaSource) !== releaseContract.spdxSchema.sha256) {
  throw new Error(`${releaseContract.spdxSchema.path} SHA-256 does not match the pinned release contract.`);
}
const spdxSchema = JSON.parse(spdxSchemaSource);
const validateSpdxSchema = new Ajv({ allErrors: true, strict: false }).compile(spdxSchema);
const rootManifest = await readJson('package.json');
const manifestsByName = new Map();
for (const entry of packageContract.packages) {
  const path = resolve(root, entry.directory, 'package.json');
  manifestsByName.set(entry.name, JSON.parse(await readFile(path, 'utf8')));
}
const version = option('--version') ?? rootManifest.version;
const output = resolve(root, option('--output') ?? releaseContract.artifactDirectory);
const checkState = process.argv.includes('--check-state');
const releaseCutEvidencePath = releaseContract.releaseCutEvidencePath.replace('{version}', version);
const compatibilityManifestPath = releaseContract.compatibilityManifestPath.replace('{version}', version);
const releaseCutEvidenceExists = await fileExists(releaseCutEvidencePath);
const compatibilityManifestExists = await fileExists(compatibilityManifestPath);
if (releaseCutEvidenceExists !== compatibilityManifestExists) {
  throw new Error('Release-cut evidence and the compatibility manifest must be added together.');
}
const evidencePendingCandidate = checkState
  && packageContract.registry.publicationState === 'ready'
  && !releaseCutEvidenceExists;
const postReleaseDevelopment = checkState
  && packageContract.registry.publicationState === 'released';
const nonPublishableBuild = process.argv.includes('--allow-blocked')
  || (checkState && packageContract.registry.publicationState === 'blocked')
  || evidencePendingCandidate
  || postReleaseDevelopment;
const allowedArguments = new Set(['--version', version, '--output', option('--output'), '--allow-blocked', '--check-state']);

if (process.argv.slice(2).some((argument) => argument !== undefined && !allowedArguments.has(argument))) {
  throw new Error('Usage: node scripts/build-release-artifacts.mjs [--version <version>] [--output <directory>] [--allow-blocked | --check-state]');
}
if (process.argv.includes('--allow-blocked') && checkState) throw new Error('Choose --allow-blocked or --check-state, not both.');
if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(version)) {
  throw new Error(`Invalid stable release version ${version}.`);
}
if (evidencePendingCandidate || postReleaseDevelopment) {
  if (version !== rootManifest.version) throw new Error('Repository-state artifact checks require the current package version.');
  await execFile(process.execPath, ['scripts/validate-release-contract.mjs'], { cwd: root });
} else if (nonPublishableBuild) {
  if (packageContract.registry.publicationState !== 'blocked' || version !== rootManifest.version) {
    throw new Error('Blocked artifact mode is only available for the current blocked development version.');
  }
} else {
  await execFile(process.execPath, ['scripts/validate-release-contract.mjs', '--candidate', version], { cwd: root });
}

let sourceDateEpoch = Number(process.env.SOURCE_DATE_EPOCH || 0);
const sourceCommit = (await run('git', ['rev-parse', 'HEAD'])).trim();
const sourceTreeClean = !(await run('git', ['status', '--porcelain'])).trim();
if (!nonPublishableBuild && !sourceTreeClean) throw new Error('Release artifacts require a clean source tree.');
sourceDateEpoch ||= Number((await run('git', ['show', '-s', '--format=%ct', 'HEAD'])).trim());
if (!Number.isSafeInteger(sourceDateEpoch) || sourceDateEpoch <= 0) throw new Error('SOURCE_DATE_EPOCH must be a positive integer.');
const created = new Date(sourceDateEpoch * 1000).toISOString();
const packageOutput = resolve(output, 'packages');
const sbomOutput = resolve(output, 'sbom');
const reproductionOutput = resolve(root, '.tmp/release-reproduction');

await rm(output, { recursive: true, force: true });
await rm(reproductionOutput, { recursive: true, force: true });
await mkdir(packageOutput, { recursive: true });
await mkdir(sbomOutput, { recursive: true });
await mkdir(reproductionOutput, { recursive: true });

const packageResults = [];
for (const entry of packageContract.packages) {
  const directory = resolve(root, entry.directory);
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  if (manifest.version !== version) throw new Error(`${entry.name} is ${manifest.version}; expected ${version}.`);

  const first = await pack(directory, packageOutput);
  const second = await pack(directory, reproductionOutput);
  const firstDigest = await canonicalPackageDigest(resolve(packageOutput, first.filename), first.files);
  const secondDigest = await canonicalPackageDigest(resolve(reproductionOutput, second.filename), second.files);
  if (firstDigest.digest !== secondDigest.digest || JSON.stringify(firstDigest.files) !== JSON.stringify(secondDigest.files)) {
    throw new Error(`${entry.name} canonical package contents are not reproducible.`);
  }

  packageResults.push({
    name: entry.name,
    version,
    filename: first.filename,
    size: first.size,
    unpackedSize: first.unpackedSize,
    integrity: first.integrity,
    shasum: first.shasum,
    canonicalSha256: firstDigest.digest,
    fileCount: firstDigest.files.length,
  });
}

const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8');
const releaseNotes = changelogSection(changelog, nonPublishableBuild && !evidencePendingCandidate ? 'Unreleased' : version);
await writeFile(resolve(output, 'CHANGELOG.md'), changelog, 'utf8');
await writeFile(resolve(output, 'RELEASE_NOTES.md'), `${releaseNotes.trim()}\n`, 'utf8');
if (!nonPublishableBuild) {
  await writeFile(resolve(output, 'release-cut-evidence.json'), await readFile(resolve(root, releaseCutEvidencePath)));
  await writeFile(resolve(output, 'compatibility-manifest.json'), await readFile(resolve(root, compatibilityManifestPath)));
}

const aggregateSpdx = JSON.parse(await run('npm', ['sbom', '--sbom-format', 'spdx']));
normalizeSpdx(aggregateSpdx, '@gluonjs/core', version, created, sourceCommit);
validateSpdx(aggregateSpdx, 'aggregate');
await writeJson(resolve(sbomOutput, 'gluon-framework.spdx.json'), aggregateSpdx);

const aggregateCyclonePath = resolve(sbomOutput, 'gluon-framework.cdx.json');
await run(resolve(root, 'node_modules/.bin/cdxgen'), [
  '-t', 'js',
  '--no-install-deps',
  '--no-babel',
  '--fail-on-error',
  '--spec-version', '1.7',
  '--project-name', '@gluonjs/core',
  '--project-version', version,
  '--output', aggregateCyclonePath,
  '.',
]);
const aggregateCyclone = JSON.parse(await readFile(aggregateCyclonePath, 'utf8'));
normalizeCycloneDx(aggregateCyclone, '@gluonjs/core', version, created, sourceCommit);
await writeJson(aggregateCyclonePath, aggregateCyclone);

for (const entry of packageContract.packages) {
  const safeName = fileSafe(entry.name);
  const spdx = packageSpdx(aggregateSpdx, entry.name, version, created, sourceCommit);
  const cyclone = packageCycloneDx(aggregateCyclone, entry.name, version, created, sourceCommit);
  validateSpdx(spdx, entry.name);
  await writeJson(resolve(sbomOutput, `${safeName}.spdx.json`), spdx);
  await writeJson(resolve(sbomOutput, `${safeName}.cdx.json`), cyclone);
}

for (const path of (await allFiles(sbomOutput)).filter((path) => path.endsWith('.cdx.json'))) {
  await run(resolve(root, 'node_modules/.bin/cdx-validate'), [
    '--input', path,
    '--schema',
    '--deep',
    '--strict',
    '--no-include-manual',
    '--fail-severity', 'critical',
  ]);
}

const lockfileSha256 = sha256(await readFile(resolve(root, 'package-lock.json')));
const evidence = {
  schemaVersion: 1,
  releaseGroup: releaseContract.releaseGroup,
  version,
  tag: `${releaseContract.tagPrefix}${version}`,
  sourceCommit,
  sourceTreeClean,
  sourceDateEpoch,
  created,
  blockedDevelopmentBuild: nonPublishableBuild,
  runtime: {
    node: process.version,
    npm: (await run('npm', ['--version'])).trim(),
    cdxgen: (await run(resolve(root, 'node_modules/.bin/cdxgen'), ['--version'])).trim(),
  },
  lockfileSha256,
  spdxSchema: releaseContract.spdxSchema,
  packages: packageResults,
  sboms: {
    aggregate: ['sbom/gluon-framework.spdx.json', 'sbom/gluon-framework.cdx.json'],
    perPackage: packageContract.packages.flatMap((entry) => [
      `sbom/${fileSafe(entry.name)}.spdx.json`,
      `sbom/${fileSafe(entry.name)}.cdx.json`,
    ]),
  },
  releaseCutEvidence: nonPublishableBuild ? null : 'release-cut-evidence.json',
  compatibilityManifest: nonPublishableBuild ? null : 'compatibility-manifest.json',
};
await writeJson(resolve(output, 'release-evidence.json'), evidence);

const assets = await allFiles(output);
const checksumLines = [];
for (const path of assets.filter((path) => basename(path) !== 'SHA256SUMS')) {
  const relative = path.slice(output.length + 1);
  checksumLines.push(`${sha256(await readFile(path))}  ${relative}`);
}
await writeFile(resolve(output, 'SHA256SUMS'), `${checksumLines.sort().join('\n')}\n`, 'utf8');
await rm(reproductionOutput, { recursive: true, force: true });

console.log(`release artifacts built: ${packageResults.length} packages, ${packageResults.length * 2 + 2} schema-valid SBOMs at ${output}`);

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function pack(directory, destination) {
  const output = await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination], { cwd: directory });
  const [result] = JSON.parse(output);
  if (!result?.filename || !Array.isArray(result.files)) throw new Error(`npm pack returned invalid output for ${directory}.`);
  return result;
}

async function canonicalPackageDigest(archive, files) {
  const entries = [];
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const { stdout } = await execFile('tar', ['-xOf', archive, `package/${file.path}`], {
      cwd: root,
      encoding: null,
      maxBuffer: 20 * 1024 * 1024,
    });
    entries.push({ path: file.path, sha256: sha256(stdout) });
  }
  const digest = sha256(Buffer.from(entries.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('')));
  return { digest, files: entries };
}

function normalizeSpdx(document, packageName, packageVersion, timestamp, commit) {
  document.name = `${packageName}@${packageVersion}`;
  document.documentNamespace = `https://github.com/marcmalerei/gluon/releases/tag/v${packageVersion}/spdx/${fileSafe(packageName)}-${commit}`;
  document.creationInfo.created = timestamp;
}

function packageSpdx(aggregate, packageName, packageVersion, timestamp, commit) {
  const target = aggregate.packages.find((entry) => entry.name === packageName && entry.versionInfo === packageVersion);
  if (!target) throw new Error(`Aggregate SPDX SBOM is missing ${packageName}@${packageVersion}.`);
  const packageById = new Map(aggregate.packages.map((entry) => [entry.SPDXID, entry]));
  const dependencies = (id) => {
    const entry = packageById.get(id);
    if (entry && manifestsByName.has(entry.name)) return manifestDependencySpdxRefs(entry.name, aggregate);
    return aggregate.relationships
      .filter((relationship) => relationship.relationshipType === 'DEPENDENCY_OF' && relationship.relatedSpdxElement === id)
      .map((relationship) => relationship.spdxElementId);
  };
  const included = dependencyClosure(target.SPDXID, dependencies);
  const document = structuredClone(aggregate);
  document.name = `${packageName}@${packageVersion}`;
  document.documentNamespace = `https://github.com/marcmalerei/gluon/releases/tag/v${packageVersion}/spdx/${fileSafe(packageName)}-${commit}`;
  document.creationInfo.created = timestamp;
  document.documentDescribes = [target.SPDXID];
  document.packages = aggregate.packages.filter((entry) => included.has(entry.SPDXID));
  document.relationships = [
    { spdxElementId: 'SPDXRef-DOCUMENT', relatedSpdxElement: target.SPDXID, relationshipType: 'DESCRIBES' },
    ...[...included].flatMap((dependent) => dependencies(dependent)
      .filter((dependency) => included.has(dependency))
      .map((dependency) => ({
        spdxElementId: dependency,
        relatedSpdxElement: dependent,
        relationshipType: 'DEPENDENCY_OF',
      }))),
  ];
  return document;
}

function normalizeCycloneDx(document, packageName, packageVersion, timestamp, commit) {
  document.serialNumber = deterministicUrn(`${packageName}@${packageVersion}:${commit}:aggregate`);
  document.metadata ??= {};
  document.metadata.timestamp = timestamp;
  document.metadata.component = componentFor(packageName, packageVersion, document.metadata.component);
  for (const entry of packageContract.packages) {
    const targetRef = cycloneRef(entry.name, packageVersion);
    const declaredDependencies = manifestCycloneDependencies(entry.name, packageVersion);
    const existing = document.dependencies?.find((dependency) => dependency.ref === targetRef);
    if (existing) existing.dependsOn = declaredDependencies;
    else (document.dependencies ??= []).push({ ref: targetRef, dependsOn: declaredDependencies });
  }
  document.dependencies.sort((a, b) => a.ref.localeCompare(b.ref));
  replaceLocalRoot(document);
}

function packageCycloneDx(aggregate, packageName, packageVersion, timestamp, commit) {
  const expectedRef = cycloneRef(packageName, packageVersion);
  const target = packageName === '@gluonjs/core'
    ? componentFor(packageName, packageVersion, aggregate.metadata.component)
    : aggregate.components.find((component) => component['bom-ref'] === expectedRef);
  if (!target) throw new Error(`Aggregate CycloneDX SBOM is missing ${packageName}@${packageVersion}.`);
  const dependencies = new Map(aggregate.dependencies.map((entry) => [entry.ref, entry.dependsOn ?? []]));
  const included = dependencyClosure(expectedRef, (id) => dependencies.get(id) ?? []);
  const componentByRef = new Map(aggregate.components.map((entry) => [entry['bom-ref'], entry]));
  componentByRef.set(aggregate.metadata.component['bom-ref'], aggregate.metadata.component);
  const document = structuredClone(aggregate);
  document.serialNumber = deterministicUrn(`${packageName}@${packageVersion}:${commit}`);
  document.metadata.timestamp = timestamp;
  document.metadata.component = componentFor(packageName, packageVersion, target);
  document.components = [...included]
    .filter((ref) => ref !== expectedRef && componentByRef.has(ref))
    .map((ref) => componentByRef.get(ref))
    .sort((a, b) => a['bom-ref'].localeCompare(b['bom-ref']));
  document.dependencies = [...included]
    .map((ref) => ({ ref, dependsOn: (dependencies.get(ref) ?? []).filter((dependency) => included.has(dependency)).sort() }))
    .sort((a, b) => a.ref.localeCompare(b.ref));
  return document;
}

function componentFor(packageName, packageVersion, source = {}) {
  const scoped = packageName.startsWith('@gluonjs/');
  const name = scoped ? packageName.slice('@gluonjs/'.length) : packageName;
  const ref = cycloneRef(packageName, packageVersion);
  return {
    ...structuredClone(source),
    group: scoped ? '@gluonjs' : '',
    name,
    version: packageVersion,
    type: packageName === 'create-gluon' ? 'application' : 'library',
    purl: scoped ? `pkg:npm/%40gluonjs/${name}@${packageVersion}` : `pkg:npm/${name}@${packageVersion}`,
    'bom-ref': ref,
  };
}

function manifestCycloneDependencies(packageName, packageVersion) {
  const manifest = manifestsByName.get(packageName);
  if (!manifest) return [];
  return ['dependencies', 'peerDependencies', 'optionalDependencies']
    .flatMap((field) => Object.keys(manifest[field] ?? {}))
    .map((name) => cycloneRef(name, dependencyVersion(name, packageVersion)))
    .sort();
}

function manifestDependencySpdxRefs(packageName, aggregate) {
  const manifest = manifestsByName.get(packageName);
  if (!manifest) return [];
  return ['dependencies', 'peerDependencies', 'optionalDependencies']
    .flatMap((field) => Object.keys(manifest[field] ?? {}))
    .map((name) => {
      const installedVersion = dependencyVersion(name, version);
      const dependency = aggregate.packages.find((entry) => entry.name === name && entry.versionInfo === installedVersion);
      if (!dependency) throw new Error(`Aggregate SPDX SBOM is missing declared dependency ${name}@${installedVersion} for ${packageName}.`);
      return dependency.SPDXID;
    })
    .sort();
}

function dependencyVersion(name, packageVersion) {
  if (manifestsByName.has(name)) return packageVersion;
  const installed = lockfile.packages[`node_modules/${name}`]?.version;
  if (!installed) throw new Error(`package-lock.json has no installed version for ${name}.`);
  return installed;
}

function validateSpdx(document, label) {
  if (validateSpdxSchema(document)) return;
  const errors = validateSpdxSchema.errors?.map((entry) => `${entry.instancePath || '/'} ${entry.message}`).join('; ');
  throw new Error(`${label} SPDX 2.3 SBOM failed schema validation: ${errors}.`);
}

function dependencyClosure(start, dependencies) {
  const included = new Set();
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop();
    if (included.has(current)) continue;
    included.add(current);
    pending.push(...dependencies(current));
  }
  return included;
}

function cycloneRef(packageName, packageVersion) {
  return `pkg:npm/${packageName}@${packageVersion}`;
}

function deterministicUrn(seed) {
  const hex = sha256(Buffer.from(seed));
  const value = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return `urn:uuid:${value}`;
}

function fileSafe(name) {
  return name.replace(/^@/, '').replaceAll('/', '-');
}

function changelogSection(changelog, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^## \\[${escaped}\\](?: - \\d{4}-\\d{2}-\\d{2})?$`, 'm').exec(changelog);
  if (!match) throw new Error(`CHANGELOG.md has no ${heading} section.`);
  const tail = changelog.slice(match.index + match[0].length);
  const nextHeading = tail.search(/^## /m);
  return changelog.slice(match.index, nextHeading < 0 ? changelog.length : match.index + match[0].length + nextHeading);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function replaceLocalRoot(value) {
  if (Array.isArray(value)) {
    for (const child of value) replaceLocalRoot(child);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string') value[key] = child.replaceAll(root, '.');
    else replaceLocalRoot(child);
  }
}

async function run(command, args, options = {}) {
  const { stdout } = await execFile(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    env: sourceDateEpoch > 0 ? { ...process.env, SOURCE_DATE_EPOCH: String(sourceDateEpoch) } : process.env,
  });
  return stdout;
}

async function allFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await allFiles(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(sortObject(value), null, 2)}\n`, 'utf8');
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sortObject(child)]));
  }
  return value;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

async function fileExists(path) {
  try {
    await access(resolve(root, path));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}
