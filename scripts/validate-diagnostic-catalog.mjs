import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const { GLUON_DIAGNOSTIC_CATALOG_VERSION, gluonDiagnosticCatalog } = await import('../packages/compiler/dist/diagnostics.js');
const ignored = new Set([
  'GLUON_DEVTOOLS_GLOBAL', 'GLUON_DEVTOOLS_PROTOCOL_VERSION', 'GLUON_DEVTOOLS__', 'GLUON_DEV__',
  'GLUON_DIAGNOSTIC_CATALOG_MISSING', 'GLUON_DIAGNOSTIC_CATALOG_VERSION', 'GLUON_HYDRATION_', 'GLUON_VERSION',
]);
const dynamicCodes = [
  'GLUON_HYDRATION_ATTRIBUTE_MISMATCH', 'GLUON_HYDRATION_STATE_MISMATCH',
  'GLUON_HYDRATION_STRUCTURE_MISMATCH', 'GLUON_HYDRATION_STYLE_MISMATCH', 'GLUON_HYDRATION_TEXT_MISMATCH',
];

const codes = gluonDiagnosticCatalog.map((entry) => entry.code);
const compact = gluonDiagnosticCatalog.map((entry) => entry.compactCode);
if (new Set(codes).size !== codes.length) throw new Error('Diagnostic catalog codes must be unique.');
if (new Set(compact).size !== compact.length) throw new Error('Diagnostic catalog compact codes must be unique.');
for (const entry of gluonDiagnosticCatalog) {
  for (const field of ['title', 'summary', 'why', 'remediation', 'source']) {
    if (!String(entry[field]).trim()) throw new Error(`${entry.code} is missing ${field}.`);
  }
}

const sources = await collectSources(
  resolve(root, 'src'),
  resolve(root, 'packages'),
  resolve(root, 'examples/playground/src'),
);
const discovered = new Set(dynamicCodes);
for (const file of sources) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/\bGLUON_[A-Z][A-Z0-9_]+\b/g)) {
    if (!ignored.has(match[0])) discovered.add(match[0]);
  }
}
const missing = [...discovered].filter((code) => !codes.includes(code)).sort();
if (missing.length > 0) throw new Error(`Public diagnostic catalog is missing: ${missing.join(', ')}.`);

const artifact = `${JSON.stringify({ version: GLUON_DIAGNOSTIC_CATALOG_VERSION, diagnostics: gluonDiagnosticCatalog }, null, 2)}\n`;
const artifactPath = resolve(root, 'docs/diagnostics', `${GLUON_DIAGNOSTIC_CATALOG_VERSION}.json`);
if (process.argv.includes('--write')) {
  await writeFile(artifactPath, artifact);
} else if (await readFile(artifactPath, 'utf8') !== artifact) {
  throw new Error(`Versioned diagnostic artifact is stale: ${artifactPath}.`);
}
console.log(`diagnostic catalog valid: ${codes.length} documented codes, ${discovered.size} source codes`);

async function collectSources(...directories) {
  const files = [];
  for (const directory of directories) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory() && entry.name !== 'dist') files.push(...await collectSources(path));
      else if (entry.isFile() && /\.[cm]?[jt]s$/.test(entry.name)) files.push(path);
    }
  }
  return files;
}
