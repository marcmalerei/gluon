import {
  html as gluonHtml,
  render as gluonRender,
  unmount as gluonUnmount,
  type TemplateResult,
} from '@gluonjs/core';
import { html as litHtml, nothing as litNothing, render as litRender } from 'lit-html';

export const SPREAD_CARD_COUNT = 80;
export const spreadBenchmarkFrameworks = ['gluon-spread', 'gluon-explicit', 'lit'] as const;
export const spreadBenchmarkScenarios = [
  'initial-commit',
  'stable-update-commit',
  'initial-end-to-end',
  'stable-update-end-to-end',
  'cleanup',
] as const;

type Framework = typeof spreadBenchmarkFrameworks[number];
type Scenario = typeof spreadBenchmarkScenarios[number];
type Renderable = TemplateResult | ReturnType<typeof litHtml>;

interface Card {
  readonly id: number;
  readonly labelA: string;
  readonly labelB: string;
}

interface Harness {
  measureBatch(size: number): number;
  snapshot(): Snapshot;
  dispose(): void;
}

interface Snapshot {
  readonly count: number;
  readonly firstId: string | null;
  readonly firstLabel: string | null;
  readonly lastLabel: string | null;
  readonly firstClass: string | null;
  readonly firstStyle: string;
  readonly firstAriaLabel: string | null;
}

export interface SpreadBindingBenchmarkResult {
  readonly schemaVersion: 2;
  readonly cardCount: number;
  readonly samples: number;
  readonly warmupRounds: number;
  readonly userAgent: string;
  readonly invariants: {
    readonly equivalentDom: true;
    readonly stableElementIdentity: true;
    readonly cleanupEmptiesRoots: true;
    readonly styleParity: true;
  };
  readonly scenarios: readonly {
    readonly scenario: Scenario;
    readonly unit: 'milliseconds per operation';
    readonly results: readonly {
      readonly framework: Framework;
      readonly batchSize: number;
      readonly samples: readonly number[];
      readonly statistics: ReturnType<typeof statistics>;
      readonly relativeToGluonSpreadMedian: number;
      readonly relativeToGluonExplicitMedian: number;
    }[];
  }[];
}

export interface SpreadBindingBenchmarkConfig {
  readonly samples?: number;
  readonly warmupRounds?: number;
  readonly minimumBatchDurationMs?: number;
}

const cards: readonly Card[] = Array.from({ length: SPREAD_CARD_COUNT }, (_, id) => ({
  id,
  labelA: `Card ${id} A`,
  labelB: `Card ${id} B`,
}));
const minimumBatchDuration = 12;
const maximumBatchOperations = 1_000_000;

export async function runSpreadBindingBenchmark(
  config: SpreadBindingBenchmarkConfig = {},
): Promise<SpreadBindingBenchmarkResult> {
  const samples = positiveInteger(config.samples ?? 40, 'samples');
  const warmupRounds = positiveInteger(config.warmupRounds ?? 8, 'warmupRounds');
  const minimumDuration = positiveInteger(
    config.minimumBatchDurationMs ?? minimumBatchDuration,
    'minimumBatchDurationMs',
  );
  const invariants = validateInvariants();
  const scenarios: SpreadBindingBenchmarkResult['scenarios'][number][] = [];

  for (const scenario of spreadBenchmarkScenarios) {
    const harnesses = new Map(spreadBenchmarkFrameworks.map((framework) => [
      framework,
      createHarness(framework, scenario),
    ]));
    const raw = new Map(spreadBenchmarkFrameworks.map((framework) => [framework, [] as number[]]));
    let batchSize = 1;
    try {
      batchSize = calibrate(harnesses, batchSize, minimumDuration);
      for (let round = 0; round < warmupRounds; round += 1) {
        for (const framework of rotatedFrameworks(round)) {
          harnesses.get(framework)!.measureBatch(batchSize);
        }
      }
      for (let sample = 0; sample < samples; sample += 1) {
        for (const framework of rotatedFrameworks(sample)) {
          raw.get(framework)!.push(harnesses.get(framework)!.measureBatch(batchSize) / batchSize);
        }
        await nextFrame();
      }
      const gluonSpreadMedian = statistics(raw.get('gluon-spread')!).median;
      const gluonExplicitMedian = statistics(raw.get('gluon-explicit')!).median;
      scenarios.push({
        scenario,
        unit: 'milliseconds per operation',
        results: spreadBenchmarkFrameworks.map((framework) => {
          const frameworkSamples = raw.get(framework)!;
          const frameworkStatistics = statistics(frameworkSamples);
          return {
            framework,
            batchSize,
            samples: frameworkSamples,
            statistics: frameworkStatistics,
            relativeToGluonSpreadMedian: frameworkStatistics.median / gluonSpreadMedian,
            relativeToGluonExplicitMedian: frameworkStatistics.median / gluonExplicitMedian,
          };
        }),
      });
    } finally {
      for (const harness of harnesses.values()) harness.dispose();
    }
  }

  return {
    schemaVersion: 2,
    cardCount: SPREAD_CARD_COUNT,
    samples,
    warmupRounds,
    userAgent: navigator.userAgent,
    invariants,
    scenarios,
  };
}

