import type { ReadonlySignal, Signal } from '@preact/signals-core';
import { createSignalBridge, type BridgeOptions, type SignalBridge, type WritableSignalBridge } from './signals/shared.js';

export type { BridgeOptions, SignalBridge, WritableSignalBridge } from './signals/shared.js';
export function fromPreactSignal<T>(source: Signal<T>, options?: BridgeOptions): WritableSignalBridge<T>;
export function fromPreactSignal<T>(source: ReadonlySignal<T>, options?: BridgeOptions): SignalBridge<T>;
export function fromPreactSignal<T>(source: ReadonlySignal<T>, options: BridgeOptions = {}): SignalBridge<T> {
  if (!source || typeof source.peek !== 'function' || typeof source.subscribe !== 'function') {
    throw new TypeError('Expected a @preact/signals-core signal.');
  }
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(source), 'value');
  return createSignalBridge({
    read: () => source.peek(),
    write: descriptor?.set ? (value) => { (source as Signal<T>).value = value; } : undefined,
    subscribe: (notify) => {
      let starting = true;
      const unsubscribe = source.subscribe(() => { if (!starting) notify(); });
      starting = false;
      return unsubscribe;
    },
  }, options);
}
