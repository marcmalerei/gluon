#!/usr/bin/env node
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { analyzeStaticGluonProject, type ProjectDocument } from './index.js';

const arguments_ = process.argv.slice(2);
if (arguments_.includes('--help') || arguments_.includes('-h')) {
  process.stdout.write('Usage: gluon-project-analyze [root]\nWrites a deterministic versioned JSON report to stdout.\n');
} else if (arguments_.length > 1 || arguments_[0]?.startsWith('-')) {
  process.stderr.write('GLUON_PROJECT_INPUT_INVALID: provide one project directory.\n');
  process.exitCode = 2;
} else {
  try {
    const root = await realpath(resolve(arguments_[0] ?? '.'));
    const files = await collect(root, root);
    const documents: ProjectDocument[] = [];
    let bytes = 0;
    for (const file of files) {
      const text = await readFile(file, 'utf8');
      bytes += Buffer.byteLength(text);
      if (bytes > 16 * 1024 * 1024) throw new Error('project source exceeds the 16 MiB analysis limit');
      documents.push({ uri: relative(root, file).split(sep).join('/'), text });
    }
    process.stdout.write(`${JSON.stringify(analyzeStaticGluonProject(documents), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`GLUON_PROJECT_ANALYSIS_FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

async function collect(root: string, path: string): Promise<string[]> {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink()) return [];
  const canonical = await realpath(path);
  if (canonical !== root && !canonical.startsWith(`${root}${sep}`)) throw new Error('project path escapes the analysis root');
  if (metadata.isFile()) return /\.[cm]?[jt]sx?$/.test(path) ? [path] : [];
  if (!metadata.isDirectory()) return [];
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries
    .filter((entry) => !['.git', 'coverage', 'dist', 'node_modules'].includes(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => collect(root, resolve(path, entry.name))));
  const files = nested.flat();
  if (files.length > 2_000) throw new Error('project contains more than 2000 analyzable files');
  return files.sort();
}
