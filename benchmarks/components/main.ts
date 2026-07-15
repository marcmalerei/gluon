import {
  COMPONENT_COUNT,
  ITEMS_PER_COMPONENT,
  componentFrameworks,
  componentScenarios,
  createComponentHarness,
  type ComponentFramework,
  type ComponentHarness,
  type ComponentHarnessSnapshot,
  type ComponentScenario,
} from './harnesses.js';
import '../rendering/styles.css';
import './styles.css';

export interface ComponentBenchmarkConfig {
  readonly samples?: number;
  readonly warmupRounds?: number;
  readonly scenarios?: readonly ComponentScenario[];
}

export interface ComponentSampleStatistics {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly p75: number;
  readonly p95: number;
  readonly p99: number;
}

export interface ComponentFrameworkBenchmarkResult {
  readonly framework: ComponentFramework;
  readonly batchSize: number;
  readonly samples: readonly number[];
  readonly statistics: ComponentSampleStatistics;
  readonly relativeToGluonMedian: number;
  readonly snapshot: ComponentHarnessSnapshot;
}

export interface ComponentScenarioBenchmarkResult {
  readonly scenario: ComponentScenario;
  readonly unit: 'milliseconds per 50 components';
  readonly results: readonly ComponentFrameworkBenchmarkResult[];
}

export interface ComponentBenchmarkResult {
  readonly schemaVersion: 1;
  readonly componentCount: number;
  readonly itemsPerComponent: number;
  readonly samples: number;
  readonly warmupRounds: number;
  readonly userAgent: string;
  readonly scenarios: readonly ComponentScenarioBenchmarkResult[];
}

const initialBatchSizes: Record<ComponentScenario, number> = {
  lifecycle: 1,
  property: 2,
  state: 2,
  list: 1,
};
const minimumBatchDuration = 8;

