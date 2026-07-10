import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_ROW_COUNT,
  benchmarkFrameworks,
  createRenderingHarness,
} from '../benchmarks/rendering/harnesses.js';

describe('rendering comparison fixtures', () => {
  for (const framework of benchmarkFrameworks) {
    it(`${framework} updates the same single text binding`, () => {
      const harness = createRenderingHarness(framework, 'text');
      try {
        harness.run();
        expect(harness.snapshot()).toEqual({
          count: 1,
          firstId: '0',
          firstLabel: 'Row 0 B',
          lastId: '0',
          lastLabel: 'Row 0 B',
        });
      } finally {
        harness.dispose();
      }
    });

    it(`${framework} creates the same 1,000-row DOM`, () => {
      const harness = createRenderingHarness(framework, 'create');
      try {
        harness.run();
        expect(harness.snapshot()).toEqual({
          count: BENCHMARK_ROW_COUNT,
          firstId: '0',
          firstLabel: 'Row 0 A',
          lastId: '999',
          lastLabel: 'Row 999 A',
        });
      } finally {
        harness.dispose();
      }
    });

    it(`${framework} updates every row label in place`, () => {
      const harness = createRenderingHarness(framework, 'update');
      try {
        harness.run();
        expect(harness.snapshot()).toEqual({
          count: BENCHMARK_ROW_COUNT,
          firstId: '0',
          firstLabel: 'Row 0 B',
          lastId: '999',
          lastLabel: 'Row 999 B',
        });
      } finally {
        harness.dispose();
      }
    });

    it(`${framework} reverses keyed rows without changing their content`, () => {
      const harness = createRenderingHarness(framework, 'reverse');
      try {
        harness.run();
        expect(harness.snapshot()).toEqual({
          count: BENCHMARK_ROW_COUNT,
          firstId: '999',
          firstLabel: 'Row 999 A',
          lastId: '0',
          lastLabel: 'Row 0 A',
        });
      } finally {
        harness.dispose();
      }
    });
  }
});
