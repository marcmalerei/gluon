import { createSSRApp, nextTick as vueNextTick, reactive as vueReactive } from 'vue';
import { hydrate as litHydrate } from '@lit-labs/ssr-client';
import { nothing as litNothing, render as litRenderClient } from 'lit';
import { nextTick, reactive } from '@gluonjs/reactivity';
import { hydrateApplication } from '@gluonjs/ssr/hydration';
import { createGluonApplication, litView, validateHydratedTree, vueView, type HydrationState } from './shared.js';

const frameworks = ['gluon', 'lit', 'vue'] as const;
type Framework = typeof frameworks[number];

export interface HydrationFixtures {
  readonly gluon: string;
  readonly lit: string;
  readonly vue: string;
}

export interface HydrationBenchmarkConfig {
  readonly samples?: number;
  readonly warmupRounds?: number;
}

export interface HydrationMeasurement {
  readonly hydrationMs: number;
  readonly interactionMs: number;
  readonly teardownMs: number;
  readonly retainedMain: true;
  readonly interactionReady: true;
  readonly cleanupEmpty: true;
  readonly markupBytes: number;
}

export interface HydrationFrameworkResult {
  readonly framework: Framework;
  readonly samples: readonly HydrationMeasurement[];
  readonly statistics: Readonly<Record<'hydrationMs' | 'interactionMs' | 'teardownMs', Statistics>>;
}

export interface HydrationComparisonResult {
  readonly schemaVersion: 1;
  readonly sampleCount: number;
  readonly warmupRounds: number;
  readonly results: readonly HydrationFrameworkResult[];
}

interface Statistics {
  readonly min: number;
  readonly median: number;
  readonly p95: number;
  readonly max: number;
}

export async function runHydrationComparison(
  fixtures: HydrationFixtures,
  config: HydrationBenchmarkConfig = {},
): Promise<HydrationComparisonResult> {
  const samples = positiveInteger(config.samples ?? 12, 'samples');
  const warmupRounds = nonNegativeInteger(config.warmupRounds ?? 4, 'warmupRounds');
  const measurements: Record<Framework, HydrationMeasurement[]> = { gluon: [], lit: [], vue: [] };
  for (let round = 0; round < warmupRounds + samples; round += 1) {
    for (const framework of rotatedFrameworks(round)) {
      const measurement = await runFramework(framework, fixtures[framework]);
      if (round >= warmupRounds) measurements[framework].push(measurement);
    }
  }
  return {
    schemaVersion: 1,
    sampleCount: samples,
    warmupRounds,
    results: frameworks.map((framework) => ({
      framework,
      samples: measurements[framework],
      statistics: {
        hydrationMs: summarize(measurements[framework].map((sample) => sample.hydrationMs)),
        interactionMs: summarize(measurements[framework].map((sample) => sample.interactionMs)),
        teardownMs: summarize(measurements[framework].map((sample) => sample.teardownMs)),
      },
    })),
  };
}

async function runFramework(framework: Framework, markup: string): Promise<HydrationMeasurement> {
  const root = document.createElement('div');
  root.dataset.framework = framework;
  root.innerHTML = markup;
  document.querySelector('#benchmark-root')?.append(root);
  try {
    if (framework === 'gluon') return await hydrateGluon(root, markup);
    if (framework === 'lit') return await hydrateLit(root, markup);
    return await hydrateVue(root, markup);
  } finally {
    root.remove();
  }
}

async function hydrateGluon(root: HTMLElement, markup: string): Promise<HydrationMeasurement> {
  const state = reactive<HydrationState>({ selectedId: 0 });
  const app = createGluonApplication(state, (id) => { state.selectedId = id; });
  const mainBefore = root.querySelector('main');
  const started = performance.now();
  const hydrated = await hydrateApplication(app, root, { recovery: 'throw' });
  const hydrationMs = performance.now() - started;
  if (!hydrated.hydration.retained || root.querySelector('main') !== mainBefore) {
    throw new Error('Gluon hydration did not retain the server main element.');
  }
  validateHydratedTree(root, 'Gluon');
  const interactionMs = await measureGluonInteraction(root);
  const teardownStarted = performance.now();
  hydrated.mount.unmount();
  const teardownMs = performance.now() - teardownStarted;
  assertEmpty(root, 'Gluon');
  return { hydrationMs, interactionMs, teardownMs, retainedMain: true, interactionReady: true, cleanupEmpty: true, markupBytes: byteLength(markup) };
}

