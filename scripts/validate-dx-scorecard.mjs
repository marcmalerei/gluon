import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(import.meta.dirname, '..');
const specificationPath = resolve(root, 'benchmarks/dx/specification-v1.json');
const schemaPath = resolve(root, 'benchmarks/dx/schema/run-v1.schema.json');
const automationSchemaPath = resolve(root, 'benchmarks/dx/schema/automation-v1.schema.json');
const fixtureManifestPath = resolve(root, 'benchmarks/dx/fixtures/manifest-v1.json');
const evidenceDirectory = resolve(root, 'benchmarks/dx/evidence');
const uiStarterEvidencePath = resolve(root, 'benchmarks/dx/create-gluon-ui-starter-2026-07-12.json');
const automatedRunDirectory = resolve(root, 'benchmarks/dx/runs');
const specification = JSON.parse(await readFile(specificationPath, 'utf8'));
const uiStarterEvidence = JSON.parse(await readFile(uiStarterEvidencePath, 'utf8'));
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const automationSchema = JSON.parse(await readFile(automationSchemaPath, 'utf8'));
const fixtureManifest = JSON.parse(await readFile(fixtureManifestPath, 'utf8'));
const evidenceNames = (await readdir(evidenceDirectory)).filter((name) => name.endsWith('.json')).sort();
const automatedRunNames = (await readdir(automatedRunDirectory)).filter((name) => name.endsWith('.json')).sort();
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateRun = ajv.compile(schema);
const validateAutomation = ajv.compile(automationSchema);
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
const addComponentTask = specification.addComponentTask;
assert(addComponentTask.status === 'task-contract-only', 'add-component evidence must not imply a completed run');
assert(addComponentTask.taskId === 'T3-local-layers', 'add-component task must remain part of T3');
assertSet(addComponentTask.lanes.map(({ framework }) => framework), ['gluon', 'react', 'vue'], 'add-component lanes');
assertSet(addComponentTask.evidenceFields, [
  'commands',
  'interactiveAnswers',
  'generatedFiles',
  'authorCreatedFiles',
  'manualEdits',
  'typecheck',
  'browserTest',
  'build',
], 'add-component evidence fields');
const gluonAddComponentLane = addComponentTask.lanes.find(({ framework }) => framework === 'gluon');
assert(gluonAddComponentLane.addCommands.length === 1, 'Gluon add-component task must retain its generator command');
assert(gluonAddComponentLane.addCommands[0].includes('add-component PurchaseAction --kind atom'), 'Gluon add-component command changed');
assert(gluonAddComponentLane.requiredManualEditRecords.length === 0, 'Gluon generated output must not be counted as manual edits');
for (const lane of addComponentTask.lanes.filter(({ framework }) => framework !== 'gluon')) {
  assert(lane.addCommands.length === 0, `${lane.framework} must not invent an official add-component generator`);
  assert(lane.requiredManualEditRecords.length >= 3, `${lane.framework} must retain every required manual-edit category`);
  const source = new URL(lane.source);
  assert(source.hostname === (lane.framework === 'vue' ? 'vuejs.org' : 'react.dev'), `${lane.framework} add-component source is not official`);
}
assert(addComponentTask.limitations.some((value) => value.includes('not a completed 21-result benchmark run')), 'add-component task must retain the incomplete-run boundary');
assert(addComponentTask.limitations.some((value) => value.includes('No Vue or React project was executed')), 'add-component task must state missing comparator execution');
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

assert(uiStarterEvidence.schemaVersion === 1 && uiStarterEvidence.issue === 109, 'UI starter evidence identity is invalid');
assert(uiStarterEvidence.scaffold.command === 'node packages/create-gluon/dist/cli.js .tmp/dx-ui-starter --yes --ui --testing --force', 'UI starter scaffold command changed without refreshed evidence');
assert(uiStarterEvidence.scaffold.interactivePrompts.length === 0, 'the retained --yes run must not invent prompts');
assert(uiStarterEvidence.scaffold.exitCode === 0, 'UI starter scaffold did not retain success');
assert(uiStarterEvidence.generatedFiles.length === 12, 'UI starter generated-file inventory is incomplete');
assert(uiStarterEvidence.firstSuccessfulTest.exitCode === 0, 'UI starter first test evidence is not successful');
assert(uiStarterEvidence.firstProductionBuild.exitCode === 0, 'UI starter first build evidence is not successful');
assert(uiStarterEvidence.completeMatrix.projects === 20, 'UI starter evidence must retain all 20 supported combinations');
assertSet(uiStarterEvidence.completeMatrix.perProjectCommands, [
  'npm install',
  'npm run typecheck',
  'npm run check:templates',
  'npm test',
  'npm run build',
], 'UI starter matrix commands');
assert(uiStarterEvidence.limitations.some((value) => value.includes('not a completed cross-framework benchmark run')), 'UI starter evidence must not imply a completed benchmark');
assert(uiStarterEvidence.limitations.some((value) => value.includes('No human usability pass')), 'UI starter evidence must report the missing human pass');

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

