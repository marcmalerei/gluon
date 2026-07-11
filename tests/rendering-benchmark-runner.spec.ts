import { describe, expect, it } from 'vitest';
import {
  runRenderingComparison,
  type RenderingBenchmarkResult,
} from '../benchmarks/rendering/main.js';

describe('rendering comparison runner', () => {
  it('retains calibrated raw samples and equivalent output for every renderer', async () => {
    const result: RenderingBenchmarkResult = await runRenderingComparison({
      samples: 2,
      warmupRounds: 1,
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.scenarios.map((scenario) => scenario.scenario)).toEqual([
      'text',
      'create',
      'update',
      'reverse',
    ]);
    for (const scenario of result.scenarios) {
      expect(scenario.results.map((entry) => entry.framework)).toEqual([
        'gluon',
        'lit',
        'vue',
        'vanilla',
      ]);
      expect(new Set(scenario.results.map((entry) => entry.batchSize)).size).toBe(1);
      expect(scenario.results[0]!.batchSize).toBeGreaterThan(0);
      expect(new Set(scenario.results.map((entry) => JSON.stringify(entry.snapshot))).size).toBe(1);
      for (const entry of scenario.results) {
        expect(entry.samples).toHaveLength(2);
        expect(entry.samples.every((sample) => sample > 0)).toBe(true);
        expect(entry.relativeToGluonMedian).toBeGreaterThan(0);
      }
    }
  }, 30_000);
});
