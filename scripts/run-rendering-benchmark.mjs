import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { dirname, extname, resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { build, preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const configFile = resolve(root, 'benchmarks/rendering/vite.config.ts');
const options = parseOptions(process.argv.slice(2));
const browserTypes = { chromium, firefox, webkit };
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
const outputPath = resolve(root, options.output);
const markdownPath = outputPath.slice(0, -extname(outputPath).length) + '.md';

await build({ configFile });
const server = await preview({
  configFile,
  preview: { host: '127.0.0.1', port: 0, strictPort: false },
});
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Vite preview did not expose a local benchmark URL.');

const runs = [];
try {
  for (const browserName of options.browsers) {
    const browserType = browserTypes[browserName];
    if (!browserType) throw new Error(`Unsupported browser ${browserName}.`);
    let browser;
    try {
      browser = await browserType.launch({ headless: true });
    } catch (error) {
      throw new Error(
        `Could not launch ${browserName}. Run "npx playwright install ${browserName}" first.`,
        { cause: error },
      );
    }
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
          (config) => window.runRenderingComparison(config),
          { samples: options.samples, warmupRounds: options.warmupRounds },
        ),
        options.browserTimeoutMs,
        `${browserName} benchmark`,
      );
      if (consoleProblems.length > 0) {
        throw new Error(`${browserName} logged benchmark errors: ${JSON.stringify(consoleProblems)}`);
      }
      runs.push({
        browser: browserName,
        browserVersion: browser.version(),
        result,
      });
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
      litHtml: installedVersion('lit-html'),
      vue: installedVersion('vue'),
      playwright: installedVersion('playwright'),
      vite: installedVersion('vite'),
    },
  },
  methodology: {
    workloads: {
      text: 'alternate one text binding in an otherwise stable template',
      create: 'create a fresh detached root with 1,000 keyed rows',
      update: 'alternate all text values across 1,000 keyed rows',
      reverse: 'reverse and restore 1,000 keyed rows',
    },
    samples: options.samples,
    warmupRounds: options.warmupRounds,
    minimumBatchDurationMs: 8,
    browserTimeoutMs: options.browserTimeoutMs,
    productionBuild: true,
    headless: true,
    frameworkOrder: 'rotated for every warm-up and measured sample',
    unit: 'milliseconds per operation; lower is faster',
  },
  runs,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
const markdown = renderMarkdown(evidence);
await writeFile(markdownPath, markdown, 'utf8');
console.log(markdown);
console.log(`JSON evidence: ${outputPath}`);
console.log(`Markdown summary: ${markdownPath}`);

function parseOptions(args) {
  const values = Object.fromEntries(args.map((argument) => {
    const [name, value] = argument.split('=', 2);
    return [name, value];
  }));
  const browsers = (values['--browsers'] ?? 'chromium,firefox,webkit').split(',');
  const samples = positiveInteger(values['--samples'] ?? '40', 'samples');
  const warmupRounds = positiveInteger(values['--warmup'] ?? '8', 'warmup');
  const browserTimeoutMs = positiveInteger(values['--timeout'] ?? '180000', 'timeout');
  const output = values['--output'] ?? '.tmp/rendering-benchmark-results.json';
  if (extname(output) !== '.json') throw new Error('--output must end in .json.');
  return { browsers, samples, warmupRounds, browserTimeoutMs, output };
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`--${name} must be a positive integer.`);
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
    '# Rendering benchmark evidence',
    '',
    `Generated: ${evidence.generatedAt}`,
    '',
    `Source: \`${evidence.source.commit}\` on \`${evidence.source.branch}\` (working tree ${evidence.source.workingTreeDirty ? 'dirty' : 'clean'})`,
    '',
    `Environment: ${evidence.environment.cpu}, ${evidence.environment.logicalCpus} logical CPUs, ${formatBytes(evidence.environment.totalMemoryBytes)} memory, ${evidence.environment.platform} ${evidence.environment.release}`,
    '',
    `Packages: Gluon ${evidence.environment.packages.gluon}, Lit ${evidence.environment.packages.lit} / lit-html ${evidence.environment.packages.litHtml}, Vue ${evidence.environment.packages.vue}, Playwright ${evidence.environment.packages.playwright}, Vite ${evidence.environment.packages.vite}`,
    '',
    `Method: production build, batches calibrated to at least ${evidence.methodology.minimumBatchDurationMs} ms for the fastest renderer, ${evidence.methodology.warmupRounds} warm-up rounds, and ${evidence.methodology.samples} interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.`,
    '',
  ];
  for (const run of evidence.runs) {
    lines.push(`## ${run.browser} ${run.browserVersion}`, '');
    lines.push('| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |', '| --- | --- | ---: | ---: | ---: | ---: |');
    for (const scenario of run.result.scenarios) {
      for (const result of scenario.results) {
        lines.push(`| ${scenario.scenario} | ${result.framework} | ${result.batchSize} | ${formatMilliseconds(result.statistics.median)} | ${formatMilliseconds(result.statistics.p95)} | ${result.relativeToGluonMedian.toFixed(2)}× |`);
      }
    }
    lines.push('');
  }
  lines.push('Every individual measured sample is preserved in the accompanying JSON file.', '');
  return `${lines.join('\n')}\n`;
}

function formatBytes(value) {
  return `${(value / (1024 ** 3)).toFixed(1)} GiB`;
}

function formatMilliseconds(value) {
  return value < 0.01 ? value.toFixed(6) : value.toFixed(4);
}
