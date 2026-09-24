import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const contract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const manifest = {
  $schema: './api-manifest.schema.json',
  schemaVersion: 1,
  framework: 'gluon',
  packageContract: 'package-contract.json',
  concepts: ['components', 'lifecycle', 'reactivity', 'store', 'router', 'ssr', 'hydration', 'i18n', 'forms', 'accessibility', 'styles', 'tooling'],
  diagnostics: { catalog: '@gluonjs/compiler/diagnostics', stableCodes: true },
  validation: { projectAnalysis: 'gluon-project-analyze', templateCheck: 'gluon-check', json: true },
  packages: contract.packages.map(({ name, environment, exports }) => ({ name, environment, exports })),
};
const target = resolve(root, 'docs/api-manifest.json');
const expected = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const actual = await readFile(target, 'utf8').catch(() => '');
  if (actual !== expected) throw new Error('docs/api-manifest.json is stale; run node scripts/build-api-manifest.mjs.');
  console.log('api manifest valid');
} else {
  await writeFile(target, expected);
  console.log(`generated ${target}`);
}
