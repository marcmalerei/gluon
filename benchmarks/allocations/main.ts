import { html, render, unmount, type TemplateResult } from '@gluonjs/core';

export const allocationScenarios = ['template', 'text', 'spread', 'array'] as const;
export type AllocationScenario = typeof allocationScenarios[number];

export interface AllocationBenchmarkConfig {
  readonly samples?: number;
  readonly warmupRounds?: number;
}

export interface AllocationScenarioResult {
  readonly scenario: AllocationScenario;
  readonly batchSize: number;
  readonly samples: readonly number[];
  readonly statistics: {
    readonly min: number;
    readonly median: number;
    readonly p95: number;
    readonly max: number;
  };
}

export interface AllocationBenchmarkResult {
  readonly schemaVersion: 1;
  readonly samples: number;
  readonly warmupRounds: number;
  readonly userAgent: string;
  readonly scenarios: readonly AllocationScenarioResult[];
}

let retainedTemplates: TemplateResult[] = [];

export async function runRendererAllocationBenchmark(
  config: AllocationBenchmarkConfig = {},
): Promise<AllocationBenchmarkResult> {
  const samples = positiveInteger(config.samples ?? 40, 'samples');
  const warmupRounds = positiveInteger(config.warmupRounds ?? 8, 'warmupRounds');
  const scenarios: AllocationScenarioResult[] = [];

  for (const scenario of allocationScenarios) {
    const harness = createHarness(scenario);
    let batchSize = initialBatchSizes[scenario];
    try {
      batchSize = calibrate(harness.run, batchSize);
      for (let round = 0; round < warmupRounds; round += 1) runBatch(harness.run, batchSize);
      const raw: number[] = [];
      for (let sample = 0; sample < samples; sample += 1) {
        const started = performance.now();
        runBatch(harness.run, batchSize);
        raw.push((performance.now() - started) / batchSize);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      scenarios.push({ scenario, batchSize, samples: raw, statistics: statistics(raw) });
    } finally {
      harness.dispose();
    }
  }

  return {
    schemaVersion: 1,
    samples,
    warmupRounds,
    userAgent: navigator.userAgent,
    scenarios,
  };
}

export function retainTemplateResults(count: number): {
  readonly count: number;
  readonly sharedEmptyStyleDependencies: boolean;
} {
  const retainedCount = positiveInteger(count, 'count');
  const first = html`<p>${1}</p>`;
  const second = html`<p>${2}</p>`;
  retainedTemplates = Array.from({ length: retainedCount }, (_, index) => html`<p>${index}</p>`);
  return {
    count: retainedTemplates.length,
    sharedEmptyStyleDependencies: first.styleDependencies === second.styleDependencies,
  };
}

export function releaseRetainedTemplateResults(): void {
  retainedTemplates = [];
}

interface Harness {
  run(): void;
  dispose(): void;
}

const initialBatchSizes: Record<AllocationScenario, number> = {
  template: 100_000,
  text: 50_000,
  spread: 5_000,
  array: 100,
};

function createHarness(scenario: AllocationScenario): Harness {
  if (scenario === 'template') {
    const ring = new Array<TemplateResult>(1_024);
    let index = 0;
    return {
      run() {
        ring[index % ring.length] = html`<p>${index}</p>`;
        index += 1;
      },
      dispose() {
        ring.length = 0;
      },
    };
  }

  const root = document.createElement('div');
  let alternate = false;
  if (scenario === 'text') {
    const view = (value: string) => html`<p>${value}</p>`;
    render(view('A'), root);
    return {
      run() {
        alternate = !alternate;
        render(view(alternate ? 'A' : 'B'), root);
      },
      dispose: () => unmount(root),
    };
  }

  if (scenario === 'spread') {
    const firstClick = (): void => undefined;
    const secondClick = (): void => undefined;
    const firstRef = { value: undefined as Element | undefined };
    const secondRef = { value: undefined as Element | undefined };
    const first = {
      class: 'first',
      title: 'First',
      'data-id': '1',
      disabled: false,
      tabIndex: 0,
      aria: { label: 'First' },
      data: { track: 'first' },
      style: { color: 'red' },
      onClick: firstClick,
      ref: firstRef,
    };
    const second = {
      class: 'second',
      title: 'Second',
      'data-id': '2',
      disabled: true,
      tabIndex: 1,
      aria: { label: 'Second' },
      data: { track: 'second' },
      style: { color: 'blue' },
      onClick: secondClick,
      ref: secondRef,
    };
    const view = (props: Readonly<Record<string, unknown>>) => html`<button ...=${props}>Save</button>`;
    render(view(first), root);
    return {
      run() {
        alternate = !alternate;
        render(view(alternate ? first : second), root);
      },
      dispose: () => unmount(root),
    };
  }

  const first = Array.from({ length: 100 }, (_, index) => `A${index}`);
  const second = Array.from({ length: 100 }, (_, index) => `B${index}`);
  const view = (values: readonly string[]) => html`<main>${values}</main>`;
  render(view(first), root);
  return {
    run() {
      alternate = !alternate;
      render(view(alternate ? first : second), root);
    },
    dispose: () => unmount(root),
  };
}

function calibrate(run: () => void, initialSize: number): number {
  let size = initialSize;
  while (size <= 100_000_000) {
    const started = performance.now();
    runBatch(run, size);
    if (performance.now() - started >= 12) return size;
    size *= 2;
  }
  throw new Error('Could not calibrate a stable renderer-allocation batch.');
}

function runBatch(run: () => void, size: number): void {
  for (let iteration = 0; iteration < size; iteration += 1) run();
}

function statistics(samples: readonly number[]): AllocationScenarioResult['statistics'] {
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

declare global {
  interface Window {
    runRendererAllocationBenchmark: typeof runRendererAllocationBenchmark;
    retainTemplateResults: typeof retainTemplateResults;
    releaseRetainedTemplateResults: typeof releaseRetainedTemplateResults;
  }
}

window.runRendererAllocationBenchmark = runRendererAllocationBenchmark;
window.retainTemplateResults = retainTemplateResults;
window.releaseRetainedTemplateResults = releaseRetainedTemplateResults;
