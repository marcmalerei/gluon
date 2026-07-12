import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const decision = JSON.parse(await readFile(resolve(root, 'quality/vue-codemod-decision.json'), 'utf8'));
const requiredIds = [
  'async-components-suspense',
  'css-preprocessors-external-styles',
  'dynamic-templates-macros-directives',
  'lifecycle',
  'native-custom-element-transport',
  'plugins-runtime-registration',
  'props-emits-model',
  'router-store-boundaries',
  'simple-template-bindings',
  'ssr-hydration',
  'static-component-registration',
  'stylesheet-extraction',
  'tests',
  'vue-imports',
];

assert(decision.schemaVersion === '1.0.0', 'decision schema version must be 1.0.0');
assert(decision.decision === 'no-go', 'the retained evaluation must record no-go');
assert(decision.sourceWriterProposed === false, 'the decision must not propose a source writer');
assert(decision.corpus.candidateClasses === requiredIds.length, 'candidate count does not match the contract');
assert(decision.corpus.behaviorallyEquivalentClasses === 0, 'no behavioral equivalence is proven');

const reports = await Promise.all(decision.corpus.reports.map(async (path) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'))));
const actualFiles = reports.reduce((total, report) => total + report.files.length, 0);
const actualInventory = reports.reduce((total, report) => total + report.inventory.length, 0);
const actualFindings = reports.reduce((total, report) => total + report.findings.length, 0);
assert(actualFiles === decision.corpus.files, `expected ${decision.corpus.files} corpus files, found ${actualFiles}`);
assert(actualInventory === decision.corpus.inventoryRecords, `expected ${decision.corpus.inventoryRecords} inventory records, found ${actualInventory}`);
assert(actualFindings === decision.corpus.findings, `expected ${decision.corpus.findings} findings, found ${actualFindings}`);

const analyzerIds = new Set(reports.flatMap((report) => [
  ...report.inventory.map(({ id }) => id),
  ...report.findings.map(({ id }) => id),
]));
const candidates = new Map(decision.candidates.map((candidate) => [candidate.id, candidate]));
assert(candidates.size === decision.candidates.length, 'candidate IDs must be unique');
assert(JSON.stringify([...candidates.keys()].sort()) === JSON.stringify(requiredIds), 'candidate IDs do not match the required evaluation surface');

for (const candidate of decision.candidates) {
  assert(['mechanically-safe', 'review-required', 'unsupported'].includes(candidate.classification), `${candidate.id} has an invalid classification`);
  assert(candidate.decision === 'no-go', `${candidate.id} must remain no-go without an accepted writer RFC`);
  assert(candidate.expectedOutput === decision.expectedOutput, `${candidate.id} must link the no-write expected output`);
  assert(candidate.inputs.length > 0, `${candidate.id} must link retained input`);
  assert(candidate.analyzerEvidence.length > 0, `${candidate.id} must link analyzer evidence`);
  assert(candidate.acceptanceEvidence.length > 0, `${candidate.id} must link a semantic test or counterexample`);
  await Promise.all([...candidate.inputs, ...candidate.acceptanceEvidence].map((path) => access(resolve(root, path))));
  for (const id of candidate.analyzerEvidence) {
    assert(analyzerIds.has(id), `${candidate.id} references unknown analyzer evidence ${id}`);
  }
}

const expectedOutput = JSON.parse(await readFile(resolve(root, decision.expectedOutput), 'utf8'));
assert(expectedOutput.decision === 'no-go', 'expected output must record no-go');
assert(expectedOutput.sourcePreserved === true, 'expected output must preserve source');
assert(expectedOutput.generatedFiles.length === 0, 'no generated files are authorized');
assert(expectedOutput.modifiedFiles.length === 0, 'no modified files are authorized');
assert(expectedOutput.deletedFiles.length === 0, 'no deleted files are authorized');
assert(JSON.stringify([...expectedOutput.candidateIds].sort()) === JSON.stringify(requiredIds), 'expected-output candidate IDs do not match');
await access(resolve(root, decision.counterexamples));

console.log(`Vue codemod decision valid: no-go across ${decision.candidates.length} classes, ${actualFiles} retained files, ${actualInventory} inventory records, ${actualFindings} findings`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
