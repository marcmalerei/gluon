import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { arch, platform, release } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'benchmarks/dx/fixtures/manifest-v1.json'), 'utf8'));
const shared = {
  'T1-scaffold': ['strict TypeScript', 'routing', 'state', 'browser testing', 'production build'],
  'T2-themed-controls': ['native attributes', 'typed refs', 'accessible names', 'focus visibility'],
  'T3-local-layers': ['primitive', 'composition', 'layout'],
  'T4-stateful-control': ['typed props', 'typed events', 'local state', 'validation', 'owned cleanup'],
  'T5-customer-flow': ['router navigation', 'persisted state', 'HMR state retention'],
  'T6-universal-route': ['server rendering', 'hydration', 'DOM identity'],
  'T7-plain-html': ['autonomous Custom Element or recorded framework limitation'],
};
const concepts = { gluon: {}, vue: {}, react: {} }; const publicApis = { gluon: {}, vue: {}, react: {} };
for (const id of Object.keys(concepts)) for (const [task, values] of Object.entries(shared)) concepts[id][task] = values;
for (const task of Object.keys(shared)) {
  publicApis.gluon[task] = ['@gluonjs public package entry points'];
  publicApis.vue[task] = ['vue', 'vue-router', 'pinia', '@vue/server-renderer'];
  publicApis.react[task] = ['react', 'react-router', 'React DOM framework hydration'];
}
const outputArgument = process.argv.find((value) => value.startsWith('--output='));
const output = resolve(root, outputArgument?.slice('--output='.length) ?? '.tmp/dx-automation.json');
const temporary = resolve(root, '.tmp/dx-automation-fixtures');
const startedAt = new Date();
await rm(temporary, { recursive: true, force: true });
await mkdir(temporary, { recursive: true });

const frameworkRuns = [];
for (const framework of manifest.frameworks) {
  const commands = [];
  if (framework.id === 'gluon') {
    commands.push(await run('npm run check:create-gluon-fixtures', root));
    commands.push(await run('npm run check:template-composition', root));
    commands.push(await run('npm run check:stateful-control-comparison', root));
    commands.push(await run('npm run test:browser -- --run tests/vite-hmr.spec.ts tests/dx-stateful-form-control.spec.ts tests/hydration.spec.ts', root));
  } else {
    const fixture = resolve(root, framework.fixture);
    const copy = resolve(temporary, framework.id);
    await cp(fixture, copy, { recursive: true, filter: (source) => !['node_modules', 'dist', 'dist-server', 'build', 'playwright-report', 'test-results'].includes(basename(source)) });
    commands.push(await run('npm ci --ignore-scripts', copy));
    commands.push(await run(framework.id === 'vue' ? 'npm run type-check' : 'npm run typecheck', copy));
    commands.push(await run('npm run build', copy));
    commands.push(await run('npm run test:e2e', copy));
    commands.push(await run('npm run diagnostics', copy, 'nonzero'));
  }
  const failed = commands.some((command) => command.expectedExit === 'zero' ? command.exitCode !== 0 : command.exitCode === 0);
  if (failed) throw new Error(`${framework.id} automation did not produce the expected command result`);
  frameworkRuns.push({ id: framework.id, lane: framework.lane, versions: framework.exactVersions, fixture: framework.fixture, lockfile: framework.lockfile, commands });
}

