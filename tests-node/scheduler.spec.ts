import { describe, expect, it, vi } from 'vitest';
import {
  batch,
  computed,
  effect,
  effectScope,
  getCurrentScope,
  invalidateJob,
  nextTick,
  onScopeDispose,
  queueJob,
  queuePostFlushCallback,
  queuePreFlushCallback,
  reactive,
  ref,
  setReactivityErrorHandler,
  stop,
  untracked,
  watch,
  watchEffect,
  type ReactivityErrorContext,
} from '../packages/reactivity/src/index.js';

describe('reactivity scheduler', () => {
  it('deduplicates scheduled effects across synchronous writes', async () => {
    const state = reactive({ count: 0 });
    const values: number[] = [];
    effect(() => values.push(state.count), { flush: 'pre' });

    state.count = 1;
    state.count = 2;
    state.count = 3;
    expect(values).toEqual([0]);

    await nextTick();
    expect(values).toEqual([0, 3]);
  });

  it('supports lazy update-phase effects with an eager scheduling hook', async () => {
    const state = reactive({ count: 0 });
    const values: number[] = [];
    const scheduled = vi.fn();
    const runner = effect(() => values.push(state.count), {
      flush: 'update',
      lazy: true,
      onSchedule: scheduled,
    });

    expect(values).toEqual([]);
    runner();
    expect(values).toEqual([0]);

    state.count = 1;
    state.count = 2;
    expect(scheduled).toHaveBeenCalledTimes(2);
    expect(values).toEqual([0]);

    await nextTick();
    expect(values).toEqual([0, 2]);
  });

  it('orders phases and parent ids deterministically while deduplicating jobs', async () => {
    const order: string[] = [];
    const preParent = () => order.push('pre-parent');
    const preChild = () => order.push('pre-child');
    const updateParent = () => order.push('update-parent');
    const updateChild = () => order.push('update-child');

    queuePostFlushCallback(() => order.push('post'));
    queueJob(updateChild, { id: 20 });
    queuePreFlushCallback(preChild, { id: 20 });
    queueJob(updateParent, { id: 10 });
    queuePreFlushCallback(preParent, { id: 10 });
    queuePreFlushCallback(preParent, { id: 10 });

    await nextTick();
    expect(order).toEqual([
      'pre-parent',
      'pre-child',
      'update-parent',
      'update-child',
      'post',
    ]);
  });

  it('runs work queued for a completed phase in the next deterministic cycle', async () => {
    const order: string[] = [];
    queuePreFlushCallback(() => order.push('pre'));
    queueJob(() => {
      order.push('update');
      queuePreFlushCallback(() => order.push('late-pre'));
    });
    queuePostFlushCallback(() => order.push('post'));

    await nextTick();
    expect(order).toEqual(['pre', 'update', 'post', 'late-pre']);
  });

  it('runs synchronous jobs without inserting a microtask between them', async () => {
    const order: string[] = [];
    queueJob(() => {
      order.push('first');
      queueMicrotask(() => order.push('microtask'));
    }, { id: 1 });
    queueJob(() => order.push('second'), { id: 2 });

    await nextTick(() => order.push('tick'));
    expect(order).toEqual(['first', 'second', 'microtask', 'tick']);
  });

  it('resolves nextTick after post-flush work and immediately without pending work', async () => {
    const order: string[] = [];
    queuePostFlushCallback(() => order.push('post'));
    await nextTick(() => order.push('tick'));
    expect(order).toEqual(['post', 'tick']);

    await expect(nextTick(() => 42)).resolves.toBe(42);
  });

  it('invalidates queued generic jobs before they flush', async () => {
    const job = vi.fn();
    queueJob(job);
    invalidateJob(job);
    await nextTick();
    expect(job).not.toHaveBeenCalled();
  });

  it('invalidates a later job from the active queue snapshot', async () => {
    const later = vi.fn();
    queueJob(() => invalidateJob(later), { id: 1 });
    queueJob(later, { id: 2 });
    await nextTick();
    expect(later).not.toHaveBeenCalled();
  });

  it('batches synchronous effects once and preserves deterministic ids', () => {
    const state = reactive({ count: 0 });
    const order: string[] = [];
    effect(() => {
      state.count;
      order.push('child');
    }, { id: 20 });
    effect(() => {
      state.count;
      order.push('parent');
    }, { id: 10 });
    order.length = 0;

    const result = batch(() => {
      state.count = 1;
      batch(() => { state.count = 2; });
      state.count = 3;
      expect(order).toEqual([]);
      return 'complete';
    });

    expect(result).toBe('complete');
    expect(order).toEqual(['parent', 'child']);
  });

  it('flushes a batch in finally while preserving callback errors', () => {
    const state = reactive({ count: 0 });
    const callback = vi.fn(() => state.count);
    effect(callback);

    expect(() => batch(() => {
      state.count = 1;
      throw new Error('batch failed');
    })).toThrow('batch failed');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does not double-run a still-pending batch effect invalidated by an earlier effect', () => {
    const state = reactive({ first: 0, second: 0 });
    const first = vi.fn(() => {
      if (state.first === 1) state.second = 1;
    });
    const second = vi.fn(() => state.second);
    effect(first, { id: 1 });
    effect(second, { id: 2 });

    batch(() => {
      state.first = 1;
      state.second = 2;
    });

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
    expect(state.second).toBe(1);
  });

  it('untracked reads do not subscribe the active effect', () => {
    const state = reactive({ tracked: 1, ignored: 1 });
    const callback = vi.fn(() => {
      state.tracked;
      return untracked(() => state.ignored);
    });
    effect(callback);

    state.ignored = 2;
    expect(callback).toHaveBeenCalledOnce();
    state.tracked = 2;
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('orders scheduled effects by parent id', async () => {
    const state = reactive({ count: 0 });
    const order: string[] = [];
    effect(() => {
      state.count;
      order.push('child');
    }, { flush: 'pre', id: 20 });
    effect(() => {
      state.count;
      order.push('parent');
    }, { flush: 'pre', id: 10 });
    order.length = 0;

    state.count = 1;
    await nextTick();
    expect(order).toEqual(['parent', 'child']);
  });

  it('limits recursively queued jobs and reports through the error channel', async () => {
    const errors: ReactivityErrorContext[] = [];
    const restore = setReactivityErrorHandler((context) => errors.push(context));
    let calls = 0;
    const job = () => {
      calls += 1;
      queueJob(job);
    };

    try {
      queueJob(job);
      await nextTick();
      expect(calls).toBe(100);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ phase: 'scheduler', source: job });
      expect(errors[0]?.error).toBeInstanceOf(Error);
    } finally {
      restore();
    }
  });

  it('awaits asynchronous jobs and routes their rejection before nextTick resolves', async () => {
    const errors: ReactivityErrorContext[] = [];
    const order: string[] = [];
    const restore = setReactivityErrorHandler((context) => errors.push(context));
    try {
      queueJob(async () => {
        order.push('start');
        await Promise.resolve();
        order.push('end');
        throw new Error('async job failed');
      }, { id: 1 });
      queueJob(() => order.push('later'), { id: 2 });
      await nextTick(() => order.push('tick'));
      expect(order).toEqual(['start', 'end', 'later', 'tick']);
      expect(errors).toEqual([
        expect.objectContaining({ phase: 'scheduler' }),
      ]);
    } finally {
      restore();
    }
  });
});

