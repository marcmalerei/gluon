import { describe, expect, it, vi } from 'vitest';
import {
  createIntersectionObserver,
  createMutationObserver,
  createResizeObserver,
} from '../src/index.js';

class TestObserver<Entry> {
  static instances: TestObserver<unknown>[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(
    readonly callback: (entries: Entry[]) => void,
    readonly options?: unknown,
  ) {
    TestObserver.instances.push(this as TestObserver<unknown>);
  }
}

describe('platform observers', () => {
  it.each([
    ['IntersectionObserver', () => createIntersectionObserver({ threshold: 0.5 })],
    ['ResizeObserver', () => createResizeObserver({ box: 'border-box' })],
    ['MutationObserver', () => createMutationObserver({ childList: true })],
  ] as const)('observes, publishes, retargets, and stops %s', (name, create) => {
    TestObserver.instances = [];
    vi.stubGlobal(name, TestObserver);
    const first = document.createElement('div');
    const second = document.createElement('section');
    const handle = create();

    handle.ref(first);
    const initial = TestObserver.instances[0]!;
    expect(handle.supported.value).toBe(true);
    expect(initial.observe).toHaveBeenCalledWith(
      first,
      name === 'ResizeObserver'
        ? { box: 'border-box' }
        : name === 'MutationObserver'
          ? { childList: true }
          : undefined,
    );

    const entry = { target: first };
    initial.callback([entry]);
    expect(handle.entries.value).toEqual([entry]);

    handle.ref(second);
    expect(initial.disconnect).toHaveBeenCalledOnce();
    expect(handle.entries.value).toEqual([]);
    initial.callback([{ target: first }]);
    expect(handle.entries.value).toEqual([]);

    const current = TestObserver.instances[1]!;
    handle.stop();
    expect(current.disconnect).toHaveBeenCalledOnce();
    handle.ref(first);
    expect(TestObserver.instances).toHaveLength(2);
    expect(handle.supported.value).toBe(false);
  });

  it('degrades deterministically when an observer is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const handle = createIntersectionObserver();

    expect(() => handle.ref(document.createElement('div'))).not.toThrow();
    expect(handle.supported.value).toBe(false);
    expect(handle.entries.value).toEqual([]);
  });

  it('keeps documents and handles isolated', () => {
    TestObserver.instances = [];
    vi.stubGlobal('ResizeObserver', TestObserver);
    const first = createResizeObserver();
    const second = createResizeObserver();
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');

    first.ref(firstTarget);
    second.ref(secondTarget);
    TestObserver.instances[0]!.callback([{ target: firstTarget }]);

    expect(first.entries.value).toHaveLength(1);
    expect(second.entries.value).toEqual([]);
    first.stop();
    expect(TestObserver.instances[1]!.disconnect).not.toHaveBeenCalled();
  });

  it('surfaces constructor failures without retaining a target', () => {
    class FailingObserver {
      constructor() { throw new Error('observer construction failed'); }
    }
    vi.stubGlobal('MutationObserver', FailingObserver);
    const handle = createMutationObserver({ childList: true });

    expect(() => handle.ref(document.createElement('div'))).toThrow('observer construction failed');
    expect(handle.entries.value).toEqual([]);
    expect(() => handle.stop()).not.toThrow();
  });
});
