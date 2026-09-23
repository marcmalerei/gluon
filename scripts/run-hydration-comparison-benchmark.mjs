import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { build, preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const clientConfig = resolve(root, 'benchmarks/hydration-comparison/vite.config.ts');
const serverConfig = resolve(root, 'benchmarks/hydration-comparison/ssr.vite.config.ts');
const options = parseOptions(process.argv.slice(2));
const browserTypes = { chromium, firefox, webkit };
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));

await build({ configFile: clientConfig });
await build({ configFile: serverConfig });
const serverModule = await import(`${pathToFileURL(resolve(root, '.tmp/hydration-comparison/server.mjs')).href}?commit=${git('rev-parse', 'HEAD')}`);
const fixtures = await serverModule.renderHydrationFixtures();

const server = await preview({
  configFile: clientConfig,
  preview: { host: '127.0.0.1', port: 0, strictPort: false },
});
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite preview did not expose a local hydration benchmark URL.');

const runs = [];
try {
  for (const browserName of options.browsers) {
    const browserType = browserTypes[browserName];
    if (!browserType) throw new Error(`Unsupported browser ${browserName}.`);
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const consoleProblems = [];
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          consoleProblems.push({ type: message.type(), text: message.text() });
        }
      });
      await page.goto(url, { waitUntil: 'networkidle' });
      const result = await withTimeout(
        page.evaluate(
          ({ hydrationFixtures, config }) => window.runHydrationComparison(hydrationFixtures, config),
          { hydrationFixtures: fixtures, config: { samples: options.samples, warmupRounds: options.warmupRounds } },
        ),
        options.browserTimeoutMs,
        `${browserName} hydration benchmark`,
      );
      if (consoleProblems.length > 0) {
        throw new Error(`${browserName} logged benchmark errors: ${JSON.stringify(consoleProblems)}`);
      }
      runs.push({ browser: browserName, browserVersion: browser.version(), result });
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}

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
      playwright: installedVersion('playwright'),
      vite: installedVersion('vite'),
    },
  },
  methodology: {
    workload: 'server-rendered 120-row catalog with one interactive button per row',
    samples: options.samples,
    warmupRounds: options.warmupRounds,
    frameworkOrder: 'rotated for every warm-up and measured sample',
    unit: 'milliseconds; lower is faster',
    hydration: 'parse server markup before timing; measure framework hydration only',
    interaction: 'click row 119 after hydration and await framework update completion',
    teardown: 'unmount hydrated application and require an empty benchmark root',
    boundary: 'equivalent behavior with framework-native SSR and hydration APIs; markup transport remains framework-specific',
  },
  fixtures: {
    markupBytes: Object.fromEntries(Object.entries(fixtures).map(([framework, markup]) => [framework, byteLength(markup)])),
  },
  runs,
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
  const browsers = (values['--browsers'] ?? 'chromium,firefox,webkit').split(',');
  const samples = positiveInteger(values['--samples'] ?? '12', 'samples');
  const warmupRounds = nonNegativeInteger(values['--warmup'] ?? '4', 'warmup');
  const browserTimeoutMs = positiveInteger(values['--timeout'] ?? '300000', 'timeout');
  const output = values['--output'] ?? '.tmp/hydration-comparison-results.json';
  if (extname(output) !== '.json') throw new Error('--output must end in .json.');
  return { browsers, samples, warmupRounds, browserTimeoutMs, output };
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

function byteLength(value) {
  return Buffer.byteLength(value);
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
    '# Cross-framework hydration benchmark evidence',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    `Environment: ${evidence.environment.cpu}, ${evidence.environment.logicalCpus} logical CPUs, ${formatBytes(evidence.environment.totalMemoryBytes)} memory, ${evidence.environment.platform} ${evidence.environment.release}, Node ${evidence.environment.node}`,
    '',
    `Packages: Gluon ${evidence.environment.packages.gluon}, Lit ${evidence.environment.packages.lit} with SSR ${evidence.environment.packages.litSsr}/${evidence.environment.packages.litSsrClient}, Vue ${evidence.environment.packages.vue}, Playwright ${evidence.environment.packages.playwright}`,
    '',
    `Method: ${evidence.methodology.samples} interleaved samples after ${evidence.methodology.warmupRounds} warm-ups. The server markup is installed before timing; hydration, row-119 interaction, and teardown are measured separately.`,
    '',
  ];
  for (const run of evidence.runs) {
    lines.push(`## ${run.browser} ${run.browserVersion}`, '');
    lines.push('| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |', '| --- | ---: | ---: | ---: | ---: |');
    for (const result of run.result.results) {
      lines.push(`| ${result.framework} | ${result.samples[0]?.markupBytes ?? 'n/a'} | ${formatStatistics(result.statistics.hydrationMs)} | ${formatStatistics(result.statistics.interactionMs)} | ${formatStatistics(result.statistics.teardownMs)} |`);
    }
    lines.push('');
  }
  lines.push('Correctness requires retained server main identity, 120 rows, a successful row-119 interaction, and an empty root after teardown. Cross-framework streaming, concurrent request capacity, and memory/GC behavior are outside this lane.', '');
  return `${lines.join('\n')}\n`;
}

function formatStatistics(statistics) {
  return `${formatMilliseconds(statistics.median)} / ${formatMilliseconds(statistics.p95)}`;
}

function formatBytes(value) {
  return `${(value / (1024 ** 3)).toFixed(1)} GiB`;
}

function formatMilliseconds(value) {
  return value < 0.01 ? value.toFixed(6) : value.toFixed(4);
}
