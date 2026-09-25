import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const outputRoot = resolve(root, 'docs-site/dist');
const versions = JSON.parse(await readFile(resolve(root, 'docs-site/versions.json'), 'utf8'));
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname).replace(/^\/gluon\/?/, '');
    let file = resolve(outputRoot, relative || 'index.html');
    if (!file.startsWith(`${outputRoot}${sep}`) && file !== outputRoot) throw new Error('path escapes documentation output');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise((accept, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', accept);
});

const address = server.address();
if (!address || typeof address === 'string') throw new Error('Graph example server did not expose a TCP port');
const origin = `http://127.0.0.1:${address.port}`;
const exampleUrl = `${origin}/gluon/${versions.latest}/examples/graph.html`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(exampleUrl, { waitUntil: 'load' });
  await waitForGraph(page);

  const desktop = await measureGraph(page);
  assertGraphPaint(desktop, 'desktop');
  if (desktop.visibleNodes !== 140) throw new Error(`desktop graph rendered ${desktop.visibleNodes} nodes instead of 140`);

  await page.locator('#group-list input').first().uncheck();
  await page.waitForFunction(() => document.querySelector('gluon-graph')?.shadowRoot?.querySelector('canvas')?.getAttribute('aria-label')?.startsWith('105 visible nodes'));
  const filtered = await measureGraph(page);
  assertGraphPaint(filtered, 'filtered desktop');
  if (filtered.visibleNodes !== 105) throw new Error(`group filter rendered ${filtered.visibleNodes} nodes instead of 105`);

  await page.locator('#node-size').fill('1.7');
  await page.waitForFunction(() => document.querySelector('gluon-graph')?.nodeScale === 1.7);
  await page.locator('#link-density').fill('0.18');
  await page.waitForFunction(() => document.querySelector('gluon-graph')?.linkDensity === 0.18);
  const tuned = await measureGraph(page);
  assertGraphPaint(tuned, 'tuned desktop');

  const canvas = page.locator('gluon-graph').locator('canvas');
  await canvas.focus();
  const beforeZoom = await readViewport(page);
  await canvas.press('+');
  await page.waitForFunction((scale) => (document.querySelector('gluon-graph')?.getViewport().scale ?? 0) > scale, beforeZoom.scale);
  await page.locator('#recenter').click();
  await page.waitForFunction(() => document.querySelector('gluon-graph')?.getViewport().scale === 1);
  await page.locator('#rebalance').click();
  await page.waitForFunction(() => document.querySelector('gluon-graph')?.seed?.endsWith(':restart'));

  await page.locator('gluon-graph').evaluate((element) => element.shadowRoot?.querySelector('button')?.click());
  await page.waitForFunction(() => document.querySelector('#graph-selection')?.textContent?.includes('selected'));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(exampleUrl, { waitUntil: 'load' });
  await waitForGraph(page);
  const mobile = await measureGraph(page);
  assertGraphPaint(mobile, 'mobile');
  const mobileLayout = await page.evaluate(() => ({
    pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
    graphOverflow: (document.querySelector('gluon-graph')?.scrollWidth ?? 0)
      - (document.querySelector('gluon-graph')?.clientWidth ?? 0),
    recenterHeight: document.querySelector('#recenter')?.getBoundingClientRect().height ?? 0,
  }));
  if (mobileLayout.pageOverflow > 1 || mobileLayout.graphOverflow > 1) {
    throw new Error(`graph example overflows at 390px: ${JSON.stringify(mobileLayout)}`);
  }
  if (mobileLayout.recenterHeight < 44) throw new Error(`recenter control is below 44px: ${mobileLayout.recenterHeight}`);
} finally {
  await browser.close();
  await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept()));
}

console.log('Graph production example browser contract valid: registration, paint, filtering, tuning, selection, pan/zoom controls, desktop, and 390px mobile layout');

async function waitForGraph(page) {
  await page.waitForFunction(() => Boolean(
    customElements.get('gluon-graph')
      && document.querySelector('gluon-graph')?.shadowRoot?.querySelector('canvas'),
  ));
  await page.waitForFunction(() => Boolean(
    document.querySelector('gluon-graph')?.shadowRoot?.querySelector('canvas')?.width,
  ));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function measureGraph(page) {
  return page.locator('gluon-graph').evaluate((element) => {
    const canvas = element.shadowRoot?.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('graph canvas is missing');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('graph canvas has no 2D context');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let paintedPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] !== 9 || pixels[index + 1] !== 13 || pixels[index + 2] !== 18) paintedPixels += 1;
    }
    return {
      upgraded: customElements.get('gluon-graph')?.name ?? null,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      paintedPixels,
      visibleNodes: Number(canvas.getAttribute('aria-label')?.match(/^(\d+) visible nodes/)?.[1] ?? 0),
    };
  });
}

function assertGraphPaint(measurement, viewport) {
  if (!measurement.upgraded) throw new Error(`${viewport} graph custom element did not upgrade`);
  if (measurement.canvasWidth < 100 || measurement.canvasHeight < 100) {
    throw new Error(`${viewport} graph canvas has invalid dimensions: ${measurement.canvasWidth}x${measurement.canvasHeight}`);
  }
  if (measurement.paintedPixels < 100) {
    throw new Error(`${viewport} graph canvas is blank: ${measurement.paintedPixels} painted pixels`);
  }
}

function readViewport(page) {
  return page.locator('gluon-graph').evaluate((element) => element.getViewport());
}

function contentType(file) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  })[extname(file)] ?? 'application/octet-stream';
}
