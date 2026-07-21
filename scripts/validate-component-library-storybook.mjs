import { createServer } from 'node:http';
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import axe from 'axe-core';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'examples/component-library/storybook-static');
const baselineDirectory = resolve(root, 'examples/component-library/visual-baselines');
const evidenceDirectory = resolve(root, '.tmp/quality-evidence');
const updateBaselines = process.env.UPDATE_STORYBOOK_SCREENSHOTS === '1';
const scenarios = [{
  id: 'component-library-product-picker--default',
  stateSelectors: ['example-product-picker', 'output'],
  expectedText: '2',
}, {
  id: 'component-library-loader--loading',
  stateSelectors: ['[data-loader-story]', '[data-loader-status]'],
  expectedText: 'loading',
}, {
  id: 'component-library-loader--cached',
  stateSelectors: ['[data-loader-story]', '[data-loader-status]'],
  expectedText: 'loaded (cache hit)',
}, {
  id: 'component-library-loader--error-state',
  stateSelectors: ['[data-loader-story]', '[data-loader-status]'],
  expectedText: 'failed',
}];

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    const path = resolve(dist, relative);
    if (!path.startsWith(`${dist}/`) && path !== resolve(dist, 'index.html')) return response.writeHead(400).end();
    const body = await readFile(path);
    response.writeHead(200, { 'content-type': contentType(path) });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Storybook verifier did not bind a TCP port.');

await mkdir(evidenceDirectory, { recursive: true });
if (updateBaselines) await mkdir(baselineDirectory, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 });
  for (const scenario of scenarios) {
    await page.goto(`http://127.0.0.1:${address.port}/iframe.html?id=${scenario.id}&viewMode=story`, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axe.source });
    const storyRoot = page.locator('#storybook-root');
    await storyRoot.waitFor();
    await waitForText(resolveLocator(page, scenario.stateSelectors), scenario.expectedText, scenario.id);
    const storyError = page.locator('.sb-errordisplay');
    if (await storyError.isVisible()) throw new Error(`Storybook reported a rendered error for ${scenario.id}.`);
    const violations = await page.evaluate(async () => {
      const results = await globalThis.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
      return results.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length }));
    });
    if (violations.length > 0) throw new Error(`Storybook accessibility violations for ${scenario.id}: ${JSON.stringify(violations)}.`);

    const evidencePath = resolve(evidenceDirectory, `storybook-${scenario.id}.png`);
    await storyRoot.screenshot({ path: evidencePath, animations: 'disabled' });
    const baselinePath = resolve(baselineDirectory, `${scenario.id}.png`);
    if (updateBaselines) {
      await writeFile(baselinePath, await readFile(evidencePath));
      results.push({ id: scenario.id, accessibilityViolations: 0, mismatchRatio: 0, baseline: 'updated' });
      continue;
    }

    let baselineBytes;
    try {
      baselineBytes = await readFile(baselinePath);
    } catch {
      throw new Error(`Missing Storybook baseline for ${scenario.id}. Run UPDATE_STORYBOOK_SCREENSHOTS=1 npm run check:storybook:component-library.`);
    }
    const actual = PNG.sync.read(await readFile(evidencePath));
    const baseline = PNG.sync.read(baselineBytes);
    if (actual.width !== baseline.width || actual.height !== baseline.height) {
      throw new Error(`Storybook baseline dimensions changed for ${scenario.id}: ${baseline.width}x${baseline.height} -> ${actual.width}x${actual.height}.`);
    }
    const difference = new PNG({ width: actual.width, height: actual.height });
    const mismatchedPixels = pixelmatch(
      baseline.data,
      actual.data,
      difference.data,
      actual.width,
      actual.height,
      { threshold: 0.15 },
    );
    const mismatchRatio = mismatchedPixels / (actual.width * actual.height);
    if (mismatchRatio > 0.05) {
      await writeFile(resolve(evidenceDirectory, `storybook-${scenario.id}-diff.png`), PNG.sync.write(difference));
      throw new Error(`Storybook visual mismatch for ${scenario.id}: ${(mismatchRatio * 100).toFixed(2)}% exceeds 5.00%.`);
    }
    results.push({ id: scenario.id, accessibilityViolations: 0, mismatchRatio, baseline: 'matched' });
  }

  const report = {
    schemaVersion: 1,
    browser: { name: 'chromium', version: browser.version() },
    viewport: { width: 800, height: 500, deviceScaleFactor: 1 },
    pixelmatch: { threshold: 0.15, maximumMismatchRatio: 0.05 },
    stories: results,
  };
  await writeFile(resolve(evidenceDirectory, 'storybook-component-library.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  try {
    await browser.close();
    await new Promise((resolveServer, rejectServer) => server.close((error) => error ? rejectServer(error) : resolveServer()));
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
}

function contentType(path) {
  return ({
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  })[extname(path)] ?? 'application/octet-stream';
}

async function waitForText(locator, expectedText, storyId) {
  const deadline = Date.now() + 5_000;
  while (await locator.textContent() !== expectedText) {
    if (Date.now() >= deadline) throw new Error(`Storybook interaction did not reach ${JSON.stringify(expectedText)} for ${storyId}.`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
  }
}

function resolveLocator(page, selectors) {
  const [firstSelector, ...descendantSelectors] = selectors;
  return descendantSelectors.reduce((locator, selector) => locator.locator(selector), page.locator(firstSelector));
}
