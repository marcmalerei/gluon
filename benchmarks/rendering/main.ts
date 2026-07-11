import {
  BENCHMARK_ROW_COUNT,
  benchmarkFrameworks,
  benchmarkScenarios,
  createRenderingHarness,
  type BenchmarkFramework,
  type BenchmarkScenario,
  type HarnessSnapshot,
} from './harnesses.js';
import './styles.css';

export interface RenderingBenchmarkConfig {
  readonly samples?: number;
  readonly warmupRounds?: number;
}

export interface SampleStatistics {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly p75: number;
  readonly p95: number;
  readonly p99: number;
}

export interface FrameworkBenchmarkResult {
  readonly framework: BenchmarkFramework;
  readonly batchSize: number;
  readonly samples: readonly number[];
  readonly statistics: SampleStatistics;
  readonly relativeToGluonMedian: number;
  readonly snapshot: HarnessSnapshot;
}

export interface ScenarioBenchmarkResult {
  readonly scenario: BenchmarkScenario;
  readonly unit: 'milliseconds per operation';
  readonly results: readonly FrameworkBenchmarkResult[];
}

export interface RenderingBenchmarkResult {
  readonly schemaVersion: 1;
  readonly rowCount: number;
  readonly samples: number;
  readonly warmupRounds: number;
  readonly userAgent: string;
  readonly scenarios: readonly ScenarioBenchmarkResult[];
}

const batchSizes: Record<BenchmarkScenario, number> = {
  text: 500,
  create: 3,
  update: 20,
  reverse: 10,
};
const minimumBatchDuration = 8;

export async function runRenderingComparison(
  config: RenderingBenchmarkConfig = {},
): Promise<RenderingBenchmarkResult> {
  const samples = positiveInteger(config.samples ?? 40, 'samples');
  const warmupRounds = positiveInteger(config.warmupRounds ?? 8, 'warmupRounds');
  const scenarios: ScenarioBenchmarkResult[] = [];

  for (const scenario of benchmarkScenarios) {
    const harnesses = new Map(benchmarkFrameworks.map((framework) => [
      framework,
      createRenderingHarness(framework, scenario),
    ]));
    const raw = new Map(benchmarkFrameworks.map((framework) => [framework, [] as number[]]));
    let batchSize = batchSizes[scenario];
    try {
      validateSnapshots(scenario, harnesses);
      batchSize = calibrateBatchSize(harnesses, batchSize);
      for (let round = 0; round < warmupRounds; round += 1) {
        for (const framework of rotatedFrameworks(round)) {
          runBatch(harnesses.get(framework)!, batchSize);
        }
      }
      for (let sample = 0; sample < samples; sample += 1) {
        for (const framework of rotatedFrameworks(sample)) {
          const harness = harnesses.get(framework)!;
          const started = performance.now();
          runBatch(harness, batchSize);
          raw.get(framework)!.push((performance.now() - started) / batchSize);
        }
        await nextFrame();
      }
      validateSnapshots(scenario, harnesses);
      const gluonMedian = statistics(raw.get('gluon')!).median;
      if (gluonMedian <= 0) {
        throw new Error(`${scenario} produced a zero-duration Gluon median after batch calibration.`);
      }
      scenarios.push({
        scenario,
        unit: 'milliseconds per operation',
        results: benchmarkFrameworks.map((framework) => {
          const frameworkSamples = raw.get(framework)!;
          const frameworkStatistics = statistics(frameworkSamples);
          return {
            framework,
            batchSize,
            samples: frameworkSamples,
            statistics: frameworkStatistics,
            relativeToGluonMedian: frameworkStatistics.median / gluonMedian,
            snapshot: harnesses.get(framework)!.snapshot(),
          };
        }),
      });
    } finally {
      for (const harness of harnesses.values()) harness.dispose();
    }
  }

  return {
    schemaVersion: 1,
    rowCount: BENCHMARK_ROW_COUNT,
    samples,
    warmupRounds,
    userAgent: navigator.userAgent,
    scenarios,
  };
}

function runBatch(harness: ReturnType<typeof createRenderingHarness>, size: number): void {
  for (let iteration = 0; iteration < size; iteration += 1) harness.run();
}

