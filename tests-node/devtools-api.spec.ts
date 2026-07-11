import { describe, expect, test, vi } from 'vitest';
import {
  DevtoolsProtocol,
  GLUON_DEVTOOLS_PROTOCOL_VERSION,
  toDevtoolsValue,
} from '../packages/devtools-api/src/index.js';
import { gluonDevtoolsPlugin } from '../packages/devtools/src/index.js';

describe('Devtools protocol', () => {
  test('selects and snapshots multiple applications independently', () => {
    const protocol = new DevtoolsProtocol();
    const listener = vi.fn();
    const unsubscribe = protocol.subscribe(listener);
    const removeFirst = protocol.registerApplication(inspector('first'));
    protocol.registerApplication(inspector('second'));
    expect(protocol.snapshot()).toMatchObject({
      protocol: GLUON_DEVTOOLS_PROTOCOL_VERSION,
      selectedApplicationId: 'first',
      applications: [{ id: 'first', selected: true }, { id: 'second', selected: false }],
    });
    protocol.selectApplication('second');
    protocol.record('second', 'scheduler', { phase: 'update' }, 10);
    protocol.record('second', 'store', { id: 1 }, 11);
    expect(protocol.snapshot().timeline.map((entry) => entry.sequence)).toEqual([1, 2, 3, 4, 5]);
    expect(protocol.snapshot().timeline.at(-1)).toMatchObject({ applicationId: 'second', kind: 'store', timestamp: 11 });
    removeFirst();
    protocol.clearTimeline();
    expect(protocol.snapshot().timeline).toEqual([]);
    unsubscribe();
    expect(listener).toHaveBeenCalled();
  });

  test('rejects duplicate and unknown applications', () => {
    const protocol = new DevtoolsProtocol();
    expect(() => protocol.registerApplication(inspector(''))).toThrow('APPLICATION_ID_EMPTY');
    protocol.registerApplication(inspector('app'));
    expect(() => protocol.registerApplication(inspector('app'))).toThrow('APPLICATION_DUPLICATE');
    expect(() => protocol.selectApplication('missing')).toThrow('APPLICATION_UNKNOWN');
    expect(() => protocol.record('missing', 'render', {})).toThrow('APPLICATION_UNKNOWN');
  });

  test('normalizes errors, non-finite values, and circular data', () => {
    const circular: Record<string, unknown> = { count: 1, value: Number.NaN, missing: undefined };
    circular.self = circular;
    expect(toDevtoolsValue(circular)).toEqual({ count: 1, value: 'NaN', missing: 'undefined', self: '[Circular]' });
    expect(toDevtoolsValue(new Error('broken'))).toEqual({ name: 'Error', message: 'broken' });
    expect(toDevtoolsValue([1n, Symbol('x'), () => undefined])).toEqual(['1', 'Symbol(x)', expect.any(String)]);
  });
});

test('Vite integration enables only serve virtual modules', () => {
  const plugin = gluonDevtoolsPlugin();
  expect(plugin.resolveId?.call({} as never, 'other', undefined as never)).toBeNull();
  plugin.config?.call({} as never, {}, { command: 'build', mode: 'production' } as never);
  const id = plugin.resolveId?.call({} as never, 'virtual:gluon-devtools', undefined as never) as string;
  expect(plugin.load?.call({} as never, id, undefined as never)).toContain('enabled: false');
  plugin.config?.call({} as never, {}, { command: 'serve', mode: 'development' } as never);
  expect(plugin.load?.call({} as never, id, undefined as never)).toContain('enabled: true');
});

function inspector(id: string) {
  return {
    id,
    name: id,
    snapshot: (selected: boolean) => ({
      id, name: id, selected, mounted: true, state: {}, context: {}, components: [], stylesheets: 0,
    }),
  };
}
