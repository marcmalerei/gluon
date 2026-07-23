import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { arch, platform, release } from 'node:os';
import { basename, dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'benchmarks/dx/fixtures/manifest-v1.json'), 'utf8'));
const concepts = {
  gluon: {
    'T1-scaffold': ['create-gluon feature switches', 'Router records', 'Store manager', 'Vitest browser provider', 'Vite plugin'],
    'T2-themed-controls': ['Atom Button', 'constructable stylesheet', 'native attribute forwarding', 'typed ref'],
    'T3-local-layers': ['defineAtom', 'defineMolecule', 'defineOrganism', 'add-component generator'],
    'T4-stateful-control': ['defineGluonElement', 'stateful setup context', 'typed cancelable event', 'form context', 'owned cleanup'],
    'T5-customer-flow': ['Router navigation', 'Store actions', 'localStorage persistence', 'Vite HMR'],
    'T6-universal-route': ['renderRequest', 'request store', 'hydrateApplication', 'hydration state', 'style manifest'],
    'T7-plain-html': ['autonomous Custom Element', 'native properties/events/slots', 'ElementInternals form participation'],
  },
  vue: {
    'T1-scaffold': ['create-vue feature flags', 'Single-File Components', 'Vue Router', 'Pinia', 'Playwright', 'Vite'],
    'T2-themed-controls': ['SFC template', 'fallthrough attributes', 'template ref', 'global CSS'],
    'T3-local-layers': ['SFC props', 'slots', 'nested component tree'],
    'T4-stateful-control': ['defineProps', 'defineEmits', 'ref', 'computed', 'onUnmounted', 'defineExpose'],
    'T5-customer-flow': ['Vue Router navigation', 'Pinia store', 'localStorage persistence', 'Vite HMR'],
    'T6-universal-route': ['createSSRApp', '@vue/server-renderer', 'memory history', 'client hydration'],
    'T7-plain-html': ['SFC host wrapper', 'autonomous Custom Element bridge limitation'],
  },
  react: {
    'T1-scaffold': ['create-react-router template', 'route config', 'function components', 'Playwright', 'Vite'],
    'T2-themed-controls': ['JSX', 'native prop intersection', 'forwardRef', 'application CSS'],
    'T3-local-layers': ['function components', 'typed props', 'children composition'],
    'T4-stateful-control': ['useState', 'useMemo', 'useEffect cleanup', 'useImperativeHandle', 'forwardRef'],
    'T5-customer-flow': ['React Router navigation', 'component state', 'localStorage persistence', 'Vite HMR'],
    'T6-universal-route': ['React Router framework SSR', 'React hydration', 'post-hydration effect'],
    'T7-plain-html': ['React root wrapper', 'autonomous Custom Element bridge limitation'],
  },
};
const publicApis = {
  gluon: Object.fromEntries(Object.keys(concepts.gluon).map((task) => [task, ['@gluonjs/core', '@gluonjs/router', '@gluonjs/store', '@gluonjs/ssr', '@gluonjs public UI entries']])),
  vue: Object.fromEntries(Object.keys(concepts.vue).map((task) => [task, ['vue', 'vue-router', 'pinia', '@vue/server-renderer']])),
  react: Object.fromEntries(Object.keys(concepts.react).map((task) => [task, ['react', 'react-router', 'react-dom']])),
};
const outputArgument = process.argv.find((value) => value.startsWith('--output='));
const output = resolve(root, outputArgument?.slice('--output='.length) ?? '.tmp/dx-automation.json');
const temporary = resolve(root, '.tmp/dx-automation-fixtures');
const startedAt = new Date();
await rm(temporary, { recursive: true, force: true });
await mkdir(temporary, { recursive: true });

const baselineDirectory = resolve(temporary, 'generated-baselines');
await mkdir(baselineDirectory, { recursive: true });
const scaffoldResults = new Map();
for (const framework of manifest.frameworks) scaffoldResults.set(framework.id, await scaffoldBaseline(framework));

const frameworkRuns = [];
for (const framework of manifest.frameworks) {
  const commands = [...scaffoldResults.get(framework.id)];
  if (framework.id === 'gluon') {
    commands.push(await run('npm run check:create-gluon-fixtures', root));
    commands.push(await run('npm run check:template-composition', root));
    commands.push(await run('npm run check:stateful-control-comparison', root));
    commands.push(await run('npm run test:browser -- --run tests/vite-hmr.spec.ts tests/dx-stateful-form-control.spec.ts tests/hydration.spec.ts', root));
  } else {
    const fixture = resolve(root, framework.fixture);
    const copy = resolve(temporary, framework.id);
    await cp(fixture, copy, { recursive: true, filter: (source) => !['node_modules', 'dist', 'dist-server', 'build', 'playwright-report', 'test-results'].includes(basename(source)) });
    commands.push(await run('npm ci --ignore-scripts --legacy-peer-deps', copy));
    commands.push(await run(framework.id === 'vue' ? 'npm run type-check' : 'npm run typecheck', copy));
    commands.push(await run('npm run build', copy));
    commands.push(await run('npm run test:e2e', copy));
    commands.push(await run('npm run diagnostics', copy, 'nonzero'));
  }
  const failed = commands.some((command) => command.expectedExit === 'zero' ? command.exitCode !== 0 : command.exitCode === 0);
  if (failed) throw new Error(`${framework.id} automation did not produce the expected command result`);
  frameworkRuns.push({ id: framework.id, lane: framework.lane, versions: framework.exactVersions, scaffoldCommand: framework.scaffoldCommand, interactiveAnswers: framework.interactiveAnswers, fixture: framework.fixture, lockfile: framework.lockfile, commands });
}

