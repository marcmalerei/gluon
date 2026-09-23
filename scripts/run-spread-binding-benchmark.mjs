import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'benchmarks/spread-bindings/vite.config.ts');
const options = parseOptions(process.argv.slice(2));
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const outputPath = resolve(root, options.output);
const markdownPath = outputPath.slice(0, -extname(outputPath).length) + '.md';

await build({ configFile });
const server = await preview({ configFile, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite preview did not expose a local spread-binding benchmark URL.');

const browser = await chromium.launch({ headless: true });
let benchmark;
try {
  const page = await browser.newPage();
  const consoleProblems = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push({ type: message.type(), text: message.text() });
    }
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  benchmark = await page.evaluate(
    (config) => window.runSpreadBindingBenchmark(config),
    { samples: options.samples, warmupRounds: options.warmupRounds },
  );
  if (consoleProblems.length > 0) {
    throw new Error(`Chromium logged benchmark errors: ${JSON.stringify(consoleProblems)}`);
  }
} finally {
  await browser.close();
  await server.close();
}

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    commit: git('rev-parse', 'HEAD'),
    branch: git('branch', '--show-current') || 'detached',
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
      lit: installedVersion('lit'),
      playwright: installedVersion('playwright'),
      vite: installedVersion('vite'),
    },
    browser: { name: 'chromium', version: browser.version() },
  },
  methodology: {
    fixture: '80 equivalent product cards; Gluon spread, Gluon explicit, and Lit explicit bindings produce the same observable DOM',
    primaryBaseline: 'gluon-explicit',
    spreadIsolation: 'gluon-spread versus gluon-explicit on the same Gluon renderer and workload',
    samples: options.samples,
    warmupRounds: options.warmupRounds,
    minimumBatchDurationMs: 12,
    productionBuild: true,
    frameworkOrder: 'alternated for every warm-up and measured sample',
    unit: 'milliseconds per operation; lower is faster',
  },
  benchmark,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
const markdown = renderMarkdown(evidence);
await writeFile(markdownPath, markdown, 'utf8');
console.log(markdown);
console.log(`JSON evidence: ${outputPath}`);
console.log(`Markdown summary: ${markdownPath}`);

function parseOptions(args) {
  const values = Object.fromEntries(args.map((argument) => argument.split('=', 2)));
  const samples = positiveInteger(values['--samples'] ?? '40', 'samples');
  const warmupRounds = positiveInteger(values['--warmup'] ?? '8', 'warmup');
  const output = values['--output'] ?? '.tmp/spread-binding-results.json';
  if (extname(output) !== '.json') throw new Error('--output must end in .json.');
  return { samples, warmupRounds, output };
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`--${name} must be a positive integer.`);
  return parsed;
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function installedVersion(packageName) {
  const version = packageLock.packages?.[`node_modules/${packageName}`]?.version;
  if (!version) throw new Error(`package-lock.json has no installed version for ${packageName}.`);
  return version;
}

function renderMarkdown(evidence) {
  const lines = [
    '# Spread binding benchmark evidence',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    `Environment: ${evidence.environment.cpu}, Chromium ${evidence.environment.browser.version}, Node ${evidence.environment.node}`,
    '',
    `Method: production build, ${evidence.benchmark.cardCount} cards, ${evidence.methodology.warmupRounds} warm-up rounds, and ${evidence.methodology.samples} interleaved samples. Lower latency is faster.`,
    '',
    '| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon spread | vs Gluon explicit |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const scenario of evidence.benchmark.scenarios) {
    for (const result of scenario.results) {
      lines.push(`| ${scenario.scenario} | ${result.framework} | ${result.batchSize} | ${formatMilliseconds(result.statistics.median)} | ${formatMilliseconds(result.statistics.p95)} | ${result.relativeToGluonSpreadMedian.toFixed(2)}× | ${result.relativeToGluonExplicitMedian.toFixed(2)}× |`);
    }
  }
  lines.push(
    '',
    `Invariants: equivalent DOM ${evidence.benchmark.invariants.equivalentDom ? 'passed' : 'failed'}; stable element identity ${evidence.benchmark.invariants.stableElementIdentity ? 'passed' : 'failed'}; style parity ${evidence.benchmark.invariants.styleParity ? 'passed' : 'failed'}; cleanup ${evidence.benchmark.invariants.cleanupEmptiesRoots ? 'passed' : 'failed'}.`,
    '',
    'The explicit Gluon lane is the no-spread baseline. Values above 1.00× in the `vs Gluon explicit` column indicate the measured spread/framework overhead for that renderer and scenario.',
    '',
    'Every measured sample is preserved in the accompanying JSON file.',
    '',
  );
  return lines.join('\n');
}

function formatMilliseconds(value) {
  return value < 0.01 ? value.toFixed(6) : value.toFixed(4);
}