async function measureGluonInteraction(root: HTMLElement): Promise<number> {
  const button = root.querySelector<HTMLButtonElement>('[data-row="119"] button');
  if (!button) throw new Error('Gluon hydration did not retain the target button.');
  const started = performance.now();
  button.click();
  await nextTick();
  const status = root.querySelector('[data-status]')?.textContent;
  if (status !== 'Selected: 119') throw new Error(`Gluon interaction did not update status: ${status ?? 'missing'}.`);
  return performance.now() - started;
}

async function hydrateLit(root: HTMLElement, markup: string): Promise<HydrationMeasurement> {
  const state: HydrationState = { selectedId: 0 };
  const mainBefore = root.querySelector('main');
  const onSelect = (id: number) => {
    state.selectedId = id;
    litRenderClient(litView(state, onSelect), root);
  };
  const started = performance.now();
  litHydrate(litView(state, onSelect), root);
  const hydrationMs = performance.now() - started;
  if (root.querySelector('main') !== mainBefore) throw new Error('Lit hydration did not retain the server main element.');
  validateHydratedTree(root, 'Lit');
  const button = root.querySelector<HTMLButtonElement>('[data-row="119"] button');
  if (!button) throw new Error('Lit hydration did not retain the target button.');
  const interactionStarted = performance.now();
  button.click();
  await Promise.resolve();
  if (root.querySelector('[data-status]')?.textContent !== 'Selected: 119') throw new Error('Lit interaction did not update status.');
  const interactionMs = performance.now() - interactionStarted;
  const teardownStarted = performance.now();
  litRenderClient(litNothing, root);
  const teardownMs = performance.now() - teardownStarted;
  assertEmpty(root, 'Lit');
  return { hydrationMs, interactionMs, teardownMs, retainedMain: true, interactionReady: true, cleanupEmpty: true, markupBytes: byteLength(markup) };
}

async function hydrateVue(root: HTMLElement, markup: string): Promise<HydrationMeasurement> {
  const state = vueReactive<HydrationState>({ selectedId: 0 });
  const app = createSSRApp(() => vueView(state, (id) => { state.selectedId = id; }));
  const mainBefore = root.querySelector('main');
  const started = performance.now();
  app.mount(root);
  await vueNextTick();
  const hydrationMs = performance.now() - started;
  if (root.querySelector('main') !== mainBefore) throw new Error('Vue hydration did not retain the server main element.');
  validateHydratedTree(root, 'Vue');
  const button = root.querySelector<HTMLButtonElement>('[data-row="119"] button');
  if (!button) throw new Error('Vue hydration did not retain the target button.');
  const interactionStarted = performance.now();
  button.click();
  await vueNextTick();
  if (root.querySelector('[data-status]')?.textContent !== 'Selected: 119') throw new Error('Vue interaction did not update status.');
  const interactionMs = performance.now() - interactionStarted;
  const teardownStarted = performance.now();
  app.unmount();
  const teardownMs = performance.now() - teardownStarted;
  assertEmpty(root, 'Vue');
  return { hydrationMs, interactionMs, teardownMs, retainedMain: true, interactionReady: true, cleanupEmpty: true, markupBytes: byteLength(markup) };
}

function assertEmpty(root: HTMLElement, framework: string): void {
  if (root.querySelector('*') || root.textContent !== '') {
    throw new Error(`${framework} teardown retained element or text content.`);
  }
}

function rotatedFrameworks(offset: number): readonly Framework[] {
  const start = offset % frameworks.length;
  return [...frameworks.slice(start), ...frameworks.slice(0, start)];
}

function summarize(values: readonly number[]): Statistics {
  const sorted = [...values].sort((left, right) => left - right);
  const min = sorted[0];
  const max = sorted.at(-1);
  if (min === undefined || max === undefined) throw new Error('Cannot summarize an empty hydration sample set.');
  return { min, median: quantile(sorted, 0.5), p95: quantile(sorted, 0.95), max };
}

function quantile(sorted: readonly number[], probability: number): number {
  const value = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * probability) - 1)];
  if (value === undefined) throw new Error('Cannot calculate a quantile for an empty hydration sample set.');
  return value;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer.`);
  return value;
}

declare global {
  interface Window {
    runHydrationComparison: typeof runHydrationComparison;
  }
}

window.runHydrationComparison = runHydrationComparison;