function createHarness(framework: Framework, scenario: Scenario): Harness {
  let root = document.createElement('div');
  let alternate = false;
  let firstElement: Element | null = null;
  const preparedA = createView(framework, false);
  const preparedB = createView(framework, true);

  if (scenario.includes('update') || scenario === 'cleanup') {
    commit(framework, preparedA, root);
    firstElement = root.querySelector('article');
  }

  return {
    measureBatch(size) {
      if (scenario === 'initial-commit') {
        let elapsed = 0;
        for (let iteration = 0; iteration < size; iteration += 1) {
          root = document.createElement('div');
          const started = performance.now();
          commit(framework, preparedA, root);
          elapsed += performance.now() - started;
          dispose(framework, root);
        }
        return elapsed;
      }
      if (scenario === 'initial-end-to-end') {
        let elapsed = 0;
        for (let iteration = 0; iteration < size; iteration += 1) {
          root = document.createElement('div');
          const started = performance.now();
          commit(framework, createView(framework, false), root);
          elapsed += performance.now() - started;
          dispose(framework, root);
        }
        return elapsed;
      }
      if (scenario === 'cleanup') {
        let elapsed = 0;
        for (let iteration = 0; iteration < size; iteration += 1) {
          const started = performance.now();
          dispose(framework, root);
          elapsed += performance.now() - started;
          if (root.childNodes.length !== 0) throw new Error(`${framework} cleanup left DOM nodes behind.`);
          root = document.createElement('div');
          commit(framework, preparedA, root);
        }
        return elapsed;
      }

      const started = performance.now();
      for (let iteration = 0; iteration < size; iteration += 1) {
        alternate = !alternate;
        const view = scenario === 'stable-update-commit'
          ? alternate ? preparedB : preparedA
          : createView(framework, alternate);
        commit(framework, view, root);
      }
      const elapsed = performance.now() - started;
      if (root.querySelector('article') !== firstElement) {
        throw new Error(`${framework} replaced card DOM during a stable update.`);
      }
      return elapsed;
    },
    snapshot: () => snapshot(root),
    dispose: () => dispose(framework, root),
  };
}

function createView(framework: Framework, alternate: boolean): Renderable {
  if (framework === 'gluon-spread') {
    return gluonHtml`<main>${cards.map((card) => gluonSpreadCard(card, alternate))}</main>`;
  }
  if (framework === 'gluon-explicit') {
    return gluonHtml`<main>${cards.map((card) => gluonExplicitCard(card, alternate))}</main>`;
  }
  return litHtml`<main>${cards.map((card) => litCard(card, alternate))}</main>`;
}

function gluonSpreadCard(card: Card, alternate: boolean): TemplateResult {
  const props = {
    class: ['card', { featured: card.id % 8 === 0 }],
    title: `Product ${card.id}`,
    data: { cardId: card.id, track: 'benchmark' },
    aria: { label: `Product card ${card.id}` },
    style: { '--card-index': card.id, color: card.id % 2 === 0 ? 'navy' : 'black' },
    '?hidden': false,
    '.tabIndex': 0,
  };
  return gluonHtml`<article ...=${props}><h2>${alternate ? card.labelB : card.labelA}</h2></article>`;
}

function gluonExplicitCard(card: Card, alternate: boolean): TemplateResult {
  const className = card.id % 8 === 0 ? 'card featured' : 'card';
  const color = card.id % 2 === 0 ? 'navy' : 'black';
  return gluonHtml`<article
    class=${className}
    title=${`Product ${card.id}`}
    data-card-id=${String(card.id)}
    data-track="benchmark"
    aria-label=${`Product card ${card.id}`}
    style=${`--card-index: ${card.id}; color: ${color};`}
    ?hidden=${false}
    .tabIndex=${0}
  ><h2>${alternate ? card.labelB : card.labelA}</h2></article>`;
}

