import { describe, expect, it } from 'vitest';
import {
  COMPONENT_COUNT,
  ITEMS_PER_COMPONENT,
  componentFrameworks,
  createComponentHarness,
  type ComponentHarnessSnapshot,
  type ComponentScenario,
} from '../benchmarks/components/harnesses.js';

const baseline: ComponentHarnessSnapshot = {
  componentCount: COMPONENT_COUNT,
  rowCount: COMPONENT_COUNT * ITEMS_PER_COMPONENT,
  firstLabel: 'Component 0 A',
  firstCount: 'Count: 0',
  firstItemId: '0',
  firstItemLabel: 'Item 0 A',
  lastLabel: 'Component 49 A',
  lastCount: 'Count: 0',
  lastItemId: '0',
  lastItemLabel: 'Item 0 A',
};

const expectations: Record<ComponentScenario, ComponentHarnessSnapshot> = {
  lifecycle: baseline,
  property: {
    ...baseline,
    firstLabel: 'Component 0 B',
    lastLabel: 'Component 49 B',
  },
  state: {
    ...baseline,
    firstCount: 'Count: 1',
    lastCount: 'Count: 1',
  },
  list: {
    ...baseline,
    firstItemId: '19',
    firstItemLabel: 'Item 19 A',
    lastItemId: '19',
    lastItemLabel: 'Item 19 A',
  },
};

describe('component comparison fixtures', () => {
  for (const framework of componentFrameworks) {
    for (const scenario of Object.keys(expectations) as ComponentScenario[]) {
      it(`${framework} produces the expected ${scenario} component output`, async () => {
        const harness = await createComponentHarness(framework, scenario);
        try {
          await harness.run();
          expect(harness.snapshot()).toEqual(expectations[scenario]);
        } finally {
          await harness.dispose();
        }
        expect(document.querySelectorAll('.component-benchmark-sandbox')).toHaveLength(0);
      });
    }
  }
});
