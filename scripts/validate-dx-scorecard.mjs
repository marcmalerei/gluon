import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(import.meta.dirname, '..');
const specificationPath = resolve(root, 'benchmarks/dx/specification-v1.json');
const schemaPath = resolve(root, 'benchmarks/dx/schema/run-v1.schema.json');
const evidenceDirectory = resolve(root, 'benchmarks/dx/evidence');
const specification = JSON.parse(await readFile(specificationPath, 'utf8'));
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const evidenceNames = (await readdir(evidenceDirectory)).filter((name) => name.endsWith('.json')).sort();
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateRun = ajv.compile(schema);
const validateSliceMeasurement = ajv.getSchema(`${schema.$id}#/$defs/sliceMeasurement`);

assert(specification.schemaVersion === '1.0.0', 'specification schema version must be 1.0.0');
assert(specification.benchmarkId === 'gluon-dx-application-authoring', 'unexpected benchmark identifier');
assert(specification.frameworks.length === 3, 'the comparison must define exactly three frameworks');
assertSet(specification.frameworks.map(({ id }) => id), ['gluon', 'react', 'vue'], 'frameworks');
assert(specification.tasks.length === 7, 'the comparison must define exactly seven tasks');
assertSet(specification.tasks.map(({ id }) => id), [
  'T1-scaffold',
  'T2-themed-controls',
  'T3-local-layers',
  'T4-stateful-control',
  'T5-customer-flow',
  'T6-universal-route',
  'T7-plain-html',
], 'task IDs');
for (const task of specification.tasks) {
  assert(task.observableOutcomes.length >= 3, `${task.id} must define at least three observable outcomes`);
}
assert(validateSliceMeasurement, 'slice measurement schema must be addressable');
assert(Array.isArray(specification.sliceMeasurements), 'slice measurements must be recorded explicitly');
const taskIds = new Set(specification.tasks.map(({ id }) => id));
for (const measurement of specification.sliceMeasurements) {
  assert(validateSliceMeasurement(measurement), `issue #${measurement.issue ?? 'unknown'} slice measurement is invalid:\n${ajv.errorsText(validateSliceMeasurement.errors, { separator: '\n' })}`);
  assert(measurement.taskIds.every((taskId) => taskIds.has(taskId)), `issue #${measurement.issue} names an unknown benchmark task`);
  for (const snapshot of [measurement.before, measurement.after]) {
    for (const dimension of ['setupCalls', 'imports', 'configuration', 'cleanup']) {
      assert(snapshot[dimension].count === snapshot[dimension].values.length, `issue #${measurement.issue} ${dimension} count does not match its retained values`);
    }
  }
  assert(measurement.limitations.some((value) => value.includes('not a completed 21-result benchmark run')), `issue #${measurement.issue} must not imply a completed run`);
  assert(measurement.limitations.some((value) => value.includes('No Vue or React task result')), `issue #${measurement.issue} must prohibit unsupported comparison claims`);
  await Promise.all(measurement.evidence.map((path) => access(resolve(root, path))));
}
assert(specification.measurements.length === 19, 'all 19 issue #107 measurements must remain explicit');
assert(specification.comparisonDimensions.length >= 8, 'comparison dimensions must remain disaggregated');
assert(specification.prohibitedAggregation.includes('must not calculate a single'), 'opaque score prohibition is missing');

const sources = new Map(specification.frameworks.map(({ id, selectionSource }) => [id, new URL(selectionSource)]));
assert(sources.get('vue').hostname === 'vuejs.org', 'Vue selection must use official vuejs.org guidance');
assert(sources.get('react').hostname === 'react.dev', 'React selection must use official react.dev guidance');
assert(specification.frameworks.find(({ id }) => id === 'react').selectionReason.length > 100, 'React lane selection requires a recorded rationale');

assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'run schema must use JSON Schema 2020-12');
assert(schema.properties.schemaVersion.const === specification.schemaVersion, 'run and specification schema versions differ');
assert(schema.properties.tasks.minItems === 21 && schema.properties.tasks.maxItems === 21, 'a run must retain all 21 framework-task results');
assert(schema.properties.humanPasses.minItems === 1, 'a run must retain at least one human usability pass');
assert(schema.$defs.task.additionalProperties === false, 'task evidence must reject undeclared fields');
assert(schema.$defs.commandResult.required.includes('exitCode'), 'command evidence must retain exit codes');

assert(evidenceNames.length > 0, 'at least one comparator-selection or completed-run record is required');
for (const name of evidenceNames) {
  const evidence = JSON.parse(await readFile(resolve(evidenceDirectory, name), 'utf8'));
  assert(evidence.schemaVersion === specification.schemaVersion, `${name} uses an unsupported schema version`);
  if (evidence.status === 'comparator-selection-only') {
    assert(evidence.sources.length === 4, `${name} must retain the four official selection sources`);
    for (const source of evidence.sources) {
      const url = new URL(source.url);
      assert(['vuejs.org', 'react.dev'].includes(url.hostname), `${name} includes a non-official comparator source`);
    }
    assert(evidence.limitations.some((value) => value.includes('not a completed benchmark run')), `${name} must not imply completed results`);
    assert(evidence.limitations.some((value) => value.includes('No task result, win, tie, loss')), `${name} must prohibit unsupported comparison claims`);
    continue;
  }
  if (evidence.status === 'implementation-slice-only') {
    assert(evidence.specification === 'benchmarks/dx/specification-v1.json', `${name} must link the accepted specification`);
    assert(evidence.trackingIssue === 111, `${name} must identify issue #111`);
    assert(evidence.applicableTask === 'T3-local-layers', `${name} must identify the applicable parent task`);
    assert(evidence.frameworks.length === 4, `${name} must retain current Gluon, compose Gluon, React, and Vue fixtures`);
    assertSet(evidence.frameworks.map(({ id }) => id), ['gluon-current', 'gluon-compose', 'react', 'vue'], `${name} slice frameworks`);
    assert(evidence.frameworks.find(({ id }) => id === 'gluon-compose').callSiteChildrenProperties === 0, `${name} must retain the children-plumbing result`);
    assert(evidence.limitations.some((value) => value.includes('not a completed benchmark run')), `${name} must not imply a completed run`);
    assert(evidence.limitations.some((value) => value.includes('No human usability pass')), `${name} must report the missing human pass`);
    assert(evidence.limitations.some((value) => value.includes('win, tie, loss')), `${name} must prohibit unsupported comparison claims`);
    continue;
  }
  assert(validateRun(evidence), `${name} does not match the completed-run schema:\n${ajv.errorsText(validateRun.errors, { separator: '\n' })}`);
  assertSet(evidence.frameworks.map(({ id }) => id), ['gluon', 'react', 'vue'], `${name} framework runs`);
  const expectedPairs = specification.tasks.flatMap(({ id }) =>
    ['gluon', 'vue', 'react'].map((framework) => `${framework}:${id}`));
  assertSet(evidence.tasks.map(({ framework, taskId }) => `${framework}:${taskId}`), expectedPairs, `${name} framework-task results`);
  assert(!containsOpaqueScore(evidence), `${name} contains a prohibited aggregate or weighted score field`);
}

await Promise.all([
  access(resolve(root, 'docs/dx-benchmark.md')),
  access(resolve(root, 'docs/quality-gates.md')),
  access(resolve(root, 'docs/roadmap.md')),
]);

console.log(`DX benchmark contract valid: ${specification.tasks.length} tasks, ${specification.measurements.length} measurements, ${specification.sliceMeasurements.length} bounded slice measurement(s), ${evidenceNames.length} orientation record(s), 0 completed runs`);

function assert(condition, message) {
  if (!condition) throw new Error(`DX benchmark contract: ${message}`);
}

function assertSet(actual, expected, label) {
  assert(JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort()), `${label} do not match the accepted contract`);
}

function containsOpaqueScore(value) {
  if (Array.isArray(value)) return value.some(containsOpaqueScore);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) =>
    /^(?:aggregate|combined|overall|weighted)(?:Score)?$/i.test(key) || containsOpaqueScore(nested));
}
