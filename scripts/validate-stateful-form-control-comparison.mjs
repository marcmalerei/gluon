import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const fixtureRoot = resolve(root, 'benchmarks/dx/stateful-form-control');
const evidence = JSON.parse(await readFile(resolve(fixtureRoot, 'evidence.json'), 'utf8'));
const files = {
  'gluon-class': 'gluon-class.ts',
  'gluon-functional': 'gluon-functional.ts',
  vue: 'vue.ts',
  react: 'react.tsx',
};

for (const [id, file] of Object.entries(files)) {
  const source = await readFile(resolve(fixtureRoot, file), 'utf8');
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.includes('DX_COMPONENT_START'));
  const end = lines.findIndex((line) => line.includes('DX_COMPONENT_END'));
  assert(start >= 0 && end > start, `${file} has no valid component range`);
  const authoredLines = lines.filter((line) => line.trim() && !line.includes('DX_COMPONENT_')).length;
  const componentLines = lines.slice(start + 1, end).filter((line) => line.trim()).length;
  const actual = { authoredLines, componentLines, boundaryLines: authoredLines - componentLines };
  const expected = evidence.frameworks[id];
  assert(JSON.stringify(actual) === JSON.stringify({
    authoredLines: expected.authoredLines,
    componentLines: expected.componentLines,
    boundaryLines: expected.boundaryLines,
  }), `${file} authored-line evidence drifted: ${JSON.stringify(actual)}`);
  for (const specifier of [...source.matchAll(/from ['"]([^'"]+)['"]/g)].map((match) => match[1])) {
    assert(!specifier.includes('/src/') && !specifier.includes('/dist/'), `${file} imports a private package path: ${specifier}`);
  }
}

const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const [name, version] of Object.entries(evidence.versions)) {
  assert(manifest.devDependencies[name] === version, `${name} must remain pinned to ${version}`);
}
const rootTsconfig = JSON.parse(await readFile(resolve(root, 'tsconfig.json'), 'utf8'));
assert(rootTsconfig.compilerOptions.jsx === 'react-jsx', 'the retained React TSX lane requires jsx=react-jsx');
const invalidSource = await readFile(resolve(fixtureRoot, 'invalid-contracts.tsx'), 'utf8');
const { analyzeGluonDocument } = await import('../packages/language-server/dist/index.js');
const invalidAnalysis = analyzeGluonDocument('file:///stateful-form-control/invalid-contracts.tsx', invalidSource);
const slotDiagnostic = invalidAnalysis.diagnostics.find(({ code }) => code === 'GLUON_TEMPLATE_SLOT_UNKNOWN');
assert(slotDiagnostic, 'the comparator invalid fixture must retain an unknown named-slot diagnostic');
const invalidLines = invalidSource.split('\n');
assert(
  invalidLines[slotDiagnostic.range.start.line]?.slice(slotDiagnostic.range.start.character, slotDiagnostic.range.end.character) === 'shipping',
  'the unknown named-slot diagnostic must point to the literal slot name',
);
assert(evidence.verifiedGluonDisadvantages.length > 0, 'every retained Gluon disadvantage must remain explicit');
assert(evidence.limitations.some((value) => value.includes('No human usability pass')), 'missing human-pass limitation');
assert(evidence.limitations.some((value) => value.includes('win, tie, loss')), 'unsupported ranking limitation is missing');

execFileSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', resolve(fixtureRoot, 'tsconfig.json')], { stdio: 'inherit' });
console.log('Validated retained stateful form-control comparison: Gluon class, functional Gluon, Vue, and React.');

function assert(condition, message) {
  if (!condition) throw new Error(`STATEFUL_CONTROL_COMPARISON: ${message}`);
}
