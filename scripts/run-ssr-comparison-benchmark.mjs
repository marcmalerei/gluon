import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'benchmarks/ssr-comparison/vite.config.ts');
const options = parseOptions(process.argv.slice(2));
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));

await build({ configFile });
const moduleUrl = `${pathToFileURL(resolve(root, '.tmp/ssr-comparison/ssr.js')).href}?commit=${git('rev-parse', 'HEAD')}`;
const { runSsrComparison } = await import(moduleUrl);
const benchmark = await runSsrComparison({ samples: options.samples, warmupRounds: options.warmupRounds });

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
      lit: installedVersion('lit'),
      litSsr: installedVersion('@lit-labs/ssr'),
      litSsrClient: installedVersion('@lit-labs/ssr-client'),
      vue: installedVersion('vue'),
      vueServerRenderer: installedVersion('@vue/server-renderer'),
    },
  },
  methodology: {
    workload: '120 keyed product rows in one catalog main/section/list tree',
    samples: options.samples,
    warmupRounds: options.warmupRounds,
    frameworkOrder: 'rotated for every warm-up and measured sample',
    unit: 'milliseconds per complete string render; lower is faster',
    output: 'complete HTML string; this lane does not measure streaming or browser hydration',
  },
  benchmark,
};

const outputPath = resolve(root, options.output);
const markdownPath = outputPath.slice(0, -extname(outputPath).length) + '.md';
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
const markdown = renderMarkdown(evidence);
await writeFile(markdownPath, markdown, 'utf8');
console.log(markdown);
console.log(`JSON evidence: ${outputPath}`);
console.log(`Markdown summary: ${markdownPath}`);

function parseOptions(args) {
  const values = Object.fromEntries(args.map((argument) => argument.split('=', 2)));
  const samples = positiveInteger(values['--samples'] ?? '20', 'samples');
  const warmupRounds = nonNegativeInteger(values['--warmup'] ?? '5', 'warmup');
  const output = values['--output'] ?? '.tmp/ssr-comparison-results.json';
  if (extname(output) !== '.json') throw new Error('--output must end in .json.');
  return { samples, warmupRounds, output };
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`--${name} must be a positive integer.`);
  return parsed;
}

function nonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`--${name} must be a non-negative integer.`);
  return parsed;
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function sourceRef() {
  return process.env.GITHUB_REF_NAME || git('branch', '--show-current') || 'detached';
}

function installedVersion(packageName) {
  const version = packageLock.packages?.[`node_modules/${packageName}`]?.version;
  if (!version) throw new Error(`package-lock.json has no installed version for ${packageName}.`);
  return version;
}

function renderMarkdown(evidence) {
  const lines = [
    '# SSR comparison benchmark evidence',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    `Environment: ${evidence.environment.cpu}, ${evidence.environment.logicalCpus} logical CPUs, ${formatBytes(evidence.environment.totalMemoryBytes)} memory, ${evidence.environment.platform} ${evidence.environment.release}, Node ${evidence.environment.node}`,
    '',
    `Packages: Gluon ${evidence.environment.packages.gluon}, Lit ${evidence.environment.packages.lit} with @lit-labs/ssr ${evidence.environment.packages.litSsr}, Vue ${evidence.environment.packages.vue} with @vue/server-renderer ${evidence.environment.packages.vueServerRenderer}`,
    '',
    `Method: ${evidence.methodology.samples} interleaved samples after ${evidence.methodology.warmupRounds} warm-ups, rotating framework order. The workload renders ${evidence.methodology.workload}. Lower milliseconds per complete string render is faster.`,
    '',
    '| Framework | Median ms | p95 ms | Markup bytes | vs Gluon |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];
  const gluon = evidence.benchmark.results.find((result) => result.framework === 'gluon');
  for (const result of evidence.benchmark.results) {
    lines.push(`| ${result.framework} | ${formatMilliseconds(result.statistics.median)} | ${formatMilliseconds(result.statistics.p95)} | ${result.markupBytes} | ${(result.statistics.median / gluon.statistics.median).toFixed(2)}× |`);
  }
  lines.push('', 'This lane compares complete Node string rendering only. It does not claim streaming throughput, request concurrency, memory/GC behavior, or browser hydration equivalence.', 'Every measured sample and correctness snapshot is preserved in the accompanying JSON file.', '');
  return `${lines.join('\n')}\n`;
}

function formatBytes(value) {
  return `${(value / (1024 ** 3)).toFixed(1)} GiB`;
}

function formatMilliseconds(value) {
  return value < 0.01 ? value.toFixed(6) : value.toFixed(4);
}
