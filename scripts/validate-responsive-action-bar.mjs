import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'examples/component-library/storybook-static');
const browsers = { chromium, firefox, webkit };
const story = 'molecules-responsive-action-bar--default';

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
if (!address || typeof address === 'string') throw new Error('ResponsiveActionBar validator did not bind a TCP port.');

const results = [];
try {
  for (const [browserName, browserType] of Object.entries(browsers)) {
    const browser = await browserType.launch();
    try {
      for (const scenario of [
        { id: 'mobile-320', viewport: { width: 320, height: 844 }, expectedPosition: 'sticky' },
        { id: 'mobile-390', viewport: { width: 390, height: 844 }, expectedPosition: 'sticky' },
        { id: 'short-mobile', viewport: { width: 390, height: 240 }, expectedPosition: 'static' },
        { id: 'wide-inline', viewport: { width: 768, height: 500 }, expectedPosition: 'static' },
      ]) {
        const page = await browser.newPage({ viewport: scenario.viewport, reducedMotion: 'reduce', forcedColors: scenario.id === 'mobile-320' ? 'active' : 'none' });
        await page.goto(`http://127.0.0.1:${address.port}/iframe.html?id=${story}&viewMode=story`, { waitUntil: 'networkidle' });
        const result = await page.evaluate(({ expectedPosition, textScale }) => {
          const root = document.querySelector('.gluon-responsive-action-bar');
          if (!root) throw new Error('ResponsiveActionBar story did not render.');
          if (textScale) document.documentElement.style.fontSize = '200%';
          const action = root.querySelector('.gluon-responsive-action-bar-action > *');
          const rootRect = root.getBoundingClientRect();
          const actionRect = action?.getBoundingClientRect();
          const computed = getComputedStyle(root);
          const parent = root.parentElement.getBoundingClientRect();
          return {
            position: computed.position,
            expectedPosition,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            rootWidth: rootRect.width,
            parentWidth: parent.width,
            actionHeight: actionRect?.height ?? 0,
            actionWidth: actionRect?.width ?? 0,
            targetSizes: [...root.querySelectorAll('button, a, [role="button"]')]
              .map((target) => target.getBoundingClientRect())
              .filter((rect) => rect.width > 0 && rect.height > 0)
              .map((rect) => ({ width: rect.width, height: rect.height })),
            rootFontSize: getComputedStyle(document.documentElement).fontSize,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
              && computed.animationDuration === '0s' && computed.transitionDuration === '0s',
            forcedColors: matchMedia('(forced-colors: active)').matches
              && computed.borderBlockStartWidth === '2px',
            overflow: document.documentElement.scrollWidth > window.innerWidth || root.scrollWidth > root.clientWidth,
          };
        }, { expectedPosition: scenario.expectedPosition, textScale: scenario.id === 'mobile-320' });
        if (result.position !== result.expectedPosition) throw new Error(`${browserName}/${scenario.id}: expected ${result.expectedPosition}, got ${result.position}.`);
        if (result.documentWidth > result.viewportWidth || result.overflow) throw new Error(`${browserName}/${scenario.id}: horizontal overflow at ${result.viewportWidth}px (document ${result.documentWidth}px, root ${result.rootWidth}px, parent ${result.parentWidth}px).`);
        if (result.rootWidth > result.parentWidth + 1) throw new Error(`${browserName}/${scenario.id}: action bar exceeds its containing block.`);
        if (result.actionHeight < 44 || result.actionWidth < 44) throw new Error(`${browserName}/${scenario.id}: primary action is smaller than 44px (${result.actionWidth}x${result.actionHeight}).`);
        if (result.targetSizes.length === 0 || result.targetSizes.some(({ width, height }) => width < 44 || height < 44)) throw new Error(`${browserName}/${scenario.id}: visible target is smaller than 44px (${JSON.stringify(result.targetSizes)}).`);
        if (scenario.id === 'mobile-320' && result.rootFontSize !== '32px') throw new Error(`${browserName}/${scenario.id}: expected a 32px root font for 200% text, got ${result.rootFontSize}.`);
        if (!result.reducedMotion) throw new Error(`${browserName}/${scenario.id}: reduced-motion contract not applied.`);
        if (scenario.id === 'mobile-320' && !result.forcedColors) throw new Error(`${browserName}/${scenario.id}: forced-colors contract not applied.`);
        results.push({ browser: browserName, ...scenario, ...result, passed: true });
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((resolveServer, rejectServer) => server.close((error) => error ? rejectServer(error) : resolveServer()));
}
console.log(JSON.stringify({ schemaVersion: 1, story, browsers: results }, null, 2));

function contentType(path) {
  return ({ '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[extname(path)] ?? 'application/octet-stream';
}
