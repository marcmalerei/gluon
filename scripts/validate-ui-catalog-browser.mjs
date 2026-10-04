import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const outputRoot = resolve(root, 'docs-site/dist');
const catalog = JSON.parse(await readFile(resolve(root, 'docs-site/data/ui-catalog.json'), 'utf8'));
const versions = JSON.parse(await readFile(resolve(root, 'docs-site/versions.json'), 'utf8'));
const catalogTemplate = await readFile(resolve(root, 'docs-site/content/1.13.0/guides/ui-catalog/index.md'), 'utf8');
const rendererKeys = new Set([
  ...catalogTemplate.matchAll(/entry\.preview\s*===\s*'([^']+)'/g),
].map((match) => match[1]));
for (const match of catalogTemplate.matchAll(/\[([^\]]+)\]\.includes\(entry\.preview\)/g)) {
  for (const key of match[1].matchAll(/'([^']+)'/g)) rendererKeys.add(key[1]);
}
if (catalogTemplate.includes('data-preview-fallback')) throw new Error('catalog still contains a generic preview fallback');
for (const entry of catalog.entries) {
  if (!rendererKeys.has(entry.preview)) throw new Error(`catalog preview renderer is missing for ${entry.name}: ${entry.preview}`);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relativeUrl = decodeURIComponent(url.pathname).replace(/^\/gluon\/?/, '');
    let file = resolve(outputRoot, relativeUrl || 'index.html');
    if (!file.startsWith(`${outputRoot}${sep}`) && file !== outputRoot) throw new Error('path escapes docs output');
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
if (!address || typeof address === 'string') throw new Error('catalog test server did not expose a TCP port');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const pageErrors = [];
const consoleErrors = [];
const failedResponses = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${origin}/gluon/${versions.latest}/guides/ui-catalog/`, { waitUntil: 'networkidle' });

  if (await page.title() !== 'UI catalog | Gluon') throw new Error('catalog page title is incorrect');
  if (await page.locator('[data-ui-catalog-card]').count() !== catalog.entries.length) {
    throw new Error('catalog card count does not match generated manifest data');
  }
  if (await page.locator('[data-preview-fallback]').count() !== 0) {
    throw new Error('catalog contains a generic preview fallback');
  }
  if (await page.locator('[data-preview-rendered]').count() !== catalog.entries.length) {
    throw new Error('catalog does not render a preview region for every component');
  }
  for (const card of await page.locator('[data-ui-catalog-card]').all()) {
    const contract = await card.evaluate((element) => ({
      variantCount: element.querySelectorAll('.ui-catalog-preview-contract > div:first-child li').length,
      stateCount: element.querySelectorAll('.ui-catalog-preview-contract > div:last-child li').length,
      expectedVariants: Number(element.getAttribute('data-variant-count')),
      expectedStates: Number(element.getAttribute('data-state-count')),
      preview: element.querySelector('[data-preview-rendered]')?.dataset.preview ?? '',
      anatomy: element.querySelector('[data-preview-anatomy]')?.dataset.previewAnatomy ?? '',
      anatomyChildren: element.querySelector('[data-preview-anatomy]')?.children.length ?? 0,
    }));
    if (contract.variantCount !== contract.expectedVariants || contract.stateCount !== contract.expectedStates) {
      throw new Error(`catalog preview contract is incomplete: ${JSON.stringify(contract)}`);
    }
    if (!contract.preview || contract.anatomy !== contract.preview || contract.anatomyChildren === 0) {
      throw new Error(`catalog preview anatomy is incomplete: ${JSON.stringify(contract)}`);
    }
    const visual = await card.evaluate((element) => {
      const preview = element.querySelector('[data-preview-rendered]');
      const body = element.querySelector('[data-preview-anatomy]');
      const rect = preview?.getBoundingClientRect();
      return {
        previewWidth: rect?.width ?? 0,
        previewHeight: rect?.height ?? 0,
        bodyChildren: body?.children.length ?? 0,
        bodyText: body?.textContent?.replace(/\s+/g, '').length ?? 0,
        renderedDescendants: body ? [...body.querySelectorAll('*')].filter((child) => {
          const childRect = child.getBoundingClientRect();
          return childRect.width > 0 && childRect.height > 0;
        }).length : 0,
        horizontalOverflow: preview ? preview.scrollWidth > preview.clientWidth + 1 : true,
      };
    });
    if (visual.previewWidth <= 0 || visual.previewHeight <= 0 || visual.bodyChildren === 0 || visual.bodyText === 0 || visual.horizontalOverflow) {
      throw new Error(`catalog preview is visually incomplete: ${JSON.stringify({ name: await card.locator('h2').textContent(), ...visual })}`);
    }
  }
  if (await page.locator('[data-preview="aspect-ratio"] .ui-sample-ratio').count() !== 3) {
    throw new Error('aspect-ratio preview does not show all ratio variants');
  }
  if (await page.locator('[data-preview="avatar"] .ui-sample-avatar-set > span').count() !== 3) {
    throw new Error('avatar preview does not show image, initials, and fallback variants');
  }
  if (await page.locator('[data-preview="table"] table').count() !== 1) {
    throw new Error('table preview does not preserve native table anatomy');
  }
  if (await page.locator('[data-preview="tabs"] [role="tablist"] [role="tab"]').count() !== 3) {
    throw new Error('tabs preview does not show a native tablist anatomy');
  }
  if (await page.locator('[data-preview="segmented"] [role="toolbar"] [aria-pressed]').count() !== 3) {
    throw new Error('segmented preview does not show toggle-button anatomy');
  }
  if (await page.locator('[data-preview="otp"] .ui-sample-otp > span').count() !== 6) {
    throw new Error('one-time-password preview does not show six code segments');
  }
  if (await page.locator('[data-preview="password"] .ui-sample-field + button').count() !== 1) {
    throw new Error('password preview does not show its visibility control');
  }
  if (await page.locator('[data-preview="page-layout"] .ui-sample-page-layout > .is-header').count() !== 1) {
    throw new Error('page-layout preview does not show its header anatomy');
  }
  if (await page.locator('[data-preview="split-pane"] .ui-sample-split-pane > .is-primary').count() !== 1) {
    throw new Error('split-pane preview does not show its primary anatomy');
  }
  if (await page.locator('[data-preview="resizable-panels"] [role="separator"]').count() !== 1
    || await page.locator('[data-preview="resizable-panels"] [role="separator"]').getAttribute('aria-valuenow') !== '68') {
    throw new Error('resizable-panels preview does not show keyboard separator anatomy');
  }
  if (await page.locator('[data-preview="navigation-rail"] nav a').count() !== 3
    || await page.locator('[data-preview="navigation-rail"] nav a.is-active').count() !== 1
    || await page.locator('[data-preview="navigation-rail"] nav a.is-disabled').count() !== 1) {
    throw new Error('navigation-rail preview does not show grouped active and disabled link anatomy');
  }
  if (await page.locator('[data-preview="popover"] [role="dialog"]').count() !== 1) {
    throw new Error('popover preview does not show its labelled dialog anatomy');
  }
  if (await page.locator('[data-preview="hover-card"] [role="dialog"]').count() !== 1
    || await page.locator('[data-preview="hover-card"] [aria-expanded="true"]').count() !== 1
    || await page.locator('[data-preview="hover-card"] a').count() !== 1) {
    throw new Error('hover-card preview does not show trigger, interactive dialog, and link anatomy');
  }
  if (await page.locator('[data-preview="sheet"] .ui-sample-sheet-overlay .ui-sample-sheet').count() !== 1) {
    throw new Error('sheet preview does not show its edge-panel anatomy');
  }
  if (await page.locator('[data-preview="date-picker"] input[type="date"]').count() !== 1) {
    throw new Error('date-picker preview does not show native date anatomy');
  }
  if (await page.locator('[data-preview="autocomplete"] [role="combobox"]').count() !== 1
    || await page.locator('[data-preview="autocomplete"] [role="listbox"] [role="option"]').count() !== 3) {
    throw new Error('autocomplete preview does not show combobox and suggestion anatomy');
  }
  if (await page.locator('[data-preview="date-range-picker"] input[type="date"]').count() !== 2
    || await page.locator('[data-preview="date-range-picker"] fieldset legend').count() !== 1) {
    throw new Error('date-range-picker preview does not show two labelled native dates');
  }
  if (await page.locator('[data-preview="file-upload"] input[type="file"]').count() !== 1
    || await page.locator('[data-preview="file-upload"] .ui-sample-file-upload li').count() !== 2) {
    throw new Error('file-upload preview does not show native input and selected-file anatomy');
  }
  if (await page.locator('[data-preview="time-picker"] input[type="time"]').count() !== 1) {
    throw new Error('time-picker preview does not show native time anatomy');
  }
  if (await page.locator('[data-preview="multi-select-field"] select[multiple] option').count() !== 3) {
    throw new Error('multi-select-field preview does not show native multiple-selection anatomy');
  }
  if (await page.locator('[data-preview="calendar"] [role="grid"] [role="gridcell"]').count() !== 7) {
    throw new Error('calendar preview does not show a native day-grid anatomy');
  }
  if (await page.locator('[data-preview="choice-group"] fieldset').count() !== 1
    || await page.locator('[data-preview="choice-group"] input[type="radio"]').count() !== 2) {
    throw new Error('choice-group preview does not show fieldset and option anatomy');
  }
  if (await page.locator('[data-preview="control-field"] input').count() !== 1
    || await page.locator('[data-preview="form-field"] input[type="email"]').count() !== 1) {
    throw new Error('field previews do not show their labelled control anatomy');
  }
  if (await page.locator('[data-preview="dropdown-menu"] [role="menu"]').count() !== 1
    || await page.locator('[data-preview="context-menu"] [role="menu"]').count() !== 1) {
    throw new Error('menu previews do not show explicit dropdown and context anatomy');
  }
  if (await page.locator('[data-preview="dashboard-shell"] .ui-sample-dashboard-shell .is-main').count() !== 1
    || await page.locator('[data-preview="dashboard-shell"] .ui-sample-dashboard-shell .is-utility').count() !== 1) {
    throw new Error('dashboard-shell preview does not show workspace and utility anatomy');
  }
  if (await page.locator('[data-preview="sidebar-layout"] .ui-sample-sidebar-layout .is-sidebar').count() !== 1
    || await page.locator('[data-preview="sidebar-layout"] .ui-sample-sidebar-layout .is-main').count() !== 1
    || await page.locator('[data-preview="sidebar-layout"] .ui-sample-sidebar-layout .is-footer').count() !== 1) {
    throw new Error('sidebar-layout preview does not show sidebar, main, and footer anatomy');
  }
  if (await page.locator('[data-preview="wizard"] .ui-sample-wizard [aria-current="step"]').count() !== 1
    || await page.locator('[data-preview="wizard"] .ui-sample-wizard section').count() !== 1
    || await page.locator('[data-preview="wizard"] .ui-sample-wizard footer button').count() !== 2) {
    throw new Error('wizard preview does not show current step, content, and controls anatomy');
  }
  if (await page.locator('[data-preview="onboarding-flow"] .ui-sample-onboarding-flow header').count() !== 1
    || await page.locator('[data-preview="onboarding-flow"] .ui-sample-onboarding-flow [aria-current="step"]').count() !== 1
    || await page.locator('[data-preview="onboarding-flow"] .ui-sample-onboarding-flow section').count() !== 1) {
    throw new Error('onboarding-flow preview does not show header, current step, and content anatomy');
  }
  if (await page.locator('[data-preview="approval-flow"] .ui-sample-approval-flow header').count() !== 1
    || await page.locator('[data-preview="approval-flow"] .ui-sample-approval-flow [aria-current="step"]').count() !== 1
    || await page.locator('[data-preview="approval-flow"] .ui-sample-approval-flow footer button').count() !== 2) {
    throw new Error('approval-flow preview does not show header, current stage, and action anatomy');
  }
  if (await page.locator('[data-preview="status-tracker"] .ui-sample-status-tracker header').count() !== 1
    || await page.locator('[data-preview="status-tracker"] .ui-sample-status-tracker [aria-current="step"]').count() !== 1
    || await page.locator('[data-preview="status-tracker"] .ui-sample-status-tracker meter').count() !== 1
    || await page.locator('[data-preview="status-tracker"] .ui-sample-status-tracker footer button').count() !== 1) {
    throw new Error('status-tracker preview does not show header, current item, progress, and action anatomy');
  }
  if (await page.locator('[data-preview="marketing-header"] .ui-sample-marketing-header .is-announcement').count() !== 1
    || await page.locator('[data-preview="marketing-header"] .ui-sample-marketing-header .is-navigation').count() !== 1) {
    throw new Error('marketing-header preview does not show announcement and navigation anatomy');
  }
  if (await page.locator('[data-preview="separator"] .ui-sample-separator-preview .is-horizontal').count() !== 1
    || await page.locator('[data-preview="separator"] .ui-sample-separator-preview .is-vertical').count() !== 1
    || await page.locator('[data-preview="separator"] .ui-sample-separator-preview small').count() !== 1) {
    throw new Error('separator preview does not show horizontal and vertical anatomy');
  }
  if (await page.locator('[data-preview="skeleton"] .ui-sample-skeleton-preview .ui-sample-skeleton').count() !== 2
    || await page.locator('[data-preview="skeleton"] .ui-sample-skeleton-preview small').count() !== 1) {
    throw new Error('skeleton preview does not show loading placeholder anatomy');
  }
  for (const obsoleteKey of ['field', 'menu', 'foundation-atoms--feedback', 'foundation-atoms--typography']) {
    if (await page.locator(`[data-preview="${obsoleteKey}"]`).count() !== 0) {
      throw new Error(`catalog still exposes obsolete generic preview key: ${obsoleteKey}`);
    }
  }
  if (await page.locator('[data-ui-catalog-status]').textContent() !== `${catalog.entries.length} components shown`) {
    throw new Error('catalog status does not report the initial component count');
  }

  await page.getByRole('button', { name: 'Molecules' }).click();
  const moleculeCount = catalog.entries.filter((entry) => entry.layer === 'molecule').length;
  if (await page.locator('[data-ui-catalog-card]:visible').count() !== moleculeCount) {
    throw new Error('layer filter does not isolate molecule cards');
  }
  if (await page.locator('[data-ui-catalog-status]').textContent() !== `${moleculeCount} components shown`) {
    throw new Error('layer filter does not update the accessible result count');
  }

  await page.getByRole('button', { name: 'All' }).click();
  await page.locator('[data-ui-catalog-search]').fill('Avatar');
  if (await page.locator('[data-ui-catalog-card]:visible').count() !== 1) {
    throw new Error('catalog search does not isolate the requested component');
  }
  if (await page.locator('[data-ui-catalog-card]:visible h2').textContent() !== 'Avatar') {
    throw new Error('catalog search selected the wrong component');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-ui-catalog-search]').fill('');
  const mobileLayout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    previewVisible: Boolean(document.querySelector('[data-ui-catalog-card]:not([hidden]) .ui-catalog-preview')),
  }));
  if (mobileLayout.documentWidth > mobileLayout.viewportWidth || !mobileLayout.previewVisible) {
    throw new Error(`catalog mobile layout is invalid: ${JSON.stringify(mobileLayout)}`);
  }
  if (pageErrors.length || consoleErrors.length || failedResponses.length) {
    throw new Error(`catalog emitted browser failures:\n- ${[...pageErrors, ...consoleErrors, ...failedResponses].join('\n- ')}`);
  }
} finally {
  await browser.close();
  await new Promise((accept, reject) => server.close((error) => error ? reject(error) : accept()));
}

console.log(`UI catalog browser contract valid: ${catalog.entries.length} previews, filtering, search, and 390px layout`);

function contentType(file) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
  })[extname(file)] ?? 'application/octet-stream';
}
