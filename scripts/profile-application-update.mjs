import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'benchmarks/application/vite.config.ts');
const options = parseOptions(process.argv.slice(2));
const outputPath = resolve(root, options.output);

await build({ configFile });
const server = await preview({
  configFile,
  preview: { host: '127.0.0.1', port: 0, strictPort: false },
});
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite preview did not expose a local application profile URL.');

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const session = await context.newCDPSession(page);
    await session.send('Profiler.enable');
    await session.send('Profiler.setSamplingInterval', { interval: options.interval });
    await session.send('Profiler.start');
    const measurement = await page.evaluate(
      (config) => window.runGluonApplicationProfile(config),
      {
        scenario: options.scenario,
        warmupIterations: options.warmup,
        measuredIterations: options.iterations,
      },
    );
    const { profile } = await session.send('Profiler.stop');
    await session.send('Profiler.disable');
    const profilePath = outputPath.replace(/\.json$/u, '.cpuprofile');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(profilePath, `${JSON.stringify(profile)}\n`, 'utf8');
    const evidence = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: {
        commit: git('rev-parse', 'HEAD'),
        branch: sourceRef(),
        workingTreeDirty: git('status', '--porcelain').length > 0,
      },
      environment: { chromium: browser.version(), node: process.version },
      methodology: {
        productionBuild: true,
        framework: 'gluon',
        scenario: options.scenario,
        warmupIterations: options.warmup,
        measuredIterations: options.iterations,
        samplingIntervalMicroseconds: options.interval,
      },
      measurement,
      profile: basename(profilePath),
      profileSummary: summarizeProfile(profile, options.interval),
    };
    await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

function summarizeProfile(profile, interval) {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const counts = new Map();
  for (const id of profile.samples ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  const totalSamples = [...counts.values()].reduce((total, count) => total + count, 0);
  return [...counts.entries()]
    .map(([id, count]) => {
      const frame = nodes.get(id)?.callFrame;
      return {
        functionName: frame?.functionName || '(anonymous)',
        url: frame?.url || '',
        lineNumber: (frame?.lineNumber ?? -1) + 1,
        columnNumber: (frame?.columnNumber ?? -1) + 1,
        selfSamples: count,
        selfTimeMs: count * interval / 1_000,
        selfPercent: totalSamples === 0 ? 0 : count / totalSamples * 100,
      };
    })
    .sort((left, right) => right.selfSamples - left.selfSamples)
    .slice(0, 40);
}

function parseOptions(args) {
  const values = Object.fromEntries(args.map((argument) => argument.split('=', 2)));
  const output = values['--output'] ?? '.tmp/application-update-profile.json';
  if (extname(output) !== '.json') throw new Error('--output must end in .json.');
  return {
    output,
    scenario: values['--scenario'] ?? 'filter',
    warmup: positiveInteger(values['--warmup'] ?? '200', 'warmup'),
    iterations: positiveInteger(values['--iterations'] ?? '1000', 'iterations'),
    interval: positiveInteger(values['--interval'] ?? '100', 'interval'),
  };
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new TypeError(`--${name} must be a positive integer.`);
  return parsed;
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function sourceRef() {
  return process.env.GITHUB_REF_NAME || git('branch', '--show-current') || 'detached';
}
