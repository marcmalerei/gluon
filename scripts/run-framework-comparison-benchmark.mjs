import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const options = parseOptions(process.argv.slice(2));
const workDir = resolve(root, '.tmp/framework-comparison');
const sourceCommit = git('rev-parse', 'HEAD');

await mkdir(workDir, { recursive: true });
run('node', ['scripts/run-rendering-benchmark.mjs', ...runnerArgs('rendering')]);
run('node', ['scripts/run-application-benchmark.mjs', ...runnerArgs('application')]);
run('node', ['scripts/run-hydration-comparison-benchmark.mjs', ...runnerArgs('hydration'), `--gluon-verification=${options.gluonVerification}`]);
run('npm', ['run', 'build:core']);
run('npm', ['run', 'build:ssr']);
run('node', ['scripts/run-ssr-comparison-benchmark.mjs', `--samples=${options.samples}`, `--warmup=${options.warmupRounds}`, `--output=${pathFor('ssr')}`]);

const suites = {};
for (const name of ['rendering', 'application', 'hydration', 'ssr']) {
  suites[name] = JSON.parse(await readFile(pathFor(name), 'utf8'));
}

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    commit: sourceCommit,
    branch: sourceRef(),
    workingTreeDirty: git('status', '--porcelain').length > 0,
  },
  scope: {
    claim: 'Gluon, Lit, and Vue on the same workloads and current repository commit.',
    includedOptimizations: [
      'All current Gluon production code at the recorded commit, including the adjacent keyed-swap fast path.',
      'Current template, spread, allocation, style, SSR, and hydration paths built by the repository runners.',
      `Gluon hydration verification: ${options.gluonVerification}.`,
    ],
    adjacentSwapEvidence: 'benchmarks/results/keyed-adjacent-swap-634.json',
  },
  methodology: {
    browsers: options.browsers,
    samples: options.samples,
    warmupRounds: options.warmupRounds,
    suites: [
      'rendering: text update, create/update/reverse of 1,000 keyed rows',
      'application: 120-row product flow with filter, sort, configuration, bag, and teardown actions',
      'hydration: 120-row server-rendered catalog, interaction, and teardown',
      'ssr: complete 120-row catalog string render in Node',
    ],
    unit: 'milliseconds; lower is faster',
    interpretation: 'Ratios are suite- and browser-specific. They do not establish a universal framework ranking.',
  },
  suites,
};

const outputPath = resolve(root, options.output);
await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
const markdownPath = outputPath.replace(/\.json$/u, '.md');
await writeFile(markdownPath, renderMarkdown(evidence), 'utf8');
console.log(`Framework comparison JSON: ${outputPath}`);
console.log(`Framework comparison Markdown: ${markdownPath}`);

function runnerArgs(name) {
  return [
    `--browsers=${options.browsers.join(',')}`,
    `--samples=${options.samples}`,
    `--warmup=${options.warmupRounds}`,
    `--timeout=${options.timeout}`,
    `--output=${pathFor(name)}`,
  ];
}

function pathFor(name) {
  return resolve(workDir, `${name}.json`);
}

function parseOptions(args) {
  const values = Object.fromEntries(args.map((argument) => argument.split('=', 2)));
  const browsers = (values['--browsers'] ?? 'chromium,firefox,webkit').split(',');
  const samples = positiveInteger(values['--samples'] ?? '20', 'samples');
  const warmupRounds = nonNegativeInteger(values['--warmup'] ?? '5', 'warmup');
  const timeout = positiveInteger(values['--timeout'] ?? '300000', 'timeout');
  const gluonVerification = values['--gluon-verification'] ?? 'strict';
  if (gluonVerification !== 'strict' && gluonVerification !== 'markers') {
    throw new Error('--gluon-verification must be strict or markers.');
  }
  const output = values['--output'] ?? 'benchmarks/results/framework-comparison-634.json';
  if (!output.endsWith('.json')) throw new Error('--output must end in .json.');
  return { browsers, samples, warmupRounds, timeout, gluonVerification, output };
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

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: 'inherit' });
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function sourceRef() {
  return process.env.GITHUB_REF_NAME || git('branch', '--show-current') || 'detached';
}

function renderMarkdown(evidence) {
  const lines = [
    '# Gluon vs Lit vs Vue framework comparison',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    'This report includes the complete current Gluon build at the recorded commit. The adjacent keyed-swap optimization and all other optimizations present in that build are therefore part of every Gluon measurement.',
    '',
    `Method: ${evidence.methodology.samples} interleaved samples after ${evidence.methodology.warmupRounds} warm-ups; ${evidence.methodology.browsers.join(', ')} where supported; lower milliseconds are faster.`,
    '',
    'Each suite keeps its own workload boundary and correctness checks. Ratios must not be combined across suites or generalized into a universal framework ranking.',
    '',
  ];

  for (const [name, suite] of Object.entries(evidence.suites)) {
    lines.push(`## ${name}`, '');
    const markdownPath = pathFor(name).replace(/\.json$/u, '.md');
    const markdown = readFileSync(markdownPath, 'utf8').trim();
    lines.push(markdown, '');
  }

  lines.push(
    'Raw JSON for every suite and every sample is embedded under `suites` in the accompanying JSON file.',
    `Adjacent-swap focused evidence: [keyed-adjacent-swap-634.json](./keyed-adjacent-swap-634.json).`,
    '',
  );
  return `${lines.join('\n')}\n`;
}
