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
    componentCount: COMPONENT_COUNT,
    rowCount: 0,
    firstLabel: 'Component 0 B',
    firstCount: null,
    firstItemId: null,
    firstItemLabel: null,
    lastLabel: 'Component 49 B',
    lastCount: null,
    lastItemId: null,
    lastItemLabel: null,
  },
  state: {
    componentCount: COMPONENT_COUNT,
    rowCount: 0,
    firstLabel: null,
    firstCount: 'Count: 1',
    firstItemId: null,
    firstItemLabel: null,
    lastLabel: null,
    lastCount: 'Count: 1',
    lastItemId: null,
    lastItemLabel: null,
  },
  list: {
    componentCount: COMPONENT_COUNT,
    rowCount: COMPONENT_COUNT * ITEMS_PER_COMPONENT,
    firstLabel: null,
    firstCount: null,
    firstItemId: '19',
    firstItemLabel: 'Item 19 A',
    lastLabel: null,
    lastCount: null,
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
