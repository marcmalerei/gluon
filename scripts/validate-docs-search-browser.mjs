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
    const relativeUrl = decodeURIComponent(url.pathname).replace(/^\/gluon\/?/, '');
    let file = resolve(outputRoot, relativeUrl || 'index.html');
    if (!file.startsWith(`${outputRoot}${sep}`) && file !== outputRoot) throw new Error('path escapes documentation output');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    response.end(await readFile(file));
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
if (!address || typeof address === 'string') throw new Error('documentation test server did not expose a TCP port');
const origin = `http://127.0.0.1:${address.port}`;
const packageUrl = `${origin}/gluon/${versions.latest}/packages/store/`;
const browser = await chromium.launch({ headless: true });
const pageErrors = [];

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${origin}/gluon/`, { waitUntil: 'networkidle' });
  const mobileLayout = await page.locator('.VPHero .name').evaluate((element) => {
    const heading = element.getBoundingClientRect();
    const navigation = document.querySelector('.VPNavBar').getBoundingClientRect();
    return {
      headingTop: heading.top,
      navigationBottom: navigation.bottom,
      headingRight: heading.right,
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  if (mobileLayout.headingTop < mobileLayout.navigationBottom + 8) {
    throw new Error(`mobile homepage hero overlaps navigation: ${JSON.stringify(mobileLayout)}`);
  }
  if (mobileLayout.headingRight > mobileLayout.viewportWidth || mobileLayout.documentWidth > mobileLayout.viewportWidth) {
    throw new Error(`mobile homepage has horizontal overflow: ${JSON.stringify(mobileLayout)}`);
  }

  await page.goto(packageUrl, { waitUntil: 'networkidle' });
  await assertVisible(page, 'h1', '@gluonjs/store package guide renders on mobile');

  const opener = page.getByRole('button', { name: 'Search' }).first();
  await opener.click();
  const input = page.locator('#localsearch-input');
  await input.waitFor();
  await expectFocused(page, '#localsearch-input', 'VitePress focuses its local-search input');
  await input.fill('store');
  const options = page.getByRole('option');
  await options.first().waitFor();
  if (await options.count() < 2) throw new Error('local search did not return multiple package/API matches');
  const first = options.nth(0);
  const second = options.nth(1);
  for (const index of [0, 1]) {
    const result = options.nth(index);
    if (!(await result.locator('a').getAttribute('aria-label'))?.trim()) {
      throw new Error(`search result ${index} has no accessible destination label`);
    }
  }
  await input.press('ArrowDown');
  await expectAttribute(first, 'aria-selected', 'false', 'ArrowDown advances VitePress result selection');
  await expectAttribute(second, 'aria-selected', 'true', 'ArrowDown selects the next result');
  await input.press('ArrowUp');
  await expectAttribute(first, 'aria-selected', 'true', 'ArrowUp returns to the prior result');
  const target = await first.locator('a').getAttribute('href');
  if (!target) throw new Error('selected local-search result has no URL');
  await input.press('Enter');
  await page.waitForURL((url) => url.pathname === new URL(target, origin).pathname);
  if (await page.locator('.VPLocalSearchBox').count()) throw new Error('selecting a result did not close local search');

  await page.goto(packageUrl);
  await page.getByRole('button', { name: 'Search' }).first().click();
  const emptyInput = page.locator('#localsearch-input');
  await emptyInput.fill('qxzvjqzxvjqzxv');
  await page.locator('.no-results').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await page.locator('.VPLocalSearchBox').waitFor({ state: 'detached' });

  await page.keyboard.press('Control+k');
  await page.locator('#localsearch-input').waitFor();
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/gluon/${versions.latest}/guides/getting-started/`, { waitUntil: 'networkidle' });
  await assertVisible(page, '.VPSidebar a', 'desktop versioned sidebar navigation renders');
  await assertVisible(page, '.VPDoc h1', 'desktop guide content renders');
  await page.reload({ waitUntil: 'networkidle' });
  await assertVisible(page, '.VPDoc h1', 'versioned deep links survive a direct reload');

  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  try {
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${origin}/gluon/${versions.latest}/guides/getting-started/`);
    await assertVisible(staticPage, '.VPDoc h1', 'server-rendered documentation remains readable without JavaScript');
    await assertVisible(staticPage, '.VPSidebar a', 'server-rendered navigation remains available without JavaScript');
  } finally {
    await noScript.close();
  }

  if (pageErrors.length) throw new Error(`documentation emitted browser errors:\n- ${pageErrors.join('\n- ')}`);
} finally {
  await browser.close();
  await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept()));
}

console.log('VitePress browser contract valid: mobile and desktop pages, search, keyboard, deep links, and no-script navigation');

async function expectFocused(page, selector, context) {
  const focused = await page.locator(selector).evaluate((element) => element === document.activeElement);
  if (!focused) throw new Error(context);
}

async function expectAttribute(locator, name, expected, context) {
  await locator.waitFor();
  if (await locator.getAttribute(name) !== expected) throw new Error(context);
}

async function assertVisible(page, selector, context) {
  if (!(await page.locator(selector).first().isVisible())) throw new Error(context);
}

function contentType(file) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
  })[extname(file)] ?? 'application/octet-stream';
}
