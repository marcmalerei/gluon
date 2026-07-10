import {
  createReactiveEffect,
  stop,
  type ReactiveEffectRunner,
} from './effect.js';
import {
  containReactivityError,
  reportReactivityError,
  type ReactivityErrorHandler,
} from './error.js';
import { isRef, type Ref } from './ref.js';
import {
  invalidateJob,
  scheduleEffect,
  type EffectFlush,
} from './scheduler.js';
import { getCurrentScope, recordScopeCleanup } from './scope.js';

export type WatchCleanup = () => void | PromiseLike<void>;
export type WatchCleanupRegistrar = (cleanup: WatchCleanup) => void;
export type WatchStopHandle = () => void;

export interface WatchOptions {
  readonly flush?: EffectFlush;
  readonly id?: number;
  readonly immediate?: boolean;
  readonly deep?: boolean;
  readonly onError?: ReactivityErrorHandler;
}

export type WatchSource<T> = Ref<T> | (() => T);
export type WatchCallback<T> = (
  value: T,
  oldValue: T | undefined,
  onCleanup: WatchCleanupRegistrar,
) => void | PromiseLike<void>;
export type WatchEffectCallback = (
  onCleanup: WatchCleanupRegistrar,
) => void | PromiseLike<void>;

function runCleanups(
  cleanups: WatchCleanup[],
  source: unknown,
  onError?: ReactivityErrorHandler,
): void {
  for (let index = cleanups.length - 1; index >= 0; index -= 1) {
    try {
      containReactivityError(
        cleanups[index]?.(),
        'cleanup',
        source,
        onError,
      );
    } catch (error) {
      reportReactivityError(error, 'cleanup', source, onError);
    }
  }
  cleanups.length = 0;
}

function traverse(value: unknown, seen = new WeakSet<object>()): void {
  if (typeof value !== 'object' || value === null || seen.has(value)) return;
  seen.add(value);

  if (value instanceof Map) {
    for (const [key, entryValue] of value) {
      traverse(key, seen);
      traverse(entryValue, seen);
    }
    return;
  }
  if (value instanceof Set) {
    for (const entryValue of value) traverse(entryValue, seen);
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    traverse(Reflect.get(value, key), seen);
  }
}

export function watchEffect(
  callback: WatchEffectCallback,
  options: WatchOptions = {},
): WatchStopHandle {
  const cleanups: WatchCleanup[] = [];
  const onError = options.onError ?? getCurrentScope()?.onError;
  const onCleanup: WatchCleanupRegistrar = (cleanup) => cleanups.push(cleanup);
  let stopped = false;
  let removeScopeCleanup: (() => void) | undefined;
  let runner!: ReactiveEffectRunner<void>;
  const wrapped = () => {
    runCleanups(cleanups, callback, onError);
    return callback(onCleanup);
  };
  const scheduler = () => {
    scheduleEffect(
      runner,
      options.flush ?? 'pre',
      options.id,
      onError,
    );
  };
  runner = createReactiveEffect(wrapped, scheduler, { ...options, onError });

  const stopHandle = () => {
    if (stopped) return;
    stopped = true;
    removeScopeCleanup?.();
    removeScopeCleanup = undefined;
    invalidateJob(runner);
    stop(runner);
    runCleanups(cleanups, callback, onError);
  };
  removeScopeCleanup = recordScopeCleanup(stopHandle);
  runner();
  return stopHandle;
}

export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options: WatchOptions = {},
): WatchStopHandle {
  const cleanups: WatchCleanup[] = [];
  const onError = options.onError ?? getCurrentScope()?.onError;
  const onCleanup: WatchCleanupRegistrar = (cleanup) => cleanups.push(cleanup);
  const read = isRef<T>(source) ? () => source.value : source;
  const getter = () => {
    const value = read();
    if (options.deep) traverse(value);
    return value;
  };
  let stopped = false;
  let removeScopeCleanup: (() => void) | undefined;
  let initialized = false;
  let oldValue: T | undefined;
  let runner!: ReactiveEffectRunner<T>;

  const job = () => {
    if (stopped) return;
    const value = runner();
    if (!initialized || options.deep || !Object.is(value, oldValue)) {
      runCleanups(cleanups, callback, onError);
      try {
        const result = containReactivityError(
          callback(value, oldValue, onCleanup),
          'effect',
          callback,
          onError,
        );
        oldValue = value;
        initialized = true;
        return result;
      } catch (error) {
        reportReactivityError(error, 'effect', callback, onError);
      }
      oldValue = value;
      initialized = true;
    }
  };
  const scheduler = () => {
    scheduleEffect(
      job,
      options.flush ?? 'pre',
      options.id,
      onError,
    );
  };
  runner = createReactiveEffect(getter, scheduler, { ...options, onError });

  const stopHandle = () => {
    if (stopped) return;
    stopped = true;
    removeScopeCleanup?.();
    removeScopeCleanup = undefined;
    invalidateJob(job);
    stop(runner);
    runCleanups(cleanups, callback, onError);
  };
  removeScopeCleanup = recordScopeCleanup(stopHandle);

  if (options.immediate) job();
  else {
    oldValue = runner();
    initialized = true;
  }
  return stopHandle;
}
