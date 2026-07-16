import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const output = resolve('examples/shop/project-analysis.json');
const result = spawnSync(process.execPath, [
  resolve('packages/language-server/dist/project-analyze-cli.js'),
  resolve('examples/shop/src'),
], { encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || `project analyzer exited ${result.status}`);
const report = JSON.parse(result.stdout);
if (report.schemaVersion !== 1 || report.files.length === 0 || report.routes.length === 0
  || report.stores.length === 0 || report.ssrBoundaries.length === 0) {
  throw new Error('GLUON GOODS project analysis is missing required static evidence.');
}
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const retained = await readFile(output, 'utf8');
  if (retained !== serialized) throw new Error('examples/shop/project-analysis.json is stale.');
  process.stdout.write(`validated GLUON GOODS project analysis: ${report.files.length} files, ${report.diagnostics.length} diagnostics\n`);
} else {
  await writeFile(output, serialized, 'utf8');
  process.stdout.write(`wrote ${output}\n`);
}
