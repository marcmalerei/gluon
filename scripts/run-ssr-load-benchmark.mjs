import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'benchmarks/ssr-load/vite.config.ts');
const options = parseOptions(process.argv.slice(2));
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));

await build({ configFile });
const moduleUrl = `${pathToFileURL(resolve(root, '.tmp/ssr-load/ssr-load.js')).href}?commit=${git('rev-parse', 'HEAD')}`;
const { frameworks, modes, runLoadBatch } = await import(moduleUrl);
const results = { string: [], stream: [] };
const warmup = [];

for (let round = 0; round < options.warmup; round += 1) {
  for (const framework of rotated(frameworks, round)) {
    for (const mode of selectedModes(options.mode, modes)) {
      warmup.push(await runLoadBatch(framework, mode, options));
    }
  }
}
for (let batch = 0; batch < options.batches; batch += 1) {
  for (const framework of rotated(frameworks, batch + options.warmup)) {
    for (const mode of selectedModes(options.mode, modes)) {
      results[mode].push(await runLoadBatch(framework, mode, options));
    }
  }
}

if (options.mode === 'all') {
  for (const framework of frameworks) {
    const stringOutput = results.string.find((result) => result.framework === framework)?.output;
    const streamOutput = results.stream.find((result) => result.framework === framework)?.output;
    if (!stringOutput || !streamOutput || stringOutput.bytes !== streamOutput.bytes || stringOutput.sha256 !== streamOutput.sha256) {
      throw new Error(`${framework} stream output did not match its complete-string output.`);
    }
  }
}

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    commit: git('rev-parse', 'HEAD'),
    branch: process.env.GITHUB_REF_NAME || git('branch', '--show-current') || 'detached',
    workingTreeDirty: git('status', '--porcelain').length > 0,
  },
  environment: {
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model ?? 'unknown',
    logicalCpus: cpus().length,
    totalMemoryBytes: totalmem(),
    node: process.version,
    nodeExecArgv: process.execArgv,
    npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
    packages: {
      gluon: packageJson.version,
      lit: installedVersion('lit'),
      litSsr: installedVersion('@lit-labs/ssr'),
      vue: installedVersion('vue'),
      vueServerRenderer: installedVersion('@vue/server-renderer'),
    },
  },
  methodology: {
    workload: '120 keyed product rows rendered to complete HTML and fully consumed streams',
    modes: options.mode === 'all' ? modes : [options.mode],
    concurrency: options.concurrency,
    requestsPerMeasuredBatch: options.requests,
    measuredBatchesPerFramework: options.batches,
    warmupBatchesPerFramework: options.warmup,
    frameworkOrder: 'rotated per warm-up and measured batch',
    streamContract: 'time ends after the complete stream has been consumed; output bytes and SHA-256 must match the string lane',
    memoryContract: 'process RSS/heap/external/arrayBuffers are observed before and after every batch; forced GC is reported only when --expose-gc is active',
    thresholds: 'none; this lane retains observations and does not establish CI performance limits',
  },
  warmup,
  results,
};

const outputPath = resolve(root, options.output);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
const markdownPath = outputPath.slice(0, -extname(outputPath).length) + '.md';
await writeFile(markdownPath, renderMarkdown(evidence), 'utf8');
console.log(renderMarkdown(evidence));
console.log(`JSON evidence: ${outputPath}`);
console.log(`Markdown summary: ${markdownPath}`);

function parseOptions(args) {
  const values = Object.fromEntries(args.map((argument) => argument.split('=', 2)));
  return {
    mode: values['--mode'] ?? 'all',
    concurrency: positiveInteger(values['--concurrency'] ?? '4', 'concurrency'),
    requests: positiveInteger(values['--requests'] ?? '32', 'requests'),
    batches: positiveInteger(values['--batches'] ?? '3', 'batches'),
    warmup: nonNegativeInteger(values['--warmup'] ?? '1', 'warmup'),
    output: values['--output'] ?? '.tmp/ssr-load-results.json',
  };
}

function selectedModes(mode, available) {
  if (mode === 'all') return available;
  if (!available.includes(mode)) throw new Error(`--mode must be one of ${available.join(', ')} or all.`);
  return [mode];
}

function rotated(values, offset) {
  const start = offset % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
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

function installedVersion(name) {
  const version = packageLock.packages?.[`node_modules/${name}`]?.version;
  if (!version) throw new Error(`package-lock.json has no installed version for ${name}.`);
  return version;
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function pathToFileURL(path) {
  return new URL(`file://${path}`);
}

function renderMarkdown(evidence) {
  const lines = [
    '# SSR load and memory evidence',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    `Environment: ${evidence.environment.cpu}, ${evidence.environment.logicalCpus} logical CPUs, ${(evidence.environment.totalMemoryBytes / 1024 ** 3).toFixed(1)} GiB, ${evidence.environment.platform} ${evidence.environment.release}, Node ${evidence.environment.node} (${evidence.environment.nodeExecArgv.join(' ') || 'no exec flags'})`,
    '',
    `Method: ${evidence.methodology.requestsPerMeasuredBatch} requests per batch at concurrency ${evidence.methodology.concurrency}, ${evidence.methodology.measuredBatchesPerFramework} measured batches after ${evidence.methodology.warmupBatchesPerFramework} warm-up batches; framework order is rotated.`,
    '',
    '| Mode | Framework | Requests | Errors | Median ms | p95 ms | p99 ms | Throughput req/s | RSS delta | Forced GC |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const mode of evidence.methodology.modes) {
    for (const batch of evidence.results[mode]) {
      lines.push(`| ${mode} | ${batch.framework} | ${batch.requests} | ${batch.errors} | ${batch.statistics.median.toFixed(3)} | ${batch.statistics.p95.toFixed(3)} | ${batch.statistics.p99.toFixed(3)} | ${batch.throughputRequestsPerSecond.toFixed(1)} | ${formatBytes(batch.memory.after.rss - batch.memory.before.rss)} | ${batch.memory.forcedGc ? 'yes' : 'no'} |`);
    }
  }
  lines.push('', 'This evidence separates complete-string and fully-consumed stream timing. It reports observations for the declared workload only and sets no regression threshold; raw request samples and memory observations remain in the JSON file.', '');
  return `${lines.join('\n')}\n`;
}

function formatBytes(value) {
  const sign = value < 0 ? '-' : '';
  return `${sign}${Math.abs(value / 1024).toFixed(1)} KiB`;
}