export async function runComponentComparison(
  config: ComponentBenchmarkConfig = {},
): Promise<ComponentBenchmarkResult> {
  const samples = positiveInteger(config.samples ?? 40, 'samples');
  const warmupRounds = positiveInteger(config.warmupRounds ?? 8, 'warmupRounds');
  const selectedScenarios = validateScenarioSelection(config.scenarios);
  const scenarios: ComponentScenarioBenchmarkResult[] = [];

  for (const scenario of selectedScenarios) {
    const harnesses = new Map<ComponentFramework, ComponentHarness>();
    for (const framework of componentFrameworks) {
      harnesses.set(framework, await createComponentHarness(framework, scenario));
    }
    const raw = new Map(componentFrameworks.map((framework) => [framework, [] as number[]]));
    let batchSize = initialBatchSizes[scenario];
    try {
      validateSnapshots(scenario, harnesses);
      batchSize = await calibrateBatchSize(harnesses, batchSize);
      for (let round = 0; round < warmupRounds; round += 1) {
        for (const framework of rotatedFrameworks(round)) {
          await runBatch(harnesses.get(framework)!, batchSize);
        }
      }
      for (let sample = 0; sample < samples; sample += 1) {
        for (const framework of rotatedFrameworks(sample)) {
          const harness = harnesses.get(framework)!;
          const started = performance.now();
          await runBatch(harness, batchSize);
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
        unit: 'milliseconds per 50 components',
        results: componentFrameworks.map((framework) => {
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
      await Promise.all([...harnesses.values()].map((harness) => harness.dispose()));
    }
  }

  return {
    schemaVersion: 1,
    componentCount: COMPONENT_COUNT,
    itemsPerComponent: ITEMS_PER_COMPONENT,
    samples,
    warmupRounds,
    userAgent: navigator.userAgent,
    scenarios,
  };
}

function validateScenarioSelection(
  scenarios: readonly ComponentScenario[] | undefined,
): readonly ComponentScenario[] {
  if (scenarios === undefined) return componentScenarios;
  if (
    scenarios.length === 0
    || new Set(scenarios).size !== scenarios.length
    || scenarios.some((scenario) => !componentScenarios.includes(scenario))
  ) {
    throw new TypeError('scenarios must contain unique supported component scenarios.');
  }
  return scenarios;
}

async function runBatch(harness: ComponentHarness, size: number): Promise<void> {
  for (let iteration = 0; iteration < size; iteration += 1) await harness.run();
}

async function calibrateBatchSize(
  harnesses: ReadonlyMap<ComponentFramework, ComponentHarness>,
  initialSize: number,
): Promise<number> {
  let size = initialSize;
  while (size <= 10_000) {
    let shortestDuration = Number.POSITIVE_INFINITY;
    for (const framework of componentFrameworks) {
      const started = performance.now();
      await runBatch(harnesses.get(framework)!, size);
      shortestDuration = Math.min(shortestDuration, performance.now() - started);
    }
    if (shortestDuration >= minimumBatchDuration) return size;
    size *= shortestDuration === 0
      ? 10
      : Math.max(2, Math.ceil(minimumBatchDuration / shortestDuration));
  }
  throw new Error('Could not calibrate a stable component benchmark batch below 10,000 operations.');
}

function validateSnapshots(
  scenario: ComponentScenario,
  harnesses: ReadonlyMap<ComponentFramework, ComponentHarness>,
): void {
  const snapshots = componentFrameworks.map((framework) => harnesses.get(framework)!.snapshot());
  const expected = JSON.stringify(snapshots[0]);
  if (snapshots.some((snapshot) => JSON.stringify(snapshot) !== expected)) {
    throw new Error(`${scenario} implementations produced different component snapshots: ${JSON.stringify(snapshots)}`);
  }
  if (snapshots[0]?.componentCount !== COMPONENT_COUNT) {
    throw new Error(`${scenario} produced ${snapshots[0]?.componentCount ?? 0} components instead of ${COMPONENT_COUNT}.`);
  }
  const expectedRows = scenario === 'lifecycle' || scenario === 'list'
    ? COMPONENT_COUNT * ITEMS_PER_COMPONENT
    : 0;
  if (snapshots[0]?.rowCount !== expectedRows) {
    throw new Error(`${scenario} produced ${snapshots[0]?.rowCount ?? 0} rows instead of ${expectedRows}.`);
  }
}

function rotatedFrameworks(offset: number): readonly ComponentFramework[] {
  const start = offset % componentFrameworks.length;
  return [...componentFrameworks.slice(start), ...componentFrameworks.slice(0, start)];
}

function statistics(samples: readonly number[]): ComponentSampleStatistics {
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
    runComponentComparison: typeof runComponentComparison;
  }
}

window.runComponentComparison = runComponentComparison;

const runButton = document.querySelector<HTMLButtonElement>('#run-benchmark');
const sampleInput = document.querySelector<HTMLInputElement>('#sample-count');
const status = document.querySelector<HTMLElement>('#benchmark-status');
const output = document.querySelector<HTMLElement>('#benchmark-output');

runButton?.addEventListener('click', async () => {
  if (!runButton || !status || !output) return;
  runButton.disabled = true;
  status.textContent = 'Running component warm-ups and interleaved samples…';
  output.replaceChildren();
  try {
    const result = await runComponentComparison({ samples: Number(sampleInput?.value ?? 40) });
    renderResult(result, output);
    status.textContent = 'Complete. Lower milliseconds per 50 components is faster.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    runButton.disabled = false;
  }
});

function renderResult(result: ComponentBenchmarkResult, container: HTMLElement): void {
  for (const scenario of result.scenarios) {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    const table = document.createElement('table');
    heading.textContent = scenario.scenario;
    table.innerHTML = '<thead><tr><th>Framework</th><th>Batch</th><th>Median ms/50</th><th>p95</th><th>vs Gluon</th></tr></thead>';
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
