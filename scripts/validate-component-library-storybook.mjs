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
}, {
  id: 'component-library-foundation-atoms--default',
  stateSelectors: ['[data-foundation-atoms-story]', 'h2'],
  expectedText: 'Foundation atoms',
  screenshotSelector: '[data-foundation-atoms-story]',
}, {
  id: 'component-library-responsive-disclosure--compact-closed',
  stateSelectors: ['[data-responsive-disclosure-story]', 'summary'],
  expectedText: 'Catalog filters',
  screenshotSelector: '[data-responsive-disclosure-story]',
}, {
  id: 'component-library-responsive-disclosure--compact-open',
  stateSelectors: ['[data-responsive-disclosure-story]', '.gluon-disclosure-content'],
  expectedText: 'Availability, size, and finish filters stay in one semantic content tree.',
  screenshotSelector: '[data-responsive-disclosure-story]',
}, {
  id: 'component-library-status-badge--default',
  stateSelectors: ['[data-status-badge-story]', '[data-short-badge]', '.gluon-status-badge'],
  expectedText: 'Eingeschränkt',
  screenshotSelector: '[data-status-badge-story]',
}, {
  id: 'component-library-slider--states-and-interactions',
  stateSelectors: ['[data-slider-events]'],
  expectedText: '1 input / 1 change',
  screenshotSelector: '.slider-story',
  interact: async (page) => {
    const slider = page.getByRole('slider', { name: 'Brightness' });
    await slider.focus();
    await slider.press('ArrowRight');
  },
  verifyMedia: async (page) => {
    const slider = page.getByRole('slider', { name: 'Brightness' });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const evidence = await slider.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        forcedColors: matchMedia('(forced-colors: active)').matches,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        forcedColorAdjust: styles.forcedColorAdjust,
        animationName: styles.animationName,
        transitionDuration: styles.transitionDuration,
      };
    });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    if (!evidence.forcedColors || !evidence.reducedMotion || evidence.forcedColorAdjust !== 'auto'
      || evidence.animationName !== 'none' || evidence.transitionDuration !== '0s') {
      throw new Error(`Slider media contract failed: ${JSON.stringify(evidence)}.`);
    }
    return evidence;
  },
}, {
  id: 'component-library-confirmationdialog--destructive',
  stateSelectors: ['dialog[open]', '.gluon-confirmation-dialog-title'],
  expectedText: 'Confirm this action?',
  screenshotSelector: 'dialog[open]',
  verifyMedia: async (page) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const evidence = await page.locator('dialog[open]').evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        forcedColors: matchMedia('(forced-colors: active)').matches,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        boxShadow: styles.boxShadow,
        animationName: styles.animationName,
        transitionDuration: styles.transitionDuration,
      };
    });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    if (!evidence.forcedColors || !evidence.reducedMotion || evidence.boxShadow !== 'none'
      || evidence.animationName !== 'none' || evidence.transitionDuration !== '0s') {
      throw new Error(`ConfirmationDialog media contract failed: ${JSON.stringify(evidence)}.`);
    }
    return evidence;
  },
}, {
  id: 'component-library-confirmationdialog--mobile',
  stateSelectors: ['dialog[open]', '.gluon-confirmation-dialog-title'],
  expectedText: 'Remove this saved address?',
  screenshotSelector: 'dialog[open]',
  beforeNavigate: async (page) => page.setViewportSize({ width: 320, height: 720 }),
  interact: async (page) => {
    await page.locator('html').evaluate((element) => { element.style.fontSize = '200%'; });
  },
  verifyMedia: async (page) => {
    await page.setViewportSize({ width: 320, height: 500 });
    const evidence = await page.locator('dialog[open]').evaluate(async (dialog) => {
      const actionSizes = [...dialog.querySelectorAll('button')].map((button) => ({
        width: button.getBoundingClientRect().width,
        height: button.getBoundingClientRect().height,
      }));
      dialog.scrollTop = dialog.scrollHeight;
      await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
      const dialogRect = dialog.getBoundingClientRect();
      const lastActionRect = dialog.querySelector('button:last-of-type')?.getBoundingClientRect();
      return {
        clientWidth: dialog.clientWidth,
        scrollWidth: dialog.scrollWidth,
        clientHeight: dialog.clientHeight,
        scrollHeight: dialog.scrollHeight,
        overflowY: getComputedStyle(dialog).overflowY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        actionSizes,
        lastActionReachable: lastActionRect !== undefined
          && lastActionRect.top >= dialogRect.top - 1
          && lastActionRect.bottom <= dialogRect.bottom + 1,
      };
    });
    if (evidence.viewportWidth !== 320 || evidence.viewportHeight !== 500
      || evidence.scrollWidth > evidence.clientWidth || evidence.clientHeight > evidence.viewportHeight
      || evidence.overflowY !== 'auto' || !evidence.lastActionReachable
      || evidence.actionSizes.some(({ width, height }) => width < 44 || height < 44)) {
      throw new Error(`ConfirmationDialog 320px/200% reflow contract failed: ${JSON.stringify(evidence)}.`);
    }
    await page.setViewportSize({ width: 320, height: 720 });
    await page.locator('dialog[open]').evaluate((dialog) => { dialog.scrollTop = 0; });
    return evidence;
  },
}, {
  id: 'component-library-workflow-timeline--states-and-responsive-layout',
  stateSelectors: ['.gluon-workflow-timeline[data-state="degraded"]', '[data-state="current"]', '[part="label"]'],
  expectedText: 'Review',
  screenshotSelector: '.workflow-timeline-story',
  verifyMedia: async (page) => {
    const timeline = page.locator('.gluon-workflow-timeline');
    const relationships = await timeline.evaluate((element) => ({
      hasSummary: Boolean(element.querySelector('[part="summary"]')),
      currentCount: element.querySelectorAll('[aria-current="step"]').length,
      hasRelationships: [...element.querySelectorAll('li')].every((step) => step.hasAttribute('aria-labelledby')),
    }));
    if (!relationships.hasSummary || relationships.currentCount !== 1 || !relationships.hasRelationships) {
      throw new Error(`Workflow timeline accessibility contract failed: ${JSON.stringify(relationships)}.`);
    }
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const media = await timeline.evaluate((element) => {
      const markerStyles = getComputedStyle(element.querySelector('[part="marker"]'));
      return {
        forcedColors: matchMedia('(forced-colors: active)').matches,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        markerBackground: markerStyles.backgroundColor,
        animationName: markerStyles.animationName,
        transitionDuration: markerStyles.transitionDuration,
      };
    });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
    if (!media.forcedColors || !media.reducedMotion || media.animationName !== 'none' || media.transitionDuration !== '0s') {
      throw new Error(`Workflow timeline media contract failed: ${JSON.stringify(media)}.`);
    }
    await page.setViewportSize({ width: 320, height: 500 });
    await page.locator('html').evaluate((element) => { element.style.fontSize = '200%'; });
    const reflow = await timeline.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      actionSizes: [...element.querySelectorAll('[part="actions"] > :is(a, button), .gluon-workflow-timeline-next :is(a, button)')].map((action) => ({ width: action.getBoundingClientRect().width, height: action.getBoundingClientRect().height })),
    }));
    await page.locator('html').evaluate((element) => { element.style.removeProperty('font-size'); });
    await page.setViewportSize({ width: 800, height: 500 });
    if (reflow.scrollWidth > reflow.clientWidth || reflow.actionSizes.some(({ width, height }) => width < 44 || height < 44)) {
      throw new Error(`Workflow timeline 320px/200% reflow contract failed: ${JSON.stringify(reflow)}.`);
    }
    return { ...relationships, ...media, reflow };
  },
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
    await scenario.beforeNavigate?.(page);
    await page.goto(`http://127.0.0.1:${address.port}/iframe.html?id=${scenario.id}&viewMode=story`, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axe.source });
    const storyRoot = page.locator('#storybook-root');
    await storyRoot.waitFor();
    await scenario.interact?.(page);
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
    const mediaEvidence = await scenario.verifyMedia?.(page);
    const compatibility = scenario.id === 'component-library-foundation-atoms--default'
      ? await validateFoundationAtoms(page)
      : undefined;

    const evidencePath = resolve(evidenceDirectory, `storybook-${scenario.id}.png`);
    const screenshotSelector = scenario.screenshotSelector ?? storyRoot;
    await (typeof screenshotSelector === 'string' ? page.locator(screenshotSelector) : screenshotSelector)
      .screenshot({ path: evidencePath, animations: 'disabled' });
    const baselinePath = resolve(baselineDirectory, `${scenario.id}.png`);
    if (updateBaselines) {
      await writeFile(baselinePath, await readFile(evidencePath));
      results.push({
        id: scenario.id,
        accessibilityViolations: 0,
        mismatchRatio: 0,
        baseline: 'updated',
        ...(mediaEvidence ? { mediaEvidence } : {}),
        ...(compatibility ? { compatibility } : {}),
      });
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
    results.push({
      id: scenario.id,
      accessibilityViolations: 0,
      mismatchRatio,
      baseline: 'matched',
      ...(mediaEvidence ? { mediaEvidence } : {}),
      ...(compatibility ? { compatibility } : {}),
    });
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

async function validateFoundationAtoms(page) {
  const rootSelector = '[data-foundation-atoms-story]';
  const loadedAvatarSelector = `${rootSelector} .gluon-avatar.is-loaded`;
  const fallbackSelector = `${rootSelector} .gluon-avatar__fallback[role="img"]`;
  const scrollSelector = `${rootSelector} .gluon-scroll-area`;
  const verticalSeparatorSelector = `${rootSelector} .gluon-separator.is-vertical`;

  const semantics = await page.evaluate(({ loadedAvatarSelector, fallbackSelector }) => {
    const loadedAvatar = document.querySelector(loadedAvatarSelector);
    const loadedImages = loadedAvatar?.querySelectorAll('img') ?? [];
    const fallbacks = [...document.querySelectorAll(fallbackSelector)];
    return {
      loadedImageCount: loadedImages.length,
      loadedAlt: loadedImages[0]?.getAttribute('alt') ?? null,
      loadedOuterRole: loadedAvatar?.getAttribute('role') ?? null,
      fallbackLabels: fallbacks.map((fallback) => fallback.getAttribute('aria-label')),
      busyFallbacks: fallbacks.filter((fallback) => fallback.getAttribute('aria-busy') === 'true').length,
    };
  }, { loadedAvatarSelector, fallbackSelector });
  if (
    semantics.loadedImageCount !== 1
    || semantics.loadedAlt !== 'Ada Lovelace'
    || semantics.loadedOuterRole !== null
    || semantics.fallbackLabels.join('|') !== 'Lin Chen|Sam Rivera'
    || semantics.busyFallbacks !== 1
  ) {
    throw new Error(`Foundation Avatar semantics changed: ${JSON.stringify(semantics)}.`);
  }

  const initialScroll = await page.locator(scrollSelector).evaluate((element) => ({
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
    direction: getComputedStyle(element).direction,
    overflowX: getComputedStyle(element).overflowX,
    overflowY: getComputedStyle(element).overflowY,
  }));
  if (
    initialScroll.clientWidth >= initialScroll.scrollWidth
    || initialScroll.clientHeight >= initialScroll.scrollHeight
    || initialScroll.direction !== 'rtl'
    || initialScroll.overflowX !== 'auto'
    || initialScroll.overflowY !== 'auto'
  ) {
    throw new Error(`Foundation ScrollArea is not bounded native RTL overflow: ${JSON.stringify(initialScroll)}.`);
  }
  await page.locator(scrollSelector).focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction((selector) => {
    const element = document.querySelector(selector);
    return element instanceof HTMLElement && element.scrollTop > 0;
  }, scrollSelector);
  const focusedScroll = await page.locator(scrollSelector).evaluate((element) => ({
    tabIndex: element.tabIndex,
    scrollTop: element.scrollTop,
    outlineStyle: getComputedStyle(element).outlineStyle,
  }));
  if (focusedScroll.tabIndex !== 0 || focusedScroll.scrollTop <= 0 || focusedScroll.outlineStyle !== 'solid') {
    throw new Error(`Foundation ScrollArea keyboard/focus behavior changed: ${JSON.stringify(focusedScroll)}.`);
  }

  const responsive = [];
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => ({
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    if (geometry.documentWidth > geometry.viewportWidth) {
      throw new Error(`Foundation atoms overflow at ${width}px: ${JSON.stringify(geometry)}.`);
    }
    await page.locator(rootSelector).screenshot({
      path: resolve(evidenceDirectory, `storybook-foundation-atoms-${width}.png`),
      animations: 'disabled',
    });
    responsive.push(geometry);
  }

  await page.setViewportSize({ width: 800, height: 500 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
  const reducedMotion = await page.evaluate(({ rootSelector, scrollSelector }) => {
    const root = document.querySelector(rootSelector);
    const scrollArea = document.querySelector(scrollSelector);
    const loadingFallback = root?.querySelector('.gluon-avatar.is-loading .gluon-avatar__fallback');
    if (!(scrollArea instanceof HTMLElement) || !(loadingFallback instanceof HTMLElement)) return null;
    scrollArea.style.setProperty('--gluon-scroll-area-scroll-behavior', 'smooth');
    return {
      mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      scrollBehavior: getComputedStyle(scrollArea).scrollBehavior,
      avatarAnimation: getComputedStyle(loadingFallback, '::after').animationName,
    };
  }, { rootSelector, scrollSelector });
  if (
    !reducedMotion?.mediaMatches
    || reducedMotion.scrollBehavior !== 'auto'
    || reducedMotion.avatarAnimation !== 'none'
  ) {
    throw new Error(`Foundation reduced-motion behavior changed: ${JSON.stringify(reducedMotion)}.`);
  }

  await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' });
  await page.locator(scrollSelector).focus();
  const forcedColors = await page.evaluate(({ rootSelector, scrollSelector, verticalSeparatorSelector }) => {
    const root = document.querySelector(rootSelector);
    const scrollArea = document.querySelector(scrollSelector);
    const avatar = root?.querySelector('.gluon-avatar');
    const separator = document.querySelector(verticalSeparatorSelector);
    if (!(scrollArea instanceof HTMLElement) || !(avatar instanceof HTMLElement) || !(separator instanceof HTMLElement)) return null;
    return {
      mediaMatches: matchMedia('(forced-colors: active)').matches,
      focusOutline: getComputedStyle(scrollArea).outlineStyle,
      avatarBorder: getComputedStyle(avatar).borderStyle,
      separatorAdjustment: getComputedStyle(separator).forcedColorAdjust,
    };
  }, { rootSelector, scrollSelector, verticalSeparatorSelector });
  if (
    !forcedColors?.mediaMatches
    || forcedColors.focusOutline !== 'solid'
    || forcedColors.avatarBorder !== 'solid'
    || forcedColors.separatorAdjustment !== 'none'
  ) {
    throw new Error(`Foundation forced-colors behavior changed: ${JSON.stringify(forcedColors)}.`);
  }
  await page.locator(rootSelector).screenshot({
    path: resolve(evidenceDirectory, 'storybook-foundation-atoms-forced-colors.png'),
    animations: 'disabled',
  });

  await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
  await page.setViewportSize({ width: 1280, height: 800 });
  const zoom = await page.evaluate(({ rootSelector, verticalSeparatorSelector }) => {
    document.documentElement.style.zoom = '2';
    const separator = document.querySelector(verticalSeparatorSelector);
    const geometry = {
      factor: getComputedStyle(document.documentElement).zoom,
      separatorWidth: separator?.getBoundingClientRect().width ?? 0,
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
    document.documentElement.style.zoom = '';
    return geometry;
  }, { rootSelector, verticalSeparatorSelector });
  if (zoom.factor !== '2' || zoom.separatorWidth < 2 || zoom.documentWidth > zoom.viewportWidth) {
    throw new Error(`Foundation 200% zoom behavior changed: ${JSON.stringify(zoom)}.`);
  }

  await page.setViewportSize({ width: 800, height: 500 });
  return {
    avatar: semantics,
    scroll: { ...initialScroll, ...focusedScroll },
    responsive,
    reducedMotion,
    forcedColors,
    zoom,
  };
}