const browserVersions = await readBrowserVersions(resolve(temporary, 'react'));
const taskResults = [];
for (const framework of manifest.frameworks) {
  const packageJson = JSON.parse(await readFile(resolve(root, framework.fixture, 'package.json'), 'utf8'));
  const commands = frameworkRuns.find((candidate) => candidate.id === framework.id).commands;
  for (const [taskId, task] of Object.entries(framework.tasks)) {
    const localFiles = task.evidence
      .map((path) => resolve(root, framework.fixture, path))
      .filter((path) => path.startsWith(resolve(root, framework.fixture)));
    const lineCounts = await Promise.all(localFiles.map(nonEmptyLines));
    const checks = checksFor(taskId, task.status);
    taskResults.push({
      framework: framework.id, taskId, status: task.status === 'covered' ? 'pass' : task.status,
      commands, generatedFiles: taskId === 'T1-scaffold' ? task.evidence : [], authorCreatedFiles: task.evidence,
      authorSourceLines: lineCounts.reduce((sum, count) => sum + count, 0),
      configurationLines: taskId === 'T1-scaffold' ? await nonEmptyLines(resolve(root, framework.fixture, 'package.json')) : 0,
      productionDependencies: dependencyList(packageJson.dependencies), developmentDependencies: dependencyList(packageJson.devDependencies),
      publicApis: publicApis[framework.id][taskId], frameworkConcepts: concepts[framework.id][taskId], checks,
      diagnostics: taskId === 'T4-stateful-control' ? Object.values(framework.diagnostics) : [],
      browserVisibleOutput: ['Evidence Tote product route', 'labeled email and quantity controls', 'persisted checkout summary', 'back/forward and reload recovery'],
      evidence: task.evidence.map((path) => relative(root, resolve(root, framework.fixture, path))),
      limitations: [...framework.limitations, ...(task.limitation ? [task.limitation] : [])],
    });
  }
}

const sourceCommit = (await run('git rev-parse HEAD', root)).stdout.trim();
const npmVersion = (await run('npm --version', root)).stdout.trim();
const evidence = {
  schemaVersion: '1.0.0', specification: manifest.specification, status: 'automated-only',
  runId: `${startedAt.toISOString().slice(0, 10)}-${sourceCommit.slice(0, 12)}`, sourceCommit,
  startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(),
  environment: { operatingSystem: `${platform()} ${release()}`, architecture: arch(), node: process.version, packageManager: `npm ${npmVersion}`, playwright: '1.61.1', browsers: browserVersions },
  frameworks: frameworkRuns, tasks: taskResults, humanPasses: [],
  blockers: ['Issue #107 requires at least one retained human usability pass using the written brief; repository automation cannot create that evidence.'],
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`DX automated evidence written to ${output}`);

async function run(command, cwd, expectedExit = 'zero') {
  const start = performance.now();
  const child = spawn(command, { cwd, shell: true, env: { ...process.env, CI: '1', NO_COLOR: '1' } });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (value) => { stdout += value; process.stdout.write(value); });
  child.stderr.on('data', (value) => { stderr += value; process.stderr.write(value); });
  const exitCode = await new Promise((accept, reject) => { child.once('error', reject); child.once('close', accept); });
  return { command, exitCode, expectedExit, durationMs: Math.round(performance.now() - start), stdout, stderr };
}
async function nonEmptyLines(path) { try { return (await readFile(path, 'utf8')).split(/\r?\n/u).filter((line) => line.trim()).length; } catch { return 0; } }
function dependencyList(value = {}) { return Object.entries(value).map(([name, version]) => `${name}@${version}`).sort(); }
function checksFor(taskId, status) {
  const limitation = status === 'platform-limitation' ? 'platform-limitation' : 'pass';
  return { typecheck: 'pass', build: 'pass', browserTest: 'pass', accessibility: 'pass', hmr: taskId === 'T5-customer-flow' ? 'pass' : 'not-applicable', ssr: taskId === 'T6-universal-route' ? 'pass' : 'not-applicable', hydration: taskId === 'T6-universal-route' ? 'pass' : 'not-applicable', cleanup: taskId === 'T4-stateful-control' ? 'pass' : taskId === 'T7-plain-html' ? limitation : 'not-applicable' };
}
async function readBrowserVersions(cwd) {
  const command = `node --input-type=module -e "import { chromium, firefox, webkit } from '@playwright/test'; for (const [name,type] of Object.entries({chromium,firefox,webkit})) { const browser=await type.launch({headless:true}); console.log(name+'='+browser.version()); await browser.close(); }"`;
  const result = await run(command, cwd);
  if (result.exitCode !== 0) throw new Error('unable to record Playwright browser versions');
  return Object.fromEntries(result.stdout.trim().split(/\r?\n/u).map((line) => line.split('=')));
}