function calibrateBatchSize(
  harnesses: ReadonlyMap<BenchmarkFramework, ReturnType<typeof createRenderingHarness>>,
  initialSize: number,
): number {
  let size = initialSize;
  while (size <= 1_000_000) {
    let shortestDuration = Number.POSITIVE_INFINITY;
    for (const framework of benchmarkFrameworks) {
      const started = performance.now();
      runBatch(harnesses.get(framework)!, size);
      shortestDuration = Math.min(shortestDuration, performance.now() - started);
    }
    if (shortestDuration >= minimumBatchDuration) return size;
    size *= shortestDuration === 0
      ? 10
      : Math.max(2, Math.ceil(minimumBatchDuration / shortestDuration));
  }
  throw new Error('Could not calibrate a stable benchmark batch below 1,000,000 operations.');
}

function validateSnapshots(
  scenario: BenchmarkScenario,
  harnesses: ReadonlyMap<BenchmarkFramework, ReturnType<typeof createRenderingHarness>>,
): void {
  const snapshots = benchmarkFrameworks.map((framework) => harnesses.get(framework)!.snapshot());
  const expected = JSON.stringify(snapshots[0]);
  if (snapshots.some((snapshot) => JSON.stringify(snapshot) !== expected)) {
    throw new Error(`${scenario} implementations produced different DOM snapshots: ${JSON.stringify(snapshots)}`);
  }
  const expectedCount = scenario === 'text' ? 1 : BENCHMARK_ROW_COUNT;
  if (snapshots[0]?.count !== expectedCount) {
    throw new Error(`${scenario} produced ${snapshots[0]?.count ?? 0} rows instead of ${expectedCount}.`);
  }
}

function rotatedFrameworks(offset: number): readonly BenchmarkFramework[] {
  const start = offset % benchmarkFrameworks.length;
  return [...benchmarkFrameworks.slice(start), ...benchmarkFrameworks.slice(0, start)];
}

function statistics(samples: readonly number[]): SampleStatistics {
  const sorted = [...samples].sort((left, right) => left - right);
  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean: sorted.reduce((total, value) => total + value, 0) / sorted.length,
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p95: quantile(sorted, 0.95),
    p99: quantile(sorted, 0.99),
  };
}

function quantile(sorted: readonly number[], probability: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * probability) - 1)]!;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

declare global {
  interface Window {
    runRenderingComparison: typeof runRenderingComparison;
  }
}

window.runRenderingComparison = runRenderingComparison;

const runButton = document.querySelector<HTMLButtonElement>('#run-benchmark');
const sampleInput = document.querySelector<HTMLInputElement>('#sample-count');
const status = document.querySelector<HTMLElement>('#benchmark-status');
const output = document.querySelector<HTMLElement>('#benchmark-output');

runButton?.addEventListener('click', async () => {
  if (!runButton || !status || !output) return;
  runButton.disabled = true;
  status.textContent = 'Running warm-ups and interleaved samples…';
  output.replaceChildren();
  try {
    const result = await runRenderingComparison({ samples: Number(sampleInput?.value ?? 40) });
    renderResult(result, output);
    status.textContent = 'Complete. Lower milliseconds per operation is faster.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    runButton.disabled = false;
  }
});

function renderResult(result: RenderingBenchmarkResult, container: HTMLElement): void {
  for (const scenario of result.scenarios) {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    const table = document.createElement('table');
    heading.textContent = scenario.scenario;
    table.innerHTML = '<thead><tr><th>Renderer</th><th>Batch</th><th>Median ms/op</th><th>p95</th><th>vs Gluon</th></tr></thead>';
    const body = table.createTBody();
    for (const entry of scenario.results) {
      const row = body.insertRow();
      row.insertCell().textContent = entry.framework;
      row.insertCell().textContent = String(entry.batchSize);
      row.insertCell().textContent = formatMilliseconds(entry.statistics.median);
      row.insertCell().textContent = formatMilliseconds(entry.statistics.p95);
      row.insertCell().textContent = `${entry.relativeToGluonMedian.toFixed(2)}×`;
    }
    section.append(heading, table);
    container.append(section);
  }
}

function formatMilliseconds(value: number): string {
  return value < 0.01 ? value.toFixed(6) : value.toFixed(4);
}
