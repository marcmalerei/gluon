import { reactive, toRaw } from './reactive.js';
import { track, trigger } from './effect.js';
import { refTargets } from './shared.js';

export interface Ref<T = unknown> {
  value: T;
}

export function markRef(value: object): void {
  refTargets.add(value);
}

class RefValue<T> implements Ref<T> {
  private storedValue: T;
  private readonly shallow: boolean;

  constructor(value: T, shallow: boolean) {
    markRef(this);
    this.shallow = shallow;
    this.storedValue = this.convert(value);
  }

  get value(): T {
    track(this, 'get', 'value');
    return this.storedValue;
  }

  set value(value: T) {
    const rawValue = this.shallow ? value : unwrapReactiveValue(value);
    const oldValue = this.shallow
      ? this.storedValue
      : unwrapReactiveValue(this.storedValue);
    if (Object.is(rawValue, oldValue)) return;

    const previous = this.storedValue;
    this.storedValue = this.convert(value);
    trigger(this, 'set', 'value', this.storedValue, previous);
  }

  private convert(value: T): T {
    return this.shallow || !isObject(value) ? value : reactive(value) as T;
  }
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function unwrapReactiveValue<T>(value: T): T {
  return isObject(value) ? toRaw(value) : value;
}

export function ref<T>(value: T): Ref<T> {
  return isRef<T>(value) ? value : new RefValue(value, false);
}

export function shallowRef<T>(value: T): Ref<T> {
  return isRef<T>(value) ? value : new RefValue(value, true);
}

export function isRef<T = unknown>(value: unknown): value is Ref<T> {
  return typeof value === 'object' && value !== null && refTargets.has(toRaw(value));
}

export function unref<T>(value: T | Ref<T>): T {
  return isRef<T>(value) ? value.value : value;
}
