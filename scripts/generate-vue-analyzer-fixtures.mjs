import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analyzeVueMigration, formatVueMigrationReport } from '../packages/vue-migration-analyzer/dist/src/index.js';

const root = resolve(import.meta.dirname, '..');
const fixtureRoot = resolve(root, 'packages/vue-migration-analyzer/fixtures');
const output = resolve(fixtureRoot, 'expected');
const check = process.argv.includes('--check');
const names = ['supported', 'unsupported', 'malformed', 'adversarial'];
const exits = {};

await mkdir(output, { recursive: true });
for (const name of names) {
  const report = await analyzeVueMigration({ root: resolve(fixtureRoot, name) });
  const json = formatVueMigrationReport(report, 'json');
  const human = formatVueMigrationReport(report, 'human');
  exits[name] = report.findings.some((finding) => finding.code === 'GVA9002') ? 3
    : report.findings.some((finding) => finding.severity === 'error') ? 1 : 0;
  await retain(`${name}.json`, json);
  await retain(`${name}.txt`, human);
}
await retain('exit-codes.json', `${JSON.stringify(exits, null, 2)}\n`);
console.log(`${check ? 'validated' : 'generated'} ${names.length} retained Vue analyzer fixture reports`);

async function retain(name, content) {
  const path = resolve(output, name);
  if (!check) return await writeFile(path, content, 'utf8');
  const expected = await readFile(path, 'utf8');
  if (expected !== content) throw new Error(`retained Vue analyzer evidence changed: ${name}`);
}
