import { describe, expect, it, vi } from 'vitest';
import { effect, stop } from '@gluonjs/reactivity';
import { Signal, fromStandardSignal } from '@gluonjs/reactivity/signals';

async function flush(): Promise<void> {
  await Promise.resolve();
}

describe('standard Signal interop', () => {
  it('bridges state writes and computed updates without polling', async () => {
    const quantity = new Signal.State(2);
    const total = new Signal.Computed(() => quantity.get() * 25);
    const quantityBridge = fromStandardSignal(quantity, { connect: true });
    const totalBridge = fromStandardSignal(total, { connect: true });
    const seen: number[] = [];
    const runner = effect(() => seen.push(totalBridge.value));

    quantityBridge.value = 3;
    await flush();

    expect(quantity.get()).toBe(3);
    expect(totalBridge.value).toBe(75);
    expect(seen).toEqual([50, 75]);
    stop(runner);
    quantityBridge.disconnect();
    totalBridge.disconnect();
  });

  it('coalesces scheduled publications and reconnects exactly once', () => {
    const jobs: Array<() => void> = [];
    const source = new Signal.State(1);
    const bridge = fromStandardSignal(source, { schedule: (job) => jobs.push(job) });
    const seen: number[] = [];
    const runner = effect(() => seen.push(bridge.value));

    bridge.connect();
    bridge.connect();
    source.set(2);
    source.set(3);
    expect(jobs).toHaveLength(1);
    jobs.shift()?.();
    expect(seen).toEqual([1, 3]);

    bridge.disconnect();
    source.set(4);
    expect(jobs).toHaveLength(0);
    bridge.connect();
    source.set(5);
    jobs.shift()?.();
    expect(seen).toEqual([1, 3, 5]);
    bridge[Symbol.dispose]();
    stop(runner);
  });

  it('propagates computed read errors and leaves SSR reads disconnected', () => {
    const error = new Error('inventory failed');
    const broken = new Signal.Computed(() => { throw error; });
    const bridge = fromStandardSignal(broken);
    expect(bridge.connected).toBe(false);
    expect(() => bridge.value).toThrow(error);
    expect(bridge.connected).toBe(false);
  });

  it('rejects implementation mixing and accepts an explicit foreign realm', () => {
    class ForeignState<T> {
      listeners = new Set<() => void>();
      constructor(private current: T) {}
      get(): T { return this.current; }
      set(value: T): void {
        this.current = value;
        for (const listener of this.listeners) listener();
      }
    }
    class ForeignWatcher {
      private watched: ForeignState<unknown> | undefined;
      constructor(private readonly notify: () => void) {}
      watch(...sources: ForeignState<unknown>[]): void {
        if (sources.length === 0) return;
        this.unwatch(this.watched as ForeignState<unknown>);
        this.watched = sources[0];
        this.watched?.listeners.add(this.notify);
      }
      unwatch(...sources: ForeignState<unknown>[]): void {
        for (const source of sources) source?.listeners.delete(this.notify);
        this.watched = undefined;
      }
    }
    const implementation = {
      isState: (value: unknown) => value instanceof ForeignState,
      isComputed: () => false,
      subtle: { Watcher: ForeignWatcher },
    };
    const source = new ForeignState(1);

    expect(() => fromStandardSignal(source)).toThrow('configured standard Signal implementation');
    const bridge = fromStandardSignal(source, { implementation, connect: true });
    const schedule = vi.fn(() => bridge.value);
    const runner = effect(schedule);
    source.set(2);
    expect(schedule).toHaveBeenCalledTimes(1);
    bridge.disconnect();
    stop(runner);
  });
});
