#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analyzeGluonProject, getGluonApiManifest } from './index.js';

const rawArguments = process.argv.slice(2);
const json = rawArguments.includes('--json');
const arguments_ = rawArguments.filter((argument) => argument !== '--json');
if (arguments_.includes('--help') || arguments_.includes('-h')) {
  process.stdout.write('Usage: gluon-check [--json] <file-or-directory> [...]\n');
} else if (arguments_.length === 0) {
  const message = 'GLUON_CHECK_INPUT_MISSING: provide at least one TypeScript or JavaScript file or directory.';
  if (json) process.stdout.write(`${JSON.stringify({ schemaVersion: 1, ok: false, diagnostics: [{ code: 'GLUON_CHECK_INPUT_MISSING', message }] })}\n`);
  else process.stderr.write(`${message}\n`);
  process.exitCode = 2;
} else {
  const files = [...new Set((await Promise.all(arguments_.map((entry) => collect(resolve(entry))))).flat())].sort();
  const documents = await Promise.all(files.map(async (file) => ({ uri: file, text: await readFile(file, 'utf8') })));
  const analyses = analyzeGluonProject(documents);
  const diagnostics = analyses.flatMap((analysis) => analysis.diagnostics.map((diagnostic) => ({ file: analysis.uri, ...diagnostic })));
  if (json) {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, ok: diagnostics.length === 0, api: getGluonApiManifest(), files, diagnostics }, null, 2)}\n`);
  } else {
    for (const diagnostic of diagnostics) {
      process.stderr.write(`${diagnostic.file}:${diagnostic.range.start.line + 1}:${diagnostic.range.start.character + 1} ${diagnostic.code} ${diagnostic.message}\n`);
    }
    process.stdout.write(`checked ${files.length} file${files.length === 1 ? '' : 's'}; ${diagnostics.length} diagnostic${diagnostics.length === 1 ? '' : 's'}\n`);
  }
  if (diagnostics.length > 0) process.exitCode = 1;
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
