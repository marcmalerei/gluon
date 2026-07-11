import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, option('--directory') ?? '.tmp/release');
const files = (await allFiles(directory)).filter((path) => basename(path) !== 'SHA256SUMS');
const checksums = [];

for (const path of files) {
  const relative = path.slice(directory.length + 1);
  const digest = createHash('sha256').update(await readFile(path)).digest('hex');
  checksums.push(`${digest}  ${relative}`);
}
await writeFile(resolve(directory, 'SHA256SUMS'), `${checksums.sort().join('\n')}\n`, 'utf8');
console.log(`release checksums finalized: ${files.length} assets`);

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function allFiles(parent) {
  const result = [];
  for (const entry of await readdir(parent, { withFileTypes: true })) {
    const path = resolve(parent, entry.name);
    if (entry.isDirectory()) result.push(...await allFiles(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}
