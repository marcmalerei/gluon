import { createReactiveEffect, track, trigger } from './effect.js';
import { markRef, type Ref } from './ref.js';

export interface ComputedRef<T> extends Readonly<Ref<T>> {
  readonly value: T;
}

export interface WritableComputedRef<T> extends Ref<T> {}

export interface WritableComputedOptions<T> {
  readonly get: () => T;
  readonly set: (value: T) => void;
}

class ComputedValue<T> implements Ref<T> {
  private readonly runner;
  private dirty = true;
  private cachedValue!: T;

  constructor(
    getter: () => T,
    private readonly setter: ((value: T) => void) | undefined,
  ) {
    markRef(this);
    this.runner = createReactiveEffect(getter, () => {
      if (this.dirty) return;
      this.dirty = true;
      trigger(this, 'set', 'value');
    });
  }

  get value(): T {
    track(this, 'get', 'value');
    if (this.dirty) {
      this.cachedValue = this.runner();
      this.dirty = false;
    }
    return this.cachedValue;
  }

  set value(value: T) {
    if (!this.setter) return;
    this.setter(value);
  }
}

export function computed<T>(getter: () => T): ComputedRef<T>;
export function computed<T>(options: WritableComputedOptions<T>): WritableComputedRef<T>;
export function computed<T>(
  source: (() => T) | WritableComputedOptions<T>,
): ComputedRef<T> | WritableComputedRef<T> {
  const getter = typeof source === 'function' ? source : source.get;
  const setter = typeof source === 'function' ? undefined : source.set;
  return new ComputedValue(getter, setter);
}
