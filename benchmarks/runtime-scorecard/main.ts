import {
  createApp,
  createStyleSheetOwner,
  css,
  html,
  unmount,
} from '@gluonjs/core';
import { componentLibraryManifest } from '@gluonjs/example-component-library/manifest';
import { createComponentLibraryLoader } from '@gluonjs/quarks';
import { nextTick, reactive } from '@gluonjs/reactivity';
import { createMemoryHistory, createRouter } from '@gluonjs/router/memory';
import { prepareForHydration } from '@gluonjs/ssr';
import { hydrateTemplate } from '@gluonjs/ssr/hydration';

export interface RuntimeBrowserConfig {
  readonly samples?: number;
  readonly warmupRounds?: number;
  readonly teardownCycles?: number;
}

export interface RuntimeBrowserResult {
  readonly schemaVersion: 1;
  readonly userAgent: string;
  readonly samples: number;
  readonly warmupRounds: number;
  readonly teardownCycles: number;
  readonly metrics: Readonly<Record<BrowserMetric, readonly number[]>>;
  readonly correctness: {
    readonly hydrationRetainsServerDom: true;
    readonly routeMatchesRequestedLocation: true;
    readonly loaderReusesCachedModule: true;
    readonly stylesReleasedAfterOwnershipEnds: true;
    readonly retainedDomNodesAfterTeardown: 0;
    readonly detachedListenersAfterTeardown: 0;
  };
  readonly longTasks: {
    readonly supported: boolean;
    readonly count: number;
    readonly durationsMs: readonly number[];
  };
}

type BrowserMetric =
  | 'hydrationMs'
  | 'routeTransitionMs'
  | 'loaderCachedModuleLoadMs'
  | 'styleOwnershipMs'
  | 'teardownThirtyCyclesMs'
  | 'interactionMs';

const styleOperations = 100;
const benchmarkSheet = css`:host { color: rgb(16 32 48); }`;
const loaderSheet = css`.example-product-badge { font-weight: 700; }`;

