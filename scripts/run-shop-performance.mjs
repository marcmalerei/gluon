import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'examples/shop/vite.config.ts');
const budgetFile = resolve(root, 'quality/shop-performance-budgets.json');
const budgets = JSON.parse(await readFile(budgetFile, 'utf8'));
const options = parseOptions(process.argv.slice(2), budgets);
const outputPath = resolve(root, options.output);
const markdownPath = outputPath.slice(0, -extname(outputPath).length) + '.md';

validateBudgets(budgets);
await build({ configFile });
const server = await preview({ configFile });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite preview did not expose a local GLUON GOODS URL.');

const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
const samples = [];
try {
  for (let round = 0; round < options.warmupRounds + options.samples; round += 1) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const consoleProblems = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleProblems.push({ type: message.type(), text: message.text() });
      }
    });
    try {
      const result = await measureCustomerFlow(page, url);
      if (consoleProblems.length > 0) {
        throw new Error(`GLUON GOODS logged performance-flow problems: ${JSON.stringify(consoleProblems)}`);
      }
      if (round >= options.warmupRounds) samples.push(result);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}

const metricNames = Object.keys(budgets.metrics);
const statistics = Object.fromEntries(metricNames.map((name) => [
  name,
  summarize(samples.map((sample) => sample[name])),
]));
const failures = metricNames.flatMap((name) => {
  const actual = statistics[name].p95;
  const limit = budgets.metrics[name].maxP95;
  return actual > limit
    ? [`${name} p95 ${formatMilliseconds(actual)} ms exceeds ${formatMilliseconds(limit)} ms by ${formatMilliseconds(actual - limit)} ms`]
    : [];
});
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
    chromium: browserVersion,
  },
  methodology: {
    productionBuild: true,
    headless: true,
    viewport: { width: 1440, height: 900 },
    samples: options.samples,
    warmupRounds: options.warmupRounds,
    flow: ['home ready', 'product navigation', 'add to bag', 'checkout navigation'],
    unit: 'milliseconds; lower is faster',
  },
  budgets: budgets.metrics,
  statistics,
  samples,
  passed: failures.length === 0,
  failures,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
await writeFile(markdownPath, renderMarkdown(evidence), 'utf8');
console.log(renderMarkdown(evidence));
console.log(`JSON evidence: ${outputPath}`);
console.log(`Markdown summary: ${markdownPath}`);
if (failures.length > 0) throw new Error(`GLUON GOODS performance budget failed:\n- ${failures.join('\n- ')}`);

async function measureCustomerFlow(page, url) {
  let started = performance.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Objects that work the way you do.' }).waitFor();
  const initialRouteReadyMs = performance.now() - started;

  started = performance.now();
  await page.locator('a[aria-label^="Orbit Lamp"]').click();
  await page.getByRole('heading', { name: 'Orbit Lamp', exact: true }).waitFor();
  const productNavigationMs = performance.now() - started;

  started = performance.now();
  await page.locator('.add-to-bag').click();
  await page.getByRole('dialog', { name: /^Bag/ }).waitFor();
  const bagOpenMs = performance.now() - started;

  started = performance.now();
  await page.locator('.bag-summary a').click();
  await page.getByRole('heading', { name: 'Delivery details' }).waitFor();
  const checkoutNavigationMs = performance.now() - started;

  return { initialRouteReadyMs, productNavigationMs, bagOpenMs, checkoutNavigationMs };
}

function parseOptions(args, defaults) {
  const values = Object.fromEntries(args.map((argument) => {
    const [name, value] = argument.split('=', 2);
    return [name, value];
  }));
  return {
    samples: positiveInteger(values['--samples'] ?? defaults.samples, 'samples'),
    warmupRounds: nonNegativeInteger(values['--warmup'] ?? defaults.warmupRounds, 'warmup'),
    output: values['--output'] ?? '.tmp/quality-evidence/shop-flow.json',
  };
}

function validateBudgets(value) {
  if (value.schemaVersion !== 1) throw new Error('shop performance budget schemaVersion must be 1');
  for (const name of ['initialRouteReadyMs', 'productNavigationMs', 'bagOpenMs', 'checkoutNavigationMs']) {
    const limit = value.metrics?.[name]?.maxP95;
    if (!Number.isFinite(limit) || limit <= 0) throw new Error(`${name}.maxP95 must be a positive number`);
  }
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

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function sourceRef() {
  return process.env.GITHUB_REF_NAME || git('branch', '--show-current') || 'detached';
}

function renderMarkdown(evidence) {
  const lines = [
    '# GLUON GOODS customer-flow performance evidence',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    `Environment: ${evidence.environment.chromium}, ${evidence.environment.cpu}, ${evidence.environment.platform} ${evidence.environment.release}`,
    '',
    `Method: production build, ${evidence.methodology.warmupRounds} warm-ups, ${evidence.methodology.samples} samples, ${evidence.methodology.viewport.width}×${evidence.methodology.viewport.height}, milliseconds; lower is faster.`,
    '',
    '| Metric | Median ms | p95 ms | Budget p95 ms | Status |',
    '| --- | ---: | ---: | ---: | --- |',
  ];
  for (const [name, value] of Object.entries(evidence.statistics)) {
    const limit = evidence.budgets[name].maxP95;
    lines.push(`| ${name} | ${formatMilliseconds(value.median)} | ${formatMilliseconds(value.p95)} | ${formatMilliseconds(limit)} | ${value.p95 <= limit ? 'pass' : 'fail'} |`);
  }
  lines.push('', 'Every measured sample is preserved in the accompanying JSON file.', '');
  return `${lines.join('\n')}\n`;
}

function formatMilliseconds(value) {
  return Number(value).toFixed(2);
}
