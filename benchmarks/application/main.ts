import './styles.css';
import {
  APP_PRODUCT_COUNT,
  applicationFrameworks,
  applicationScenarios,
  createApplicationHarness,
  type ApplicationFramework,
  type ApplicationScenario,
  type ApplicationSnapshot,
} from './harnesses.js';

export interface ApplicationBenchmarkConfig {
  readonly samples?: number;
  readonly warmupRounds?: number;
}

export interface ApplicationFrameworkResult {
  readonly framework: ApplicationFramework;
  readonly batchSize: number;
  readonly samples: readonly number[];
  readonly statistics: { readonly min: number; readonly median: number; readonly p95: number; readonly max: number };
  readonly snapshot: ApplicationSnapshot;
}

export interface ApplicationScenarioResult {
  readonly scenario: ApplicationScenario;
  readonly results: readonly ApplicationFrameworkResult[];
}

export interface ApplicationBenchmarkResult {
  readonly schemaVersion: 1;
  readonly productCount: number;
  readonly scenarios: readonly ApplicationScenarioResult[];
}

export async function runApplicationComparison(config: ApplicationBenchmarkConfig = {}): Promise<ApplicationBenchmarkResult> {
  const samples = positiveInteger(config.samples ?? 12, 'samples');
  const warmupRounds = nonNegativeInteger(config.warmupRounds ?? 4, 'warmupRounds');
  const scenarios: ApplicationScenarioResult[] = [];
  for (const scenario of applicationScenarios) {
    scenarios.push({
      scenario,
      results: await runApplicationScenario(scenario, samples, warmupRounds),
    });
  }
  return { schemaVersion: 1, productCount: APP_PRODUCT_COUNT, scenarios };
}

async function runApplicationScenario(
  scenario: ApplicationScenario,
  samples: number,
  warmupRounds: number,
): Promise<readonly ApplicationFrameworkResult[]> {
  const batchSize = scenario === 'mount' || scenario === 'teardown' ? 1 : 3;
  const durations = new Map<ApplicationFramework, number[]>();
  const snapshots = new Map<ApplicationFramework, ApplicationSnapshot>();
  for (const framework of applicationFrameworks) durations.set(framework, []);

  if (scenario === 'mount' || scenario === 'teardown') {
    for (let round = 0; round < warmupRounds + samples; round += 1) {
      for (const framework of rotatedFrameworks(round)) {
        const harness = createApplicationHarness(framework);
        const started = performance.now();
        await harness.mount();
        const beforeDispose = harness.snapshot();
        await harness.dispose();
        if (round >= warmupRounds) durations.get(framework)!.push(performance.now() - started);
        snapshots.set(framework, scenario === 'mount' ? beforeDispose : harness.snapshot());
      }
    }
  } else {
    const harnesses = new Map<ApplicationFramework, ReturnType<typeof createApplicationHarness>>();
    for (const framework of applicationFrameworks) {
      const harness = createApplicationHarness(framework);
      await harness.mount();
      validateSnapshot(harness.snapshot(), 'mounted');
      if (scenario === 'bag') await harness.action('configure');
      harnesses.set(framework, harness);
    }
    for (let round = 0; round < warmupRounds; round += 1) {
      for (const framework of rotatedFrameworks(round)) {
        await runBatch(harnesses.get(framework)!, scenario, batchSize);
      }
    }
    for (let sample = 0; sample < samples; sample += 1) {
      for (const framework of rotatedFrameworks(sample)) {
        const started = performance.now();
        await runBatch(harnesses.get(framework)!, scenario, batchSize);
        durations.get(framework)!.push((performance.now() - started) / batchSize);
      }
    }
    for (const framework of applicationFrameworks) {
      const harness = harnesses.get(framework)!;
      const snapshot = harness.snapshot();
      validateSnapshot(snapshot, scenario);
      snapshots.set(framework, snapshot);
      await harness.dispose();
    }
  }

  return applicationFrameworks.map((framework) => {
    const frameworkDurations = durations.get(framework)!;
    const snapshot = snapshots.get(framework);
    if (!snapshot) throw new Error(`${framework} ${scenario} produced no correctness snapshot.`);
    validateSnapshot(snapshot, scenario);
    return {
      framework,
      batchSize,
      samples: frameworkDurations,
      statistics: summarize(frameworkDurations),
      snapshot,
    };
  });
}