export async function runRuntimeBrowserScorecard(
  config: RuntimeBrowserConfig = {},
): Promise<RuntimeBrowserResult> {
  const samples = positiveInteger(config.samples ?? 20, 'samples');
  const warmupRounds = nonNegativeInteger(config.warmupRounds ?? 5, 'warmupRounds');
  const teardownCycles = positiveInteger(config.teardownCycles ?? 30, 'teardownCycles');
  const metrics: Record<BrowserMetric, number[]> = {
    hydrationMs: [],
    routeTransitionMs: [],
    loaderCachedModuleLoadMs: [],
    styleOwnershipMs: [],
    teardownThirtyCyclesMs: [],
    interactionMs: [],
  };
  const longTaskDurations: number[] = [];
  const longTaskSupported = PerformanceObserver.supportedEntryTypes?.includes('longtask') ?? false;
  const observer = longTaskSupported
    ? new PerformanceObserver((list) => {
        longTaskDurations.push(...list.getEntries().map((entry) => entry.duration));
      })
    : undefined;
  observer?.observe({ entryTypes: ['longtask'] });

  const history = createMemoryHistory(['/alpha']);
  const router = createRouter({
    history,
    routes: [{ path: '/alpha' }, { path: '/beta' }],
  });
  await router.isReady();
  let nextRoute = '/beta';

  const hydrationValue = html`<main><h2>${'Hydrated product'}</h2><p>${'Available'}</p></main>`;
  const preparedHydration = await prepareForHydration(hydrationValue);

  try {
    for (let round = 0; round < warmupRounds + samples; round += 1) {
      const measured = round >= warmupRounds;
      const hydration = await measureHydration(hydrationValue, preparedHydration.html);
      const route = await measureRoute(router, nextRoute);
      nextRoute = nextRoute === '/alpha' ? '/beta' : '/alpha';
      const loader = await measureLoader();
      const styles = measureStyles();
      const teardown = await measureTeardown(teardownCycles);
      const interaction = await measureInteraction();
      if (measured) {
        metrics.hydrationMs.push(hydration.durationMs);
        metrics.routeTransitionMs.push(route.durationMs);
        metrics.loaderCachedModuleLoadMs.push(loader.durationMs);
        metrics.styleOwnershipMs.push(styles.durationMs);
        metrics.teardownThirtyCyclesMs.push(teardown.durationMs);
        metrics.interactionMs.push(interaction.durationMs);
      }
      await nextFrame();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    observer?.disconnect();
    router.destroy();
  }

  return Object.freeze({
    schemaVersion: 1 as const,
    userAgent: navigator.userAgent,
    samples,
    warmupRounds,
    teardownCycles,
    metrics,
    correctness: Object.freeze({
      hydrationRetainsServerDom: true as const,
      routeMatchesRequestedLocation: true as const,
      loaderReusesCachedModule: true as const,
      stylesReleasedAfterOwnershipEnds: true as const,
      retainedDomNodesAfterTeardown: 0 as const,
      detachedListenersAfterTeardown: 0 as const,
    }),
    longTasks: Object.freeze({
      supported: longTaskSupported,
      count: longTaskDurations.length,
      durationsMs: Object.freeze(longTaskDurations),
    }),
  });
}

async function measureHydration(value: ReturnType<typeof html>, markup: string): Promise<{ durationMs: number }> {
  const root = document.createElement('div');
  root.innerHTML = markup;
  const serverMain = root.querySelector('main');
  const started = performance.now();
  const result = await hydrateTemplate(value, root);
  const durationMs = performance.now() - started;
  if (!result.retained || result.recovered || root.querySelector('main') !== serverMain) {
    throw new Error('Hydration correctness gate did not retain the server DOM in place.');
  }
  unmount(root);
  if (root.childNodes.length !== 0) throw new Error('Hydration cleanup retained DOM nodes.');
  return { durationMs };
}

async function measureRoute(
  router: ReturnType<typeof createRouter>,
  location: string,
): Promise<{ durationMs: number }> {
  const started = performance.now();
  await router.push(location);
  const durationMs = performance.now() - started;
  if (router.currentRoute.value.fullPath !== location) {
    throw new Error(`Router correctness gate expected ${location}.`);
  }
  return { durationMs };
}

async function measureLoader(): Promise<{ durationMs: number }> {
  const baselineSheets = document.adoptedStyleSheets.length;
  const resolver = {
    load: async () => (await import('@gluonjs/example-component-library/product-badge')).ProductBadge,
  };
  const loader = createComponentLibraryLoader(componentLibraryManifest, resolver, {
    styleTarget: document,
    styles: { resolve: () => [loaderSheet] },
  });
  const started = performance.now();
  const first = loader.load('product-badge');
  const second = loader.load('product-badge');
  if (first !== second) throw new Error('Loader correctness gate did not reuse its cached promise.');
  await first;
  const durationMs = performance.now() - started;
  if (loader.status('product-badge') !== 'loaded') throw new Error('Loader correctness gate did not reach loaded state.');
  loader.release('product-badge');
  loader.dispose();
  if (document.adoptedStyleSheets.length !== baselineSheets) {
    throw new Error('Loader correctness gate retained a stylesheet after release.');
  }
  return { durationMs };
}

function measureStyles(): { durationMs: number } {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const started = performance.now();
  for (let index = 0; index < styleOperations; index += 1) {
    const owner = createStyleSheetOwner(root);
    owner.retain(benchmarkSheet);
    owner.dispose();
  }
  const durationMs = (performance.now() - started) / styleOperations;
  if (root.adoptedStyleSheets.length !== 0) throw new Error('Stylesheet ownership correctness gate retained a sheet.');
  return { durationMs };
}

async function measureTeardown(cycles: number): Promise<{ durationMs: number }> {
  let retainedDomNodes = 0;
  let detachedListenerMutations = 0;
  const started = performance.now();
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const state = reactive({ count: 0 });
    const root = document.createElement('div');
    const app = createApp(() => html`<button @click=${() => { state.count += 1; }}>${state.count}</button>`);
    const mount = app.mount(root);
    const button = root.querySelector('button');
    button?.click();
    await nextTick();
    if (state.count !== 1 || button?.textContent !== '1') throw new Error('Teardown setup correctness gate failed.');
    mount.unmount();
    retainedDomNodes += root.childNodes.length;
    button.click();
    detachedListenerMutations += state.count - 1;
  }
  const durationMs = performance.now() - started;
  if (retainedDomNodes !== 0 || detachedListenerMutations !== 0) {
    throw new Error(`Teardown correctness gate retained ${retainedDomNodes} nodes and ${detachedListenerMutations} listener mutations.`);
  }
  return { durationMs };
}

async function measureInteraction(): Promise<{ durationMs: number }> {
  const state = reactive({ count: 0 });
  const root = document.createElement('div');
  const mount = createApp(() => html`<button @click=${() => { state.count += 1; }}>${state.count}</button>`).mount(root);
  const button = root.querySelector('button');
  const started = performance.now();
  button?.click();
  await nextTick();
  const durationMs = performance.now() - started;
  if (state.count !== 1 || button?.textContent !== '1') throw new Error('Interaction correctness gate failed.');
  mount.unmount();
  return { durationMs };
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer.`);
  return value;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

declare global {
  interface Window {
    runRuntimeBrowserScorecard: typeof runRuntimeBrowserScorecard;
  }
}

window.runRuntimeBrowserScorecard = runRuntimeBrowserScorecard;
