import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'benchmarks/allocations/vite.config.ts');
const options = parseOptions(process.argv.slice(2));
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const outputPath = resolve(root, options.output);
const markdownPath = outputPath.slice(0, -extname(outputPath).length) + '.md';

await build({ configFile });
const server = await preview({ configFile });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite preview did not expose a local allocation benchmark URL.');

const browser = await chromium.launch({ headless: true, args: ['--js-flags=--expose-gc'] });
let result;
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const benchmark = await page.evaluate(
    (config) => window.runRendererAllocationBenchmark(config),
    { samples: options.samples, warmupRounds: options.warmupRounds },
  );
  const session = await page.context().newCDPSession(page);
  await forceGarbageCollection(page);
  const before = await session.send('Runtime.getHeapUsage');
  const retention = await page.evaluate(
    (count) => window.retainTemplateResults(count),
    options.retainedTemplates,
  );
  await forceGarbageCollection(page);
  const after = await session.send('Runtime.getHeapUsage');
  await page.evaluate(() => window.releaseRetainedTemplateResults());
  result = {
    benchmark,
    memory: {
      method: 'Chromium Runtime.getHeapUsage after forced GC; retained TemplateResults remain reachable',
      retainedTemplates: retention.count,
      sharedEmptyStyleDependencies: retention.sharedEmptyStyleDependencies,
      usedHeapBeforeBytes: before.usedSize,
      usedHeapAfterBytes: after.usedSize,
      retainedHeapDeltaBytes: after.usedSize - before.usedSize,
    },
  };
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
      playwright: installedVersion('playwright'),
      vite: installedVersion('vite'),
    },
    browser: {
      name: 'chromium',
      version: browser.version(),
    },
  },
  methodology: {
    samples: options.samples,
    warmupRounds: options.warmupRounds,
    minimumBatchDurationMs: 12,
    unit: 'milliseconds per operation; lower is faster',
    memoryScope: 'Chromium-only retained-heap diagnostic; not a cross-browser memory claim',
  },
  ...result,
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
  const retainedTemplates = positiveInteger(values['--retained'] ?? '100000', 'retained');
  const output = values['--output'] ?? '.tmp/renderer-allocation-results.json';
  if (extname(output) !== '.json') throw new Error('--output must end in .json.');
  return { samples, warmupRounds, retainedTemplates, output };
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`--${name} must be a positive integer.`);
  return parsed;
}

async function forceGarbageCollection(page) {
  await page.evaluate(() => {
    const collect = globalThis.gc;
    if (typeof collect !== 'function') throw new Error('Chromium did not expose gc().');
    collect();
  });
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
    '# Renderer allocation benchmark evidence',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    `Environment: ${evidence.environment.cpu}, Chromium ${evidence.environment.browser.version}, Node ${evidence.environment.node}`,
    '',
    `Method: production build, batches calibrated to at least ${evidence.methodology.minimumBatchDurationMs} ms, ${evidence.methodology.warmupRounds} warm-up rounds, and ${evidence.methodology.samples} measured samples. Lower latency is faster.`,
    '',
    '| Scenario | Batch | Median ms/op | p95 ms/op |',
    '| --- | ---: | ---: | ---: |',
  ];
  for (const scenario of evidence.benchmark.scenarios) {
    lines.push(`| ${scenario.scenario} | ${scenario.batchSize} | ${formatMilliseconds(scenario.statistics.median)} | ${formatMilliseconds(scenario.statistics.p95)} |`);
  }
  lines.push(
    '',
    `Retained heap diagnostic: ${evidence.memory.retainedTemplates.toLocaleString('en-US')} reachable TemplateResults added ${evidence.memory.retainedHeapDeltaBytes.toLocaleString('en-US')} bytes after forced GC; empty style metadata ${evidence.memory.sharedEmptyStyleDependencies ? 'was shared' : 'was not shared'}.`,
    '',
    'The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.',
    '',
    'Every measured timing sample is preserved in the accompanying JSON file.',
    '',
  );
  return lines.join('\n');
}

function formatMilliseconds(value) {
  return value < 0.01 ? value.toFixed(7) : value.toFixed(4);
}
