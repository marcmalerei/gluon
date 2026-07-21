import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { build, preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'benchmarks/runtime-scorecard/vite.config.ts');
const ssrConfigFile = resolve(root, 'benchmarks/runtime-scorecard/ssr.vite.config.ts');
const criteriaFile = resolve(root, 'quality/runtime-performance-criteria.json');
const browserTypes = { chromium, firefox, webkit };
const criteria = JSON.parse(await readFile(criteriaFile, 'utf8'));
const options = parseOptions(process.argv.slice(2), criteria);
const outputPath = resolve(root, options.output);
const markdownPath = outputPath.slice(0, -extname(outputPath).length) + '.md';
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));

validateCriteria(criteria);
await build({ configFile: ssrConfigFile });
const ssr = await measureSsr(options);
await build({ configFile });
const server = await preview({
  configFile,
  preview: { host: '127.0.0.1', port: 0, strictPort: false },
});
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite preview did not expose a local runtime-scorecard URL.');

const browserRuns = [];
try {
  for (const browserName of options.browsers) {
    const browserType = browserTypes[browserName];
    if (!browserType) throw new Error(`Unsupported browser ${browserName}.`);
    let browser;
    try {
      browser = await browserType.launch({ headless: true });
    } catch (error) {
      throw new Error(`Could not launch ${browserName}. Run "npx playwright install ${browserName}" first.`, { cause: error });
    }
    try {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        const consoleProblems = [];
        page.on('console', (message) => {
          if (message.type() === 'error' || message.type() === 'warning') {
            consoleProblems.push({ type: message.type(), text: message.text() });
          }
        });
        await page.goto(url, { waitUntil: 'networkidle' });
        const result = await withTimeout(
          page.evaluate((config) => window.runRuntimeBrowserScorecard(config), {
            samples: options.samples,
            warmupRounds: options.warmupRounds,
            teardownCycles: options.teardownCycles,
          }),
          options.browserTimeoutMs,
          `${browserName} runtime scorecard`,
        );
        if (consoleProblems.length > 0) {
          throw new Error(`${browserName} logged runtime-scorecard errors: ${JSON.stringify(consoleProblems)}`);
        }
        browserRuns.push({
          browser: browserName,
          browserVersion: browser.version(),
          result,
          statistics: Object.fromEntries(
            Object.entries(result.metrics).map(([name, samples]) => [name, summarize(samples)]),
          ),
        });
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}

const failures = validateResults(criteria, ssr, browserRuns);
const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    commit: git('rev-parse', 'HEAD'),
    branch: sourceRef(),
    workingTreeDirty: git('status', '--porcelain').length > 0,
  },
  environment: {
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model ?? 'unknown',
    logicalCpus: cpus().length,
    totalMemoryBytes: totalmem(),
    node: process.version,
    npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
    packages: {
      gluon: packageJson.version,
      playwright: installedVersion('playwright'),
      vite: installedVersion('vite'),
    },
  },
  methodology: {
    productionBuild: true,
    headless: true,
    samples: options.samples,
    warmupRounds: options.warmupRounds,
    teardownCycles: options.teardownCycles,
    browserTimeoutMs: options.browserTimeoutMs,
    lanes: {
      ssr: 'Node renderToString of one 100-row Gluon template',
      hydration: 'retain marker-bearing server DOM in place',
      routing: 'await one public memory-router transition',
      loader: 'load one cached dynamic module through a fresh manifest-driven loader',
      styles: 'retain and release one constructable stylesheet through 100 owners; milliseconds per owner',
      memory: 'mount, interact with, unmount, and probe detached listeners for 30 application roots',
      interaction: 'dispatch one application-owned button interaction and await the reactive update',
      longTasks: 'record PerformanceObserver longtask entries only in engines that expose that entry type',
    },
    correctnessGate: 'every warm-up and measured operation validates its observable output before evidence is accepted',
    isolation: 'one fresh browser context per engine; engine results are never averaged together',
    unit: 'milliseconds; lower is faster',
  },
  criteria,
  ssr,
  browsers: browserRuns,
  passed: failures.length === 0,
  failures,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
const markdown = renderMarkdown(evidence);
await writeFile(markdownPath, markdown, 'utf8');
console.log(markdown);
console.log(`JSON evidence: ${outputPath}`);
console.log(`Markdown summary: ${markdownPath}`);
if (failures.length > 0) throw new Error(`Runtime performance scorecard failed:\n- ${failures.join('\n- ')}`);

async function measureSsr(config) {
  const modulePath = resolve(root, '.tmp/runtime-scorecard-node/ssr.js');
  const { runSsrScorecard } = await import(`${modulePath}?run=${Date.now()}`);
  const result = await runSsrScorecard(config);
  return { ...result, statistics: summarize(result.samples) };
}

function validateResults(expected, ssrResult, runs) {
  const failures = [];
  compareBudget('node', 'ssrRenderMs', ssrResult.statistics.p95, expected, failures);
  for (const run of runs) {
    for (const [name, statistics] of Object.entries(run.statistics)) {
      compareBudget(run.browser, name, statistics.p95, expected, failures);
    }
    for (const [name, value] of Object.entries(expected.invariants)) {
      if (name === 'longTasksWhenObservable') continue;
      if (run.result.correctness[name] !== value) {
        failures.push(`${run.browser} invariant ${name} expected ${JSON.stringify(value)} but received ${JSON.stringify(run.result.correctness[name])}`);
      }
    }
    if (run.result.longTasks.supported && run.result.longTasks.count > expected.invariants.longTasksWhenObservable) {
      failures.push(`${run.browser} observed ${run.result.longTasks.count} long tasks; maximum is ${expected.invariants.longTasksWhenObservable}`);
    }
  }
  return failures;
}

function compareBudget(lane, name, actual, expected, failures) {
  const limit = expected.metrics[name]?.maxP95;
  if (!Number.isFinite(limit)) {
    failures.push(`${lane} metric ${name} has no declared p95 criterion`);
  } else if (actual > limit) {
    failures.push(`${lane} ${name} p95 ${formatMilliseconds(actual)} ms exceeds ${formatMilliseconds(limit)} ms`);
  }
}

function validateCriteria(value) {
  if (value.schemaVersion !== 1) throw new Error('runtime performance criteria schemaVersion must be 1');
  if (!Number.isInteger(value.samples) || value.samples <= 0) throw new Error('criteria.samples must be a positive integer');
  if (!Number.isInteger(value.warmupRounds) || value.warmupRounds < 0) throw new Error('criteria.warmupRounds must be a non-negative integer');
  if (!Number.isInteger(value.teardownCycles) || value.teardownCycles <= 0) throw new Error('criteria.teardownCycles must be a positive integer');
  const metrics = ['ssrRenderMs', 'hydrationMs', 'routeTransitionMs', 'loaderCachedModuleLoadMs', 'styleOwnershipMs', 'teardownThirtyCyclesMs', 'interactionMs'];
  for (const name of metrics) {
    if (!Number.isFinite(value.metrics?.[name]?.maxP95) || value.metrics[name].maxP95 <= 0) {
      throw new Error(`${name}.maxP95 must be a positive number`);
    }
  }
}

function parseOptions(args, defaults) {
  const values = Object.fromEntries(args.map((argument) => {
    const [name, value] = argument.split('=', 2);
    return [name, value];
  }));
  const browsers = (values['--browsers'] ?? 'chromium,firefox,webkit').split(',');
  if (browsers.length === 0 || new Set(browsers).size !== browsers.length || browsers.some((name) => !browserTypes[name])) {
    throw new Error('--browsers must contain unique supported browsers.');
  }
  const output = values['--output'] ?? '.tmp/quality-evidence/runtime-scorecard.json';
  if (extname(output) !== '.json') throw new Error('--output must end in .json.');
  return {
    browsers,
    samples: positiveInteger(values['--samples'] ?? defaults.samples, 'samples'),
    warmupRounds: nonNegativeInteger(values['--warmup'] ?? defaults.warmupRounds, 'warmup'),
    teardownCycles: positiveInteger(values['--teardown-cycles'] ?? defaults.teardownCycles, 'teardown-cycles'),
    browserTimeoutMs: positiveInteger(values['--timeout'] ?? '300000', 'timeout'),
    output,
  };
}

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    min: sorted[0],
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    max: sorted.at(-1),
  };
}

