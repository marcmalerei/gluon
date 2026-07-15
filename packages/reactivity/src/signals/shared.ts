import { shallowRef, type Ref } from '../ref.js';

export interface SignalBridge<T> {
  readonly value: T;
  readonly connected: boolean;
  connect(): void;
  disconnect(): void;
  [Symbol.dispose](): void;
}

export interface WritableSignalBridge<T> extends SignalBridge<T> { value: T }
export interface BridgeOptions {
  readonly connect?: boolean;
  readonly schedule?: (job: () => void) => void;
}

interface BridgeHooks<T> {
  readonly read: () => T;
  readonly write?: (value: T) => void;
  readonly subscribe: (notify: () => void) => () => void;
  readonly beforePublish?: () => void;
}

function enqueue(job: () => void): void {
  void new Promise<void>((resolve) => resolve()).then(job);
}

export function createSignalBridge<T>(
  hooks: BridgeHooks<T>,
  options: BridgeOptions,
): SignalBridge<T> | WritableSignalBridge<T> {
  const revision: Ref<number> = shallowRef(0);
  let unsubscribe: (() => void) | undefined;
  let queued = false;
  const notify = (): void => {
    if (!unsubscribe || queued) return;
    queued = true;
    const publish = (): void => {
      queued = false;
      if (!unsubscribe) return;
      hooks.beforePublish?.();
      revision.value += 1;
    };
    if (options.schedule) options.schedule(publish);
    else enqueue(publish);
  };
  const connect = (): void => {
    if (!unsubscribe) unsubscribe = hooks.subscribe(notify);
  };
  const disconnect = (): void => {
    if (!unsubscribe) return;
    const release = unsubscribe;
    unsubscribe = undefined;
    queued = false;
    release();
  };
  const bridge = {
    get value(): T { void revision.value; return hooks.read(); },
    get connected(): boolean { return unsubscribe !== undefined; },
    connect,
    disconnect,
    [Symbol.dispose]: disconnect,
  } as SignalBridge<T> & { value: T };
  if (hooks.write) {
    Object.defineProperty(bridge, 'value', {
      enumerable: true,
      get() { void revision.value; return hooks.read(); },
      set(value: T) { hooks.write?.(value); },
    });
  }
  if (options.connect) connect();
  return bridge;
}
