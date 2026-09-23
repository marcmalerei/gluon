import { describe, expect, it } from 'vitest';
import {
  runSpreadBindingBenchmark,
  spreadBenchmarkFrameworks,
  spreadBenchmarkScenarios,
} from '../benchmarks/spread-bindings/main.js';

describe('spread-binding benchmark', () => {
  it('retains calibrated samples and validates equivalent observable output', async () => {
    const result = await runSpreadBindingBenchmark({
      samples: 2,
      warmupRounds: 1,
      minimumBatchDurationMs: 1,
    });

    expect(result.schemaVersion).toBe(2);
    expect(result.cardCount).toBe(80);
    expect(result.scenarios.map(({ scenario }) => scenario)).toEqual(spreadBenchmarkScenarios);
    expect(Object.values(result.invariants).every(Boolean)).toBe(true);
    for (const scenario of result.scenarios) {
      expect(scenario.results.map(({ framework }) => framework)).toEqual(spreadBenchmarkFrameworks);
      for (const entry of scenario.results) {
        expect(entry.batchSize).toBeGreaterThan(0);
        expect(entry.samples).toHaveLength(2);
        expect(entry.samples.every((sample) => Number.isFinite(sample) && sample >= 0)).toBe(true);
        expect(Number.isFinite(entry.relativeToGluonSpreadMedian)).toBe(true);
        expect(Number.isFinite(entry.relativeToGluonExplicitMedian)).toBe(true);
      }
    }
  }, 30_000);
});