function quantile(sorted, probability) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * probability) - 1)];
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new TypeError(`--${name} must be a positive integer.`);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new TypeError(`--${name} must be a non-negative integer.`);
  return parsed;
}

function installedVersion(packageName) {
  const version = packageLock.packages?.[`node_modules/${packageName}`]?.version;
  if (!version) throw new Error(`package-lock.json has no installed version for ${packageName}.`);
  return version;
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function sourceRef() {
  return process.env.GITHUB_REF_NAME || git('branch', '--show-current') || 'detached';
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs} ms.`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function renderMarkdown(evidence) {
  const lines = [
    '# Runtime performance scorecard',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    `Environment: ${evidence.environment.cpu}, ${evidence.environment.logicalCpus} logical CPUs, ${formatBytes(evidence.environment.totalMemoryBytes)} memory, ${evidence.environment.platform} ${evidence.environment.release}, Node ${evidence.environment.node}`,
    '',
    `Method: production builds, ${evidence.methodology.warmupRounds} warm-ups and ${evidence.methodology.samples} measured samples per lane. Browser engines are reported separately.`,
    '',
    '| Lane | Metric | Median ms | p95 ms | Criterion p95 ms | Status |',
    '| --- | --- | ---: | ---: | ---: | --- |',
  ];
  const ssrLimit = evidence.criteria.metrics.ssrRenderMs.maxP95;
  lines.push(`| node | ssrRenderMs | ${formatMilliseconds(evidence.ssr.statistics.median)} | ${formatMilliseconds(evidence.ssr.statistics.p95)} | ${formatMilliseconds(ssrLimit)} | ${evidence.ssr.statistics.p95 <= ssrLimit ? 'pass' : 'fail'} |`);
  for (const run of evidence.browsers) {
    for (const [name, statistics] of Object.entries(run.statistics)) {
      const limit = evidence.criteria.metrics[name].maxP95;
      lines.push(`| ${run.browser} ${run.browserVersion} | ${name} | ${formatMilliseconds(statistics.median)} | ${formatMilliseconds(statistics.p95)} | ${formatMilliseconds(limit)} | ${statistics.p95 <= limit ? 'pass' : 'fail'} |`);
    }
  }
  lines.push('', '## Correctness and retention', '');
  for (const run of evidence.browsers) {
    lines.push(`- ${run.browser}: all deterministic invariants passed; long-task observation ${run.result.longTasks.supported ? `supported with ${run.result.longTasks.count} entries` : 'not exposed by this engine'}.`);
  }
  lines.push(
    '',
    `Overall: **${evidence.passed ? 'pass' : 'fail'}**. Every raw latency sample, correctness value, browser version, and observed long-task duration is preserved in the accompanying JSON file.`,
    '',
    'This is a Gluon production regression scorecard. It does not compare equivalent implementations in other frameworks and does not support a universal framework-performance ranking.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function formatBytes(value) {
  return `${(value / (1024 ** 3)).toFixed(1)} GiB`;
}

function formatMilliseconds(value) {
  return Number(value).toFixed(value < 0.01 ? 6 : 3);
}