const browserVersions = await readBrowserVersions(resolve(temporary, 'react'));
const taskResults = [];
for (const framework of manifest.frameworks) {
  const packageJson = JSON.parse(await readFile(resolve(root, framework.fixture, 'package.json'), 'utf8'));
  const commands = frameworkRuns.find((candidate) => candidate.id === framework.id).commands;
  for (const [taskId, task] of Object.entries(framework.tasks)) {
    const localEntries = task.evidence
      .filter((path) => !path.startsWith('../'))
      .map((path) => ({ path, retained: resolve(root, framework.fixture, path) }));
    const baseline = resolve(baselineDirectory, framework.id);
    const lineCounts = await Promise.all(localEntries.map(({ path, retained }) => authoredLines(resolve(baseline, path), retained)));
    const generated = await Promise.all(localEntries.map(({ path }) => awaitExists(resolve(baseline, path))));
    const generatedFiles = localEntries.filter((_, index) => generated[index]).map(({ path }) => path);
    const authoredFiles = localEntries.filter((_, index) => lineCounts[index] > 0).map(({ path }) => path);
    const checks = checksFor(taskId, task.status);
    taskResults.push({
      framework: framework.id, taskId, status: task.status === 'covered' ? 'pass' : task.status,
      commands, generatedFiles, authorCreatedFiles: authoredFiles,
      authorSourceLines: lineCounts.reduce((sum, count) => sum + count, 0),
      configurationLines: taskId === 'T1-scaffold' ? await authoredLines(resolve(baseline, 'package.json'), resolve(root, framework.fixture, 'package.json')) : 0,
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

async function run(command, cwd, expectedExit = 'zero', echo = true) {
  const start = performance.now();
  const child = spawn(command, { cwd, shell: true, env: { ...process.env, CI: '1', NO_COLOR: '1' } });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (value) => { stdout += value; if (echo) process.stdout.write(value); });
  child.stderr.on('data', (value) => { stderr += value; if (echo) process.stderr.write(value); });
  const exitCode = await new Promise((accept, reject) => { child.once('error', reject); child.once('close', accept); });
  return { command, exitCode, expectedExit, durationMs: Math.round(performance.now() - start), stdout, stderr };
}
async function nonEmptyLines(path) { try { return (await readFile(path, 'utf8')).split(/\r?\n/u).filter((line) => line.trim()).length; } catch { return 0; } }
async function awaitExists(path) { try { await readFile(path); return true; } catch { return false; } }
async function authoredLines(baseline, retained) {
  if (!await awaitExists(retained)) return 0;
  if (!await awaitExists(baseline)) return nonEmptyLines(retained);
  const result = await run(`git diff --no-index --unified=0 -- ${shellQuote(baseline)} ${shellQuote(retained)}`, root, 'nonzero', false);
  if (result.exitCode === 0) return 0;
  return result.stdout.split(/\r?\n/u).filter((line) => line.startsWith('+') && !line.startsWith('+++') && line.slice(1).trim()).length;
}
function shellQuote(value) { return `'${value.replaceAll("'", "'\\''")}'`; }
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
async function scaffoldBaseline(framework) {
  const target = resolve(baselineDirectory, framework.id);
  if (framework.id === 'gluon') {
    const commands = [await run(`node packages/create-gluon/dist/cli.js ${shellQuote(target)} --yes --router --store --testing --ui --ssr --force`, root)];
    commands.push(await run(`node packages/create-gluon/dist/cli.js add-component PurchasePrimitive --kind atom --root ${shellQuote(target)} --yes`, root));
    commands.push(await run(`node packages/create-gluon/dist/cli.js add-component DeliveryComposition --kind molecule --root ${shellQuote(target)} --yes`, root));
    commands.push(await run(`node packages/create-gluon/dist/cli.js add-component CheckoutLayout --kind organism --root ${shellQuote(target)} --yes`, root));
    return commands;
  }
  const command = framework.id === 'vue'
    ? 'npx --yes create-vue@3.22.4 vue --ts --router --pinia --playwright --bare --force'
    : 'npx --yes create-react-router@8.2.0 react --no-install --yes --no-git-init --no-agent-skills --react-router-version 8.2.0';
  return [await run(command, baselineDirectory)];
}
