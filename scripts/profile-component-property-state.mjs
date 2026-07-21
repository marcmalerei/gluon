import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { basename, dirname, extname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'benchmarks/components/vite.config.ts');
const options = parseOptions(process.argv.slice(2));
const outputPath = resolve(root, options.output);
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));

await build({ configFile });
const server = await preview({
  configFile,
  preview: { host: '127.0.0.1', port: 0, strictPort: false },
});
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite preview did not expose a local component-profile URL.');

const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
const runs = [];
try {
  for (const scenario of ['property', 'state']) {
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
      const session = await context.newCDPSession(page);
      await session.send('Profiler.enable');
      await session.send('Profiler.setSamplingInterval', { interval: options.samplingIntervalMicroseconds });
      await session.send('Profiler.start');
      const measurement = await page.evaluate(
        (config) => window.runComponentProfile(config),
        {
          framework: 'gluon',
          scenario,
          warmupIterations: options.warmupIterations,
          measuredIterations: options.measuredIterations,
        },
      );
      const { profile } = await session.send('Profiler.stop');
      await session.send('Profiler.disable');
      if (consoleProblems.length > 0) {
        throw new Error(`${scenario} profile logged errors: ${JSON.stringify(consoleProblems)}`);
      }
      const profilePath = outputPath.replace(/\.json$/, `-${scenario}.cpuprofile`);
      await mkdir(dirname(profilePath), { recursive: true });
      await writeFile(profilePath, `${JSON.stringify(profile)}\n`, 'utf8');
      runs.push({
        scenario,
        measurement,
        profile: basename(profilePath),
        profileSummary: summarizeProfile(profile, options.samplingIntervalMicroseconds),
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
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
    chromium: browserVersion,
    packages: {
      gluon: packageJson.version,
      lit: installedVersion('lit'),
      playwright: installedVersion('playwright'),
      vite: installedVersion('vite'),
    },
  },
  methodology: {
    productionBuild: true,
    headless: true,
    framework: 'gluon',
    componentCount: 50,
    warmupIterations: options.warmupIterations,
    measuredIterations: options.measuredIterations,
    samplingIntervalMicroseconds: options.samplingIntervalMicroseconds,
    scenarioIsolation: 'fresh browser context and CPU profile per scenario',
  },
  runs,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(evidence, null, 2));
console.log(`Profile summary: ${outputPath}`);

function summarizeProfile(profile, interval) {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const sampleCounts = new Map();
  for (const id of profile.samples ?? []) sampleCounts.set(id, (sampleCounts.get(id) ?? 0) + 1);
  const totalSamples = [...sampleCounts.values()].reduce((total, count) => total + count, 0);
  return [...sampleCounts.entries()]
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
    .slice(0, 30);
}

function parseOptions(args) {
  const values = Object.fromEntries(args.map((argument) => {
    const [name, value] = argument.split('=', 2);
    return [name, value];
  }));
  const output = values['--output'] ?? '.tmp/component-property-state-profile.json';
  if (extname(output) !== '.json') throw new Error('--output must end in .json.');
  return {
    output,
    warmupIterations: positiveInteger(values['--warmup'] ?? '1000', 'warmup'),
    measuredIterations: positiveInteger(values['--iterations'] ?? '20000', 'iterations'),
    samplingIntervalMicroseconds: positiveInteger(values['--interval'] ?? '100', 'interval'),
  };
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new TypeError(`--${name} must be a positive integer.`);
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