describe('effect scopes and error routing', () => {
  it('cancels queued effects and manual runners when a scope stops', async () => {
    const state = reactive({ count: 0 });
    const scope = effectScope();
    const callback = vi.fn(() => state.count);
    const runner = scope.run(() => effect(callback, { flush: 'pre' }));

    state.count = 1;
    scope.stop();
    await nextTick();
    expect(callback).toHaveBeenCalledOnce();
    expect(runner?.()).toBe(0);
    expect(callback).toHaveBeenCalledOnce();

    state.count = 2;
    await nextTick();
    expect(callback).toHaveBeenCalledOnce();
    expect(scope.active).toBe(false);
    expect(scope.run(() => 'never')).toBeUndefined();
  });

  it('stops effects, child scopes, and cleanups in documented reverse order', () => {
    const order: string[] = [];
    const parent = effectScope();
    parent.run(() => {
      effect(() => undefined, { onStop: () => order.push('parent-effect-1') });
      effect(() => undefined, { onStop: () => order.push('parent-effect-2') });
      const child = effectScope();
      child.run(() => {
        effect(() => undefined, { onStop: () => order.push('child-effect') });
        onScopeDispose(() => order.push('child-cleanup'));
      });
      onScopeDispose(() => order.push('parent-cleanup-1'));
      onScopeDispose(() => order.push('parent-cleanup-2'));
    });

    parent.stop();
    parent.stop();
    expect(order).toEqual([
      'parent-effect-2',
      'parent-effect-1',
      'child-effect',
      'child-cleanup',
      'parent-cleanup-2',
      'parent-cleanup-1',
    ]);
  });

  it('continues stopping a scope when one effect stop hook throws', () => {
    const order: string[] = [];
    const errors: ReactivityErrorContext[] = [];
    const scope = effectScope({ onError: (context) => { errors.push(context); } });

    scope.run(() => {
      effect(() => undefined, { onStop: () => { order.push('first'); } });
      effect(() => undefined, {
        onStop: () => {
          order.push('failing');
          throw new Error('stop failed');
        },
      });
      effect(() => undefined, { onStop: () => { order.push('last'); } });
      onScopeDispose(() => { order.push('cleanup'); });
    });

    expect(() => scope.stop()).not.toThrow();
    expect(order).toEqual(['last', 'failing', 'first', 'cleanup']);
    expect(errors).toEqual([
      expect.objectContaining({ phase: 'cleanup' }),
    ]);
  });

  it('keeps detached scopes alive when their creating scope stops', () => {
    const state = ref(0);
    const parent = effectScope();
    let detached!: ReturnType<typeof effectScope>;
    const callback = vi.fn(() => state.value);
    parent.run(() => {
      detached = effectScope(true);
      detached.run(() => effect(callback));
    });

    parent.stop();
    state.value = 1;
    expect(callback).toHaveBeenCalledTimes(2);
    detached.stop();
    state.value = 2;
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('restores current scopes and rejects disposal registration outside a scope', () => {
    const outer = effectScope();
    const inner = effectScope(true);
    expect(getCurrentScope()).toBeUndefined();
    outer.run(() => {
      expect(getCurrentScope()).toBe(outer);
      inner.run(() => expect(getCurrentScope()).toBe(inner));
      expect(getCurrentScope()).toBe(outer);
    });
    expect(getCurrentScope()).toBeUndefined();
    expect(onScopeDispose(() => undefined)).toBe(false);
  });

  it('prevents new child scopes and resources after an active scope stops', () => {
    const parent = effectScope();
    const callback = vi.fn();
    let child!: ReturnType<typeof effectScope>;
    parent.run(() => {
      parent.stop();
      child = effectScope();
      effect(callback);
      expect(onScopeDispose(callback)).toBe(false);
    });

    expect(child.active).toBe(false);
    expect(callback).not.toHaveBeenCalled();
  });

  it('stops computed dependency effects owned by a scope', () => {
    const state = ref(1);
    const getter = vi.fn(() => state.value * 2);
    const scope = effectScope();
    const value = scope.run(() => computed(getter));
    expect(value?.value).toBe(2);

    scope.stop();
    state.value = 2;
    expect(value?.value).toBe(2);
    expect(getter).toHaveBeenCalledOnce();
  });

  it('routes effect, scheduler, and cleanup errors without rejected flushes', async () => {
    const errors: ReactivityErrorContext[] = [];
    const unhandled: unknown[] = [];
    const listener = (error: unknown) => unhandled.push(error);
    process.on('unhandledRejection', listener);
    const restore = setReactivityErrorHandler((context) => errors.push(context));
    const state = reactive({ fail: false });
    const scope = effectScope();

    try {
      scope.run(() => {
        effect(() => {
          if (state.fail) throw new Error('effect failed');
        }, { flush: 'pre' });
        onScopeDispose(() => { throw new Error('cleanup failed'); });
      });
      queueJob(() => { throw new Error('job failed'); });
      state.fail = true;

      await expect(nextTick()).resolves.toBeUndefined();
      scope.stop();
      await Promise.resolve();

      expect(errors.map(({ phase }) => phase)).toEqual([
        'effect',
        'scheduler',
        'cleanup',
      ]);
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', listener);
      restore();
    }
  });

  it('contains asynchronous effect failures inside the effect error channel', async () => {
    const state = reactive({ fail: false });
    const errors: ReactivityErrorContext[] = [];
    effect(async () => {
      const fail = state.fail;
      await Promise.resolve();
      if (fail) throw new Error('async effect failed');
    }, { flush: 'pre', onError: (context) => errors.push(context) });
    await Promise.resolve();

    state.fail = true;
    await expect(nextTick()).resolves.toBeUndefined();
    expect(errors).toEqual([
      expect.objectContaining({ phase: 'effect' }),
    ]);
  });

  it('routes failures from manually invoked stopped runners', async () => {
    const errors: ReactivityErrorContext[] = [];
    let fail = false;
    const runner = effect(async () => {
      await Promise.resolve();
      if (fail) throw new Error('stopped runner failed');
    }, { onError: (context) => errors.push(context) });
    await Promise.resolve();
    stop(runner);
    fail = true;

    await expect(runner()).resolves.toBeUndefined();
    expect(errors).toEqual([
      expect.objectContaining({ phase: 'effect' }),
    ]);

    const syncErrors: ReactivityErrorContext[] = [];
    let syncFail = false;
    const syncRunner = effect(() => {
      if (syncFail) throw new Error('sync stopped runner failed');
      return 'ready';
    }, { onError: (context) => syncErrors.push(context) });
    stop(syncRunner);
    syncFail = true;
    expect(syncRunner()).toBe('ready');
    expect(syncErrors).toEqual([
      expect.objectContaining({ phase: 'effect' }),
    ]);
  });

  it('uses a scope-local error handler before the global channel', () => {
    const globalHandler = vi.fn();
    const localHandler = vi.fn();
    const restore = setReactivityErrorHandler(globalHandler);
    const scope = effectScope({ onError: localHandler });

    try {
      scope.run(() => effect(() => { throw new Error('local'); }));
      expect(localHandler).toHaveBeenCalledWith(expect.objectContaining({ phase: 'effect' }));
      expect(globalHandler).not.toHaveBeenCalled();
    } finally {
      scope.stop();
      restore();
    }
  });

  it('uses reportError as the default channel when the platform provides it', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    const reporter = vi.fn();
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: reporter,
    });
    const restore = setReactivityErrorHandler(undefined);
    try {
      effect(() => { throw new Error('reported'); });
      expect(reporter).toHaveBeenCalledWith(expect.objectContaining({ message: 'reported' }));
    } finally {
      restore();
      if (descriptor) Object.defineProperty(globalThis, 'reportError', descriptor);
      else Reflect.deleteProperty(globalThis, 'reportError');
    }
  });

  it('falls back to console and contains failures from error handlers', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    Reflect.deleteProperty(globalThis, 'reportError');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const restoreDefault = setReactivityErrorHandler(undefined);
    try {
      effect(() => { throw new Error('console fallback'); });
      expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'console fallback',
      }));

      const restoreThrowing = setReactivityErrorHandler(() => {
        throw new Error('handler failed');
      });
      effect(() => { throw new Error('source failed'); });
      expect(consoleError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'handler failed',
      }));
      restoreThrowing();
    } finally {
      restoreDefault();
      consoleError.mockRestore();
      if (descriptor) Object.defineProperty(globalThis, 'reportError', descriptor);
    }
  });

  it('contains failures thrown by the platform reportError function', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: () => { throw new Error('platform reporter failed'); },
    });
    const restore = setReactivityErrorHandler(undefined);
    try {
      expect(() => effect(() => { throw new Error('source'); })).not.toThrow();
    } finally {
      restore();
      if (descriptor) Object.defineProperty(globalThis, 'reportError', descriptor);
      else Reflect.deleteProperty(globalThis, 'reportError');
    }
  });

  it('contains asynchronous rejection from a configured error handler', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'reportError');
    const reporter = vi.fn();
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: reporter,
    });
    const restore = setReactivityErrorHandler(async () => {
      throw new Error('async handler failed');
    });
    try {
      effect(() => { throw new Error('source'); });
      await Promise.resolve();
      await Promise.resolve();
      expect(reporter).toHaveBeenCalledWith(expect.objectContaining({
        message: 'async handler failed',
      }));
    } finally {
      restore();
      if (descriptor) Object.defineProperty(globalThis, 'reportError', descriptor);
      else Reflect.deleteProperty(globalThis, 'reportError');
    }
  });
});

