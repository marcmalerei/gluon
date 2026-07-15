import { Signal as PolyfillSignal } from 'signal-polyfill';
import { createSignalBridge, type BridgeOptions, type SignalBridge, type WritableSignalBridge } from './shared.js';

export type { BridgeOptions, SignalBridge, WritableSignalBridge } from './shared.js';
export interface StandardSignal<T> { get(): T }
export interface WritableStandardSignal<T> extends StandardSignal<T> { set(value: T): void }
export interface StandardSignalWatcher {
  watch(...signals: StandardSignal<unknown>[]): void;
  unwatch(...signals: StandardSignal<unknown>[]): void;
}
export interface StandardSignalImplementation {
  isState(value: unknown): boolean;
  isComputed(value: unknown): boolean;
  subtle: { Watcher: new (notify: () => void) => StandardSignalWatcher };
}
export interface StandardSignalBridgeOptions extends BridgeOptions {
  readonly implementation?: StandardSignalImplementation;
}

export function fromStandardSignal<T>(source: WritableStandardSignal<T>, options?: StandardSignalBridgeOptions): WritableSignalBridge<T>;
export function fromStandardSignal<T>(source: StandardSignal<T>, options?: StandardSignalBridgeOptions): SignalBridge<T>;
export function fromStandardSignal<T>(source: StandardSignal<T>, options: StandardSignalBridgeOptions = {}): SignalBridge<T> {
  const implementation = options.implementation ?? PolyfillSignal as StandardSignalImplementation;
  const state = implementation.isState(source);
  const computed = implementation.isComputed(source);
  if (!state && !computed) throw new TypeError('Signal does not belong to the configured standard Signal implementation.');
  let watcher: StandardSignalWatcher | undefined;
  return createSignalBridge({
    read: () => source.get(),
    write: state ? (value) => (source as WritableStandardSignal<T>).set(value) : undefined,
    subscribe: (notify) => {
      watcher = new implementation.subtle.Watcher(notify);
      watcher.watch(source as StandardSignal<unknown>);
      return () => { watcher?.unwatch(source as StandardSignal<unknown>); watcher = undefined; };
    },
    beforePublish: () => watcher?.watch(),
  }, options);
}

export { PolyfillSignal as Signal };