assert(fixtureManifest.schemaVersion === specification.schemaVersion, 'fixture manifest and specification versions differ');
assert(fixtureManifest.specification === 'benchmarks/dx/specification-v1.json', 'fixture manifest must link the accepted specification');
assertSet(fixtureManifest.frameworks.map(({ id }) => id), ['gluon', 'react', 'vue'], 'fixture frameworks');
for (const framework of fixtureManifest.frameworks) {
  assertSet(Object.keys(framework.tasks), [...taskIds], `${framework.id} fixture tasks`);
  assert(Object.values(framework.exactVersions).every((version) => /^\d+\.\d+\.\d+$/u.test(version)), `${framework.id} versions must be exact`);
  await access(resolve(root, framework.fixture, 'package.json'));
  await access(resolve(root, framework.lockfile));
  const packageJson = JSON.parse(await readFile(resolve(root, framework.fixture, 'package.json'), 'utf8'));
  for (const [name, version] of Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies })) {
    assert(!/^[~^*]|latest|workspace:/u.test(version), `${framework.id} dependency ${name} is not exactly pinned`);
    if (framework.exactVersions[name]) assert(framework.exactVersions[name] === version, `${framework.id} manifest version for ${name} differs from package.json`);
  }
  for (const task of Object.values(framework.tasks)) {
    assert(['covered', 'platform-limitation'].includes(task.status), `${framework.id} has an invalid task status`);
    if (task.status === 'platform-limitation') assert(task.limitation?.length > 20, `${framework.id} platform limitation requires an explanation`);
    await Promise.all(task.evidence.map((path) => access(resolve(root, framework.fixture, path))));
  }
}
const gluonFixtureFiles = [...new Set(Object.values(fixtureManifest.frameworks.find(({ id }) => id === 'gluon').tasks).flatMap(({ evidence }) => evidence))]
  .filter((path) => !path.startsWith('../'));
for (const path of gluonFixtureFiles) {
  const source = await readFile(resolve(root, 'benchmarks/dx/fixtures/gluon', path), 'utf8');
  assert(!/from\s+['"][^'"]*(?:\/src\/|\/dist\/)/u.test(source), `Gluon fixture ${path} uses a private or deep import`);
  assert(!/<style(?:\s|>)/iu.test(source), `Gluon fixture ${path} contains a style fallback`);
}

assert(automationSchema.properties.humanPasses.maxItems === 0, 'automated evidence must not manufacture human passes');
assert(automationSchema.properties.tasks.minItems === 21 && automationSchema.properties.tasks.maxItems === 21, 'automated evidence must retain 21 task records');
for (const name of automatedRunNames) {
  const run = JSON.parse(await readFile(resolve(automatedRunDirectory, name), 'utf8'));
  assert(validateAutomation(run), `${name} does not match the automation schema:\n${ajv.errorsText(validateAutomation.errors, { separator: '\n' })}`);
  assertSet(run.frameworks.map(({ id }) => id), ['gluon', 'react', 'vue'], `${name} automated frameworks`);
  const expectedPairs = specification.tasks.flatMap(({ id }) => ['gluon', 'vue', 'react'].map((framework) => `${framework}:${id}`));
  assertSet(run.tasks.map(({ framework, taskId }) => `${framework}:${taskId}`), expectedPairs, `${name} automated framework-task results`);
  assert(run.humanPasses.length === 0, `${name} must not contain a human pass`);
  assert(run.blockers.some((value) => value.includes('human usability pass')), `${name} must retain the human-evidence blocker`);
  assert(!containsOpaqueScore(run), `${name} contains a prohibited aggregate or weighted score field`);
}

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
    assert(evidence.frameworks.length === 4, `${name} must retain current Gluon, compose Gluon, React, and Vue fixtures`);
    if (evidence.trackingIssue === 111) {
      assert(evidence.applicableTask === 'T3-local-layers', `${name} must identify the applicable parent task`);
      assertSet(evidence.frameworks.map(({ id }) => id), ['gluon-current', 'gluon-compose', 'react', 'vue'], `${name} slice frameworks`);
      assert(evidence.frameworks.find(({ id }) => id === 'gluon-compose').callSiteChildrenProperties === 0, `${name} must retain the children-plumbing result`);
    } else if (evidence.trackingIssue === 112) {
      assert(evidence.applicableTask === 'T4-stateful-control', `${name} must identify the applicable parent task`);
      assertSet(evidence.frameworks.map(({ id }) => id), ['gluon-class', 'gluon-functional', 'react', 'vue'], `${name} slice frameworks`);
      assert(evidence.frameworks.find(({ id }) => id === 'gluon-functional').duplicatePublicDeclarations === 0, `${name} must retain the inferred-declaration result`);
      assert(typeof evidence.rawEvidence === 'string', `${name} must link its raw evidence`);
    } else {
      assert(false, `${name} identifies an unsupported implementation slice`);
    }
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
  access(resolve(root, 'docs/dx-scorecard-report.md')),
  access(resolve(root, 'docs/quality-gates.md')),
  access(resolve(root, 'docs/roadmap.md')),
  access(resolve(root, 'benchmarks/dx/human-usability-brief-v1.md')),
]);

console.log(`DX benchmark contract valid: ${specification.tasks.length} tasks, ${specification.measurements.length} measurements, ${specification.sliceMeasurements.length} bounded slice measurement(s), ${evidenceNames.length} orientation record(s), ${automatedRunNames.length} automated run(s), 0 completed runs`);

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
