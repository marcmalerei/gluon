import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const candidateDirectory = resolve(root, option('--candidate') ?? '.tmp/release-candidate');
const reproducedDirectory = resolve(root, option('--reproduced') ?? '.tmp/release-reproduced');
const candidate = await evidence(candidateDirectory);
const reproduced = await evidence(reproducedDirectory);

for (const field of ['version', 'tag', 'sourceCommit', 'lockfileSha256']) {
  if (candidate[field] !== reproduced[field]) throw new Error(`Release reproduction differs in ${field}.`);
}
for (const field of ['blockedDevelopmentBuild', 'sourceTreeClean']) {
  if (candidate[field] !== reproduced[field]) throw new Error(`Release reproduction differs in ${field}.`);
}

const reproducedByName = new Map(reproduced.packages.map((entry) => [entry.name, entry]));
for (const entry of candidate.packages) {
  const other = reproducedByName.get(entry.name);
  if (!other) throw new Error(`Reproduction is missing ${entry.name}.`);
  for (const field of ['version', 'canonicalSha256', 'fileCount']) {
    if (entry[field] !== other[field]) throw new Error(`${entry.name} reproduction differs in ${field}.`);
  }
}
if (candidate.packages.length !== reproduced.packages.length) throw new Error('Reproduction package count differs.');

const result = {
  schemaVersion: 1,
  version: candidate.version,
  sourceCommit: candidate.sourceCommit,
  packageCount: candidate.packages.length,
  canonicalContentsMatch: true,
  candidateEvidenceSha256: sha256(await readFile(resolve(candidateDirectory, 'release-evidence.json'))),
  reproducedEvidenceSha256: sha256(await readFile(resolve(reproducedDirectory, 'release-evidence.json'))),
};
console.log(JSON.stringify(result, null, 2));

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function evidence(directory) {
  return JSON.parse(await readFile(resolve(directory, 'release-evidence.json'), 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