describe('scheduled watchers', () => {
  it('deduplicates watch callbacks and runs cleanup before the next value', async () => {
    const source = ref(0);
    const events: string[] = [];
    const stopWatch = watch(source, (value, oldValue, onCleanup) => {
      events.push(`${oldValue}->${value}`);
      onCleanup(() => events.push(`cleanup:${value}`));
    });

    source.value = 1;
    source.value = 2;
    await nextTick();
    expect(events).toEqual(['0->2']);

    source.value = 3;
    await nextTick();
    expect(events).toEqual(['0->2', 'cleanup:2', '2->3']);
    stopWatch();
    stopWatch();
    expect(events).toEqual(['0->2', 'cleanup:2', '2->3', 'cleanup:3']);
  });

  it('supports immediate and deep watch sources', async () => {
    const state = reactive({ nested: { count: 0 } });
    const immediate = vi.fn();
    const deep = vi.fn();
    const stopImmediate = watch(() => state.nested.count, immediate, { immediate: true });
    const stopDeep = watch(() => state, deep, { deep: true });

    expect(immediate).toHaveBeenCalledWith(0, undefined, expect.any(Function));
    state.nested.count = 1;
    await nextTick();
    expect(immediate).toHaveBeenLastCalledWith(1, 0, expect.any(Function));
    expect(deep).toHaveBeenCalledOnce();
    stopImmediate();
    stopDeep();
  });

  it('deeply traverses cyclic objects, Map values, and Set values', async () => {
    const nested = reactive({ count: 0 });
    const state = reactive({
      map: new Map([['nested', nested]]),
      set: new Set<object>([nested]),
      self: undefined as unknown,
    });
    state.self = state;
    const callback = vi.fn();
    const stopWatch = watch(() => state, callback, { deep: true });

    nested.count = 1;
    await nextTick();
    state.set.add({ added: true });
    await nextTick();
    expect(callback).toHaveBeenCalledTimes(2);
    stopWatch();
  });

  it('does not run a watch callback when its derived value is unchanged', async () => {
    const state = reactive({ count: 0 });
    const callback = vi.fn();
    const stopWatch = watch(() => state.count % 2, callback);

    state.count = 2;
    await nextTick();
    expect(callback).not.toHaveBeenCalled();
    stopWatch();
  });

  it('stops queued watch effects and their cleanup with the owning scope', async () => {
    const source = ref(0);
    const events: string[] = [];
    const scope = effectScope();
    scope.run(() => watchEffect((onCleanup) => {
      events.push(`run:${source.value}`);
      onCleanup(() => events.push('cleanup'));
    }, { flush: 'post' }));

    source.value = 1;
    scope.stop();
    await nextTick();
    source.value = 2;
    await nextTick();
    expect(events).toEqual(['run:0', 'cleanup']);
  });

  it('routes watcher callback and cleanup failures without rejecting nextTick', async () => {
    const errors: ReactivityErrorContext[] = [];
    const source = ref(0);
    const stopWatch = watch(source, (value, _oldValue, onCleanup) => {
      onCleanup(() => { throw new Error(`cleanup:${value}`); });
      if (value === 1) throw new Error('watch failed');
    }, { onError: (context) => errors.push(context) });

    source.value = 1;
    await expect(nextTick()).resolves.toBeUndefined();
    source.value = 2;
    await expect(nextTick()).resolves.toBeUndefined();
    stopWatch();

    expect(errors.map(({ phase }) => phase)).toEqual([
      'effect',
      'cleanup',
      'cleanup',
    ]);
  });

  it('awaits and contains asynchronous watcher callback failures', async () => {
    const errors: ReactivityErrorContext[] = [];
    const source = ref(0);
    const stopWatch = watch(source, async () => {
      await Promise.resolve();
      throw new Error('async watch failed');
    }, { onError: (context) => errors.push(context) });

    source.value = 1;
    await expect(nextTick()).resolves.toBeUndefined();
    expect(errors).toEqual([
      expect.objectContaining({ phase: 'effect' }),
    ]);
    stopWatch();
  });
});
