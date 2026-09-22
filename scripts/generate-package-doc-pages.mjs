import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const siteRoot = resolve(root, 'docs-site');
const versions = JSON.parse(await readFile(resolve(siteRoot, 'versions.json'), 'utf8'));
const contract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const packageDocs = JSON.parse(await readFile(resolve(siteRoot, 'package-docs.json'), 'utf8'));
const packageMetadata = new Map(packageDocs.packages.map((entry) => [entry.name, entry]));
const checkOnly = process.argv.includes('--check');
const packages = contract.packages
  .filter((entry) => entry.state === 'current')
  .sort((left, right) => left.name.localeCompare(right.name));
const expected = new Map();

for (const entry of packages) {
  const readmePath = entry.directory === '.' ? 'README.md' : `${entry.directory}/README.md`;
  const manifest = JSON.parse(await readFile(resolve(root, entry.directory, 'package.json'), 'utf8'));
  const docs = packageMetadata.get(entry.name);
  if (!docs) throw new Error(`Missing package documentation metadata for ${entry.name}.`);
  const slug = packageSlug(entry.name);
  const filename = resolve(siteRoot, 'content', versions.latest, 'packages', slug, 'index.md');
  const content = [
    '---',
    `title: ${yamlString(entry.name)}`,
    `description: ${yamlString(manifest.description)}`,
    '---',
    '',
    entry.directory === '.'
      ? '<!--@include: ../../../../../README.md{1,}-->'
      : `<!--@include: ../../../../../${readmePath}{7,}-->`,
    '',
  ].join('\n');
  expected.set(filename, content);
}

const packageIndex = resolve(siteRoot, 'content', versions.latest, 'packages', 'index.md');
expected.set(packageIndex, createPackageIndex(versions.latest, packages, packageMetadata));

let mismatch = false;
for (const [filename, content] of expected) {
  if (checkOnly) {
    let actual;
    try { actual = await readFile(filename, 'utf8'); } catch { actual = undefined; }
    if (actual !== content) {
      console.error(`generated package documentation is stale: ${filename}`);
      mismatch = true;
    }
    continue;
  }
  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, content, 'utf8');
}

if (mismatch) process.exitCode = 1;
else console.log(`${checkOnly ? 'validated' : 'generated'} package documentation for ${packages.length} current packages`);

function packageSlug(name) {
  return name.startsWith('@gluonjs/') ? name.slice('@gluonjs/'.length) : name;
}

function yamlString(value) {
  return JSON.stringify(value);
}

function npmUrl(name) {
  return `https://www.npmjs.com/package/${name}`;
}

function installCommand(name) {
  return name === 'create-gluon' ? 'npm create gluon@latest my-app' : `npm install ${name}`;
}

function createPackageIndex(version, entries, metadata) {
  const rows = entries.map((entry) => {
    const docs = metadata.get(entry.name);
    return `| [${entry.name}](/${version}/packages/${packageSlug(entry.name)}/) | ${entry.environment} | ${docs.purpose} |`;
  }).join('\n');
  return [
    '---',
    'title: Gluon packages',
    'description: Choose a package by the capability and runtime boundary your application needs.',
    '---',
    '',
    '# Choose the package that owns the boundary',
    '',
    'Gluon packages are intentionally composable. Begin with the smallest capability you need, keep application state and lifecycle ownership explicit, and add other packages only when the workflow calls for them.',
    '',
    '| Package | Runtime | What it owns |',
    '| --- | --- | --- |',
    rows,
    '',
    '## Build a complete application',
    '',
    `- [Start with a working application](/${version}/guides/getting-started/)`,
    `- [Connect Router and Store](/${version}/guides/application/)`,
    `- [Render on the server and hydrate](/${version}/guides/universal-rendering/)`,
    `- [Compose accessible UI layers](/${version}/guides/components/)`,
    `- [Browse runnable recipes](/${version}/cookbook/)`,
    '',
    'Each package page identifies its runtime boundary, installation, quick start, non-goals, integrations, and generated public API.',
    '',
  ].join('\n');
}
