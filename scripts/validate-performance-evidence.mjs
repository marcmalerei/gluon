import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, option('--directory') ?? '.tmp/quality-evidence');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const browsers = ['chromium', 'firefox', 'webkit'];
const summary = { schemaVersion: 1, commit, browsers: {} };

for (const browser of browsers) {
  const rendering = await readJson(`rendering-${browser}.json`);
  validateBrowserRuns(rendering, 'runs', browser, 'rendering');
  const components = await readJson(`components-${browser}.json`);
  validateBrowserRuns(components, 'runs', browser, 'components');
  const runtime = await readJson(`runtime-scorecard-${browser}.json`);
  validateBrowserRuns(runtime, 'browsers', browser, 'runtime scorecard');
  if (runtime.passed !== true || runtime.failures?.length !== 0) {
    throw new Error(`${browser} runtime scorecard did not retain a passing result.`);
  }
  await requireText(`rendering-${browser}.md`);
  await requireText(`components-${browser}.md`);
  await requireText(`runtime-scorecard-${browser}.md`);
  summary.browsers[browser] = {
    rendering: rendering.runs[0].browserVersion,
    components: components.runs[0].browserVersion,
    runtime: runtime.browsers[0].browserVersion,
  };
}

const bundle = await readJson('bundle-matrix.json');
if (bundle.schemaVersion !== 1) throw new Error('Bundle evidence schemaVersion must be 1.');
for (const fixture of ['gluon', 'lit', 'vue', 'react']) {
  if (typeof bundle.fixtures?.[fixture]?.parity?.browser !== 'string') {
    throw new Error(`Bundle evidence is missing Chromium parity for ${fixture}.`);
  }
}

const loader = await readJson('component-library-loader.json');
validateChromiumReport(loader, 'component-library loader');
await requireText('component-library-loader.png');

const storybook = await readJson('storybook-component-library.json');
validateChromiumReport(storybook, 'Storybook');
if (!Array.isArray(storybook.stories) || storybook.stories.length === 0) {
  throw new Error('Storybook evidence must contain rendered stories.');
}
for (const story of storybook.stories) {
  if (story.accessibilityViolations !== 0 || story.baseline !== 'matched') {
    throw new Error(`Storybook evidence for ${story.id} is not a clean baseline match.`);
  }
  await requireText(`storybook-${story.id}.png`);
}

const shop = await readJson('shop-flow.json');
validateSource(shop, 'shop performance');
if (shop.passed !== true || shop.failures?.length !== 0) {
  throw new Error('Shop performance evidence did not retain a passing result.');
}
await requireText('shop-flow.md');

console.log(JSON.stringify(summary, null, 2));
console.log(`performance evidence complete: ${browsers.length} engines plus Chromium bundle, loader, Storybook, and shop gates`);

function option(name) {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
}

async function readJson(name) {
  const path = resolve(directory, name);
  let source;
  try {
    source = await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`Missing performance evidence ${path}.`, { cause: error });
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON performance evidence ${path}.`, { cause: error });
  }
}

async function requireText(name) {
  const path = resolve(directory, name);
  let contents;
  try {
    contents = await readFile(path);
  } catch (error) {
    throw new Error(`Missing performance evidence ${path}.`, { cause: error });
  }
  if (contents.length === 0) throw new Error(`Performance evidence ${path} is empty.`);
}

function validateBrowserRuns(evidence, key, browser, label) {
  validateSource(evidence, `${browser} ${label}`);
  const runs = evidence[key];
  if (!Array.isArray(runs) || runs.length !== 1 || runs[0]?.browser !== browser) {
    throw new Error(`${browser} ${label} evidence must contain exactly its own engine run.`);
  }
}

function validateSource(evidence, label) {
  if (evidence.schemaVersion !== 1) throw new Error(`${label} evidence schemaVersion must be 1.`);
  if (evidence.source?.commit !== commit) {
    throw new Error(`${label} evidence commit ${evidence.source?.commit ?? 'missing'} does not match ${commit}.`);
  }
}

function validateChromiumReport(report, label) {
  if (report.schemaVersion !== 1) throw new Error(`${label} evidence schemaVersion must be 1.`);
  if (report.browser?.name !== 'chromium' || typeof report.browser.version !== 'string') {
    throw new Error(`${label} evidence must retain its Chromium version.`);
  }
}
