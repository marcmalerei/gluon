import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const matrixPath = resolve(root, 'docs/ui-quality-matrix.json');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
const requiredDimensions = [
  'public-api-and-manifest',
  'catalog-completeness',
  'css-variables-and-tenants',
  'tailwind-and-clean-builds',
  'interaction-and-accessibility',
  'responsive-layouts',
  'ssr-dsd-hydration-disposal',
  'storybook-visual-baselines',
  'shop-customer-flows',
  'package-and-generated-docs',
];
const evidenceKinds = new Set(['unit', 'browser', 'e2e', 'visual', 'ssr', 'build', 'docs']);

if (matrix.schemaVersion !== 1 || !Array.isArray(matrix.dimensions)) {
  throw new Error('UI quality matrix must use schemaVersion 1 and contain dimensions.');
}
const seen = new Set();
for (const dimension of matrix.dimensions) {
  if (!dimension || typeof dimension.id !== 'string' || seen.has(dimension.id)) {
    throw new Error(`UI quality matrix contains a missing or duplicate dimension id: ${dimension?.id ?? '<missing>'}`);
  }
  seen.add(dimension.id);
  if (typeof dimension.title !== 'string' || dimension.title.length < 10) {
    throw new Error(`${dimension.id} needs a descriptive title.`);
  }
  if (!Array.isArray(dimension.evidence) || dimension.evidence.length === 0 || dimension.evidence.some((kind) => !evidenceKinds.has(kind))) {
    throw new Error(`${dimension.id} needs recognized evidence kinds.`);
  }
  if (!Array.isArray(dimension.commands) || dimension.commands.length === 0) {
    throw new Error(`${dimension.id} needs at least one executable package command.`);
  }
  for (const command of dimension.commands) {
    if (typeof packageJson.scripts?.[command] !== 'string') {
      throw new Error(`${dimension.id} references missing npm script ${command}.`);
    }
  }
  if (!Array.isArray(dimension.paths) || dimension.paths.length === 0) {
    throw new Error(`${dimension.id} needs source or evidence paths.`);
  }
  for (const path of dimension.paths) {
    await access(resolve(root, path));
  }
}
for (const id of requiredDimensions) {
  if (!seen.has(id)) throw new Error(`UI quality matrix is missing required dimension ${id}.`);
}
if (seen.size !== requiredDimensions.length) throw new Error('UI quality matrix contains an unexpected dimension.');

console.log(`UI quality matrix valid: ${matrix.dimensions.length} dimensions, ${matrix.dimensions.reduce((total, dimension) => total + dimension.paths.length, 0)} evidence paths, unit/browser/e2e/visual/SSR/build/docs boundaries.`);
