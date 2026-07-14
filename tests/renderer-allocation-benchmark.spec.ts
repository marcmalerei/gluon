import { describe, expect, it } from 'vitest';
import {
  allocationScenarios,
  releaseRetainedTemplateResults,
  retainTemplateResults,
  runRendererAllocationBenchmark,
} from '../benchmarks/allocations/main.js';

describe('renderer allocation benchmark', () => {
  it('retains calibrated raw samples for every targeted allocation path', async () => {
    const result = await runRendererAllocationBenchmark({ samples: 2, warmupRounds: 1 });

    expect(result.schemaVersion).toBe(1);
    expect(result.scenarios.map(({ scenario }) => scenario)).toEqual(allocationScenarios);
    for (const scenario of result.scenarios) {
      expect(scenario.batchSize).toBeGreaterThan(0);
      expect(scenario.samples).toHaveLength(2);
      expect(scenario.samples.every((sample) => sample > 0)).toBe(true);
      expect(scenario.statistics.median).toBeGreaterThan(0);
      expect(scenario.statistics.p95).toBeGreaterThan(0);
    }
  }, 30_000);

  it('exposes and releases the retained TemplateResult memory fixture', () => {
    try {
      const retained = retainTemplateResults(10);
      expect(retained.count).toBe(10);
      expect(typeof retained.sharedEmptyStyleDependencies).toBe('boolean');
    } finally {
      releaseRetainedTemplateResults();
    }
  });
});