function litCard(card: Card, alternate: boolean): ReturnType<typeof litHtml> {
  const className = card.id % 8 === 0 ? 'card featured' : 'card';
  const color = card.id % 2 === 0 ? 'navy' : 'black';
  return litHtml`<article
    class=${className}
    title=${`Product ${card.id}`}
    data-card-id=${String(card.id)}
    data-track="benchmark"
    aria-label=${`Product card ${card.id}`}
    style=${`--card-index: ${card.id}; color: ${color};`}
    ?hidden=${false}
    .tabIndex=${0}
  ><h2>${alternate ? card.labelB : card.labelA}</h2></article>`;
}

function commit(framework: Framework, value: Renderable, root: HTMLElement): void {
  if (framework === 'gluon-spread' || framework === 'gluon-explicit') gluonRender(value as TemplateResult, root);
  else litRender(value as ReturnType<typeof litHtml>, root);
}

function dispose(framework: Framework, root: HTMLElement): void {
  if (framework === 'gluon-spread' || framework === 'gluon-explicit') gluonUnmount(root);
  else litRender(litNothing, root);
  root.replaceChildren();
}

function validateInvariants(): SpreadBindingBenchmarkResult['invariants'] {
  const roots = spreadBenchmarkFrameworks.map(() => document.createElement('div'));
  spreadBenchmarkFrameworks.forEach((framework, index) => commit(framework, createView(framework, false), roots[index]!));
  const initialElements = roots.map((root) => root.querySelector('article'));
  spreadBenchmarkFrameworks.forEach((framework, index) => commit(framework, createView(framework, true), roots[index]!));
  const snapshots = roots.map(snapshot);
  if (snapshots.some((value) => JSON.stringify(value) !== JSON.stringify(snapshots[0]))) {
    throw new Error(`Binding lanes produced different card snapshots: ${JSON.stringify(snapshots)}`);
  }
  if (roots.some((root, index) => root.querySelector('article') !== initialElements[index])) {
    throw new Error('A renderer replaced card DOM during a stable update.');
  }
  const styleParity = snapshots[0]!.firstStyle === snapshots[1]!.firstStyle;
  if (!styleParity) throw new Error('Gluon and Lit produced different inline style output.');
  for (let index = 0; index < roots.length; index += 1) {
    dispose(spreadBenchmarkFrameworks[index]!, roots[index]!);
    if (roots[index]!.childNodes.length !== 0) throw new Error('Renderer cleanup left DOM nodes behind.');
  }
  return {
    equivalentDom: true,
    stableElementIdentity: true,
    cleanupEmptiesRoots: true,
    styleParity: true,
  };
}

function snapshot(root: HTMLElement): Snapshot {
  const articles = [...root.querySelectorAll('article')];
  const first = articles[0] as HTMLElement | undefined;
  const last = articles[articles.length - 1] as HTMLElement | undefined;
  return {
    count: articles.length,
    firstId: first?.dataset.cardId ?? null,
    firstLabel: first?.textContent ?? null,
    lastLabel: last?.textContent ?? null,
    firstClass: first?.getAttribute('class') ?? null,
    firstStyle: first?.getAttribute('style') ?? '',
    firstAriaLabel: first?.getAttribute('aria-label') ?? null,
  };
}

function calibrate(
  harnesses: ReadonlyMap<Framework, Harness>,
  initialSize: number,
  minimumDuration: number,
): number {
  let size = initialSize;
  while (size <= maximumBatchOperations) {
    let shortest = Number.POSITIVE_INFINITY;
    for (const framework of spreadBenchmarkFrameworks) {
      shortest = Math.min(shortest, harnesses.get(framework)!.measureBatch(size));
    }
    if (shortest >= minimumDuration) return size;
    size *= shortest === 0 ? 10 : Math.max(2, Math.ceil(minimumDuration / shortest));
  }
  throw new Error(`Could not calibrate the spread-binding benchmark below ${maximumBatchOperations.toLocaleString()} operations.`);
}

function rotatedFrameworks(offset: number): readonly Framework[] {
  return offset % 2 === 0 ? spreadBenchmarkFrameworks : [...spreadBenchmarkFrameworks].reverse();
}

function statistics(samples: readonly number[]) {
  const sorted = [...samples].sort((left, right) => left - right);
  return {
    min: sorted[0]!,
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    max: sorted[sorted.length - 1]!,
  };
}

function quantile(sorted: readonly number[], percentile: number): number {
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  const weight = index - lower;
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

declare global {
  interface Window {
    runSpreadBindingBenchmark: typeof runSpreadBindingBenchmark;
  }
}

window.runSpreadBindingBenchmark = runSpreadBindingBenchmark;