function rotatedFrameworks(offset: number): readonly ApplicationFramework[] {
  const start = offset % applicationFrameworks.length;
  return [...applicationFrameworks.slice(start), ...applicationFrameworks.slice(0, start)];
}

async function runBatch(
  harness: ReturnType<typeof createApplicationHarness>,
  scenario: ApplicationScenario,
  batchSize: number,
): Promise<void> {
  if (scenario === 'mount' || scenario === 'teardown') throw new Error(`Cannot batch ${scenario}.`);
  for (let index = 0; index < batchSize; index += 1) {
    await harness.action(scenario);
  }
}

function validateSnapshot(snapshot: ApplicationSnapshot, scenario: ApplicationScenario | 'mounted'): void {
  if (scenario === 'mounted' || scenario === 'sort' || scenario === 'bag') {
    if (snapshot.productCount !== APP_PRODUCT_COUNT) {
      throw new Error(`${scenario} rendered ${snapshot.productCount} products; expected ${APP_PRODUCT_COUNT}.`);
    }
  }
  if (scenario === 'filter' && snapshot.productCount !== APP_PRODUCT_COUNT / 4 && snapshot.productCount !== APP_PRODUCT_COUNT) {
    throw new Error(`filter rendered ${snapshot.productCount} products; expected ${APP_PRODUCT_COUNT / 4} or ${APP_PRODUCT_COUNT}.`);
  }
  if (scenario === 'configure' && !snapshot.selectedProductId) {
    throw new Error('configure did not retain a selected product.');
  }
  if (scenario === 'bag' && snapshot.bagQuantity !== '0' && snapshot.bagQuantity !== '1') {
    throw new Error(`bag rendered unexpected quantity ${snapshot.bagQuantity ?? 'null'}.`);
  }
}

function summarize(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    min: sorted[0]!,
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    max: sorted.at(-1)!,
  };
}

function quantile(sorted: readonly number[], probability: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * probability) - 1)]!;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer.`);
  return value;
}

const status = document.querySelector<HTMLElement>('#benchmark-status');
const output = document.querySelector<HTMLElement>('#benchmark-output');
const button = document.querySelector<HTMLButtonElement>('#run-benchmark');
const samplesInput = document.querySelector<HTMLInputElement>('#sample-count');

button?.addEventListener('click', async () => {
  if (!status || !output || !samplesInput) return;
  button.disabled = true;
  status.textContent = 'Running production application comparison…';
  output.replaceChildren();
  try {
    const result = await runApplicationComparison({ samples: Number(samplesInput.value) });
    output.append(renderResult(result));
    status.textContent = 'Complete. Correctness invariants passed for every framework and scenario.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    button.disabled = false;
  }
});

function renderResult(result: ApplicationBenchmarkResult): HTMLElement {
  const container = document.createElement('div');
  for (const scenario of result.scenarios) {
    const card = document.createElement('section');
    card.className = 'result-card';
    const heading = document.createElement('h2');
    heading.textContent = scenario.scenario;
    card.append(heading);
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Framework</th><th>Median ms</th><th>p95 ms</th><th>Batch</th></tr></thead>';
    const body = document.createElement('tbody');
    for (const framework of scenario.results) {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${framework.framework}</td><td>${framework.statistics.median.toFixed(4)}</td><td>${framework.statistics.p95.toFixed(4)}</td><td>${framework.batchSize}</td>`;
      body.append(row);
    }
    table.append(body);
    card.append(table);
    container.append(card);
  }
  return container;
}

declare global {
  interface Window {
    runApplicationComparison: typeof runApplicationComparison;
  }
}

window.runApplicationComparison = runApplicationComparison;
