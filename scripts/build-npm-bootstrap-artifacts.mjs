import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';
import process from 'node:process';

const execFile = promisify(execFileCallback);
const root = resolve(import.meta.dirname, '..');
const packageContract = await readJson('package-contract.json');
const releaseContract = await readJson('release/release-contract.json');
const bootstrap = releaseContract.bootstrap;
const check = process.argv.includes('--check');
const requestedOutput = option('--output');
const allowed = new Set(['--check', '--output', requestedOutput]);

if (process.argv.slice(2).some((argument) => argument !== undefined && !allowed.has(argument))) {
  throw new Error('Usage: node scripts/build-npm-bootstrap-artifacts.mjs [--output <directory>] [--check]');
}

const output = resolve(root, requestedOutput ?? (check ? '.tmp/npm-bootstrap-check' : bootstrap.artifactDirectory));
const sourceOutput = resolve(output, 'sources');
const packageOutput = resolve(output, 'packages');
const expectedFiles = [...bootstrap.packageFiles].sort();
const rootManifest = await readJson('package.json');
const sourceCommit = (await run('git', ['rev-parse', 'HEAD'])).trim();

await rm(output, { recursive: true, force: true });
await mkdir(sourceOutput, { recursive: true });
await mkdir(packageOutput, { recursive: true });

const packages = [];
for (const entry of packageContract.packages) {
  const safeName = fileSafe(entry.name);
  const directory = resolve(sourceOutput, safeName);
  await mkdir(directory, { recursive: true });

  const manifest = bootstrapManifest(entry, rootManifest);
  await writeJson(resolve(directory, 'package.json'), manifest);
  await writeFile(resolve(directory, 'README.md'), bootstrapReadme(entry.name), 'utf8');
  await copyFile(resolve(root, 'LICENSE'), resolve(directory, 'LICENSE'));

  const [packed] = JSON.parse(await run('npm', [
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination', packageOutput,
  ], { cwd: directory }));
  if (!packed?.filename || !Array.isArray(packed.files)) {
    throw new Error(`npm pack returned invalid bootstrap output for ${entry.name}.`);
  }
  const actualFiles = packed.files.map(({ path }) => path).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(`${entry.name} bootstrap archive contains ${actualFiles.join(', ')}; expected ${expectedFiles.join(', ')}.`);
  }

  const archive = resolve(packageOutput, packed.filename);
  const packedManifest = JSON.parse(await run('tar', ['-xOf', archive, 'package/package.json']));
  validatePackedManifest(entry.name, packedManifest);
  packages.push({
    name: entry.name,
    version: bootstrap.version,
    filename: packed.filename,
    integrity: packed.integrity,
    shasum: packed.shasum,
    sha256: sha256(await readFile(archive)),
    files: actualFiles,
  });
}

const evidence = {
  schemaVersion: 1,
  releaseGroup: releaseContract.releaseGroup,
  sourceCommit,
  version: bootstrap.version,
  distTag: bootstrap.distTag,
  access: bootstrap.access,
  identity: bootstrap.identity,
  latestPolicy: bootstrap.latestPolicy,
  supersededRecords: bootstrap.supersededRecords,
  packages,
};
await writeJson(resolve(output, 'bootstrap-evidence.json'), evidence);

const checksumLines = [];
for (const path of await allFiles(output)) {
  if (basename(path) === 'SHA256SUMS' || path.includes(`${resolve(output, 'sources')}/`)) continue;
  checksumLines.push(`${sha256(await readFile(path))}  ${path.slice(output.length + 1)}`);
}
await writeFile(resolve(output, 'SHA256SUMS'), `${checksumLines.sort().join('\n')}\n`, 'utf8');

if (check) await rm(output, { recursive: true, force: true });
console.log(`${check ? 'validated' : 'built'} ${packages.length} minimal npm bootstrap archives at ${check ? bootstrap.artifactDirectory : output}`);

function bootstrapManifest(entry, rootPackage) {
  const repository = {
    type: 'git',
    url: rootPackage.repository.url,
    ...(entry.directory === '.' ? {} : { directory: entry.directory }),
  };
  return {
    name: entry.name,
    version: bootstrap.version,
    description: `Bootstrap package record for ${entry.name}; contains no supported Gluon implementation.`,
    private: false,
    license: 'MIT',
    repository,
    homepage: rootPackage.homepage,
    bugs: rootPackage.bugs,
    files: ['README.md', 'LICENSE'],
    publishConfig: {
      access: bootstrap.access,
      tag: bootstrap.distTag,
    },
  };
}

function bootstrapReadme(name) {
  return `# ${name}\n\nThis package version only establishes the npm package record required by Gluon's trusted-publishing release workflow.\n\nIt contains no runtime, build integration, executable, or supported public API. Do not install this bootstrap version. The first supported release is planned as \`1.0.0\`.\n\nThe reviewed bootstrap dist-tag is \`${bootstrap.distTag}\`. For a new package record, npm may also materialize a temporary \`latest\` tag that points to a reviewed bootstrap placeholder until the first supported release replaces it. Reviewed source and release evidence live at https://github.com/marcmalerei/gluon.\n`;
}

function validatePackedManifest(name, manifest) {
  if (manifest.name !== name || manifest.version !== bootstrap.version || manifest.private !== false) {
    throw new Error(`${name} bootstrap manifest does not preserve its exact public name, version, and private=false boundary.`);
  }
  if (manifest.publishConfig?.access !== bootstrap.access || manifest.publishConfig?.tag !== bootstrap.distTag) {
    throw new Error(`${name} bootstrap manifest does not preserve the contracted access and dist-tag.`);
  }
  for (const forbidden of ['main', 'module', 'types', 'exports', 'bin', 'scripts', 'dependencies', 'peerDependencies', 'optionalDependencies']) {
    if (forbidden in manifest) throw new Error(`${name} bootstrap manifest must not expose ${forbidden}.`);
  }
  if (manifest.publishConfig?.provenance !== undefined) {
    throw new Error(`${name} bootstrap manifest must not claim automated provenance.`);
  }
}

function fileSafe(name) {
  return name.replace(/^@/, '').replaceAll('/', '-');
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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

async function run(command, args, options = {}) {
  const { stdout } = await execFile(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
