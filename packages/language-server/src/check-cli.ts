#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analyzeGluonProject } from './index.js';

const arguments_ = process.argv.slice(2);
if (arguments_.includes('--help') || arguments_.includes('-h')) {
  process.stdout.write('Usage: gluon-template-check <file-or-directory> [...]\n');
} else if (arguments_.length === 0) {
  process.stderr.write('GLUON_CHECK_INPUT_MISSING: provide at least one TypeScript or JavaScript file or directory.\n');
  process.exitCode = 2;
} else {
  const files = [...new Set((await Promise.all(arguments_.map((entry) => collect(resolve(entry))))).flat())].sort();
  const documents = await Promise.all(files.map(async (file) => ({ uri: file, text: await readFile(file, 'utf8') })));
  let count = 0;
  for (const analysis of analyzeGluonProject(documents)) {
    for (const diagnostic of analysis.diagnostics) {
      count += 1;
      process.stderr.write(`${analysis.uri}:${diagnostic.range.start.line + 1}:${diagnostic.range.start.character + 1} ${diagnostic.code} ${diagnostic.message}\n`);
    }
  }
  process.stdout.write(`checked ${files.length} file${files.length === 1 ? '' : 's'}; ${count} diagnostic${count === 1 ? '' : 's'}\n`);
  if (count > 0) process.exitCode = 1;
}

async function collect(path: string): Promise<string[]> {
  const metadata = await stat(path);
  if (metadata.isFile()) return /\.[cm]?[jt]sx?$/.test(path) ? [path] : [];
  if (!metadata.isDirectory()) return [];
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries
    .filter((entry) => entry.name !== 'node_modules' && entry.name !== 'dist')
    .map((entry) => collect(resolve(path, entry.name))));
  return nested.flat();
}
