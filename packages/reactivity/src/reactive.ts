import {
  ARRAY_ITERATE_KEY,
  COLLECTION_SIZE_KEY,
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
  isArrayIndex,
  track,
  trigger,
} from './effect.js';
import { refTargets } from './shared.js';

const ReactiveFlag = {
  IsReactive: Symbol('gluon reactive'),
  IsReadonly: Symbol('gluon readonly'),
  IsShallow: Symbol('gluon shallow'),
  Raw: Symbol('gluon raw'),
} as const;

type Collection = Map<unknown, unknown> | Set<unknown>;
type ProxyMode = 'reactive' | 'shallowReactive' | 'readonly' | 'shallowReadonly';

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Value)[]
    ? ReadonlyArray<DeepReadonly<Value>>
  : T extends Map<infer Key, infer Value>
    ? ReadonlyMap<DeepReadonly<Key>, DeepReadonly<Value>>
    : T extends Set<infer Value>
      ? ReadonlySet<DeepReadonly<Value>>
      : T extends object
        ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
        : T;

const proxyCaches: Record<ProxyMode, WeakMap<object, object>> = {
  reactive: new WeakMap(),
  shallowReactive: new WeakMap(),
  readonly: new WeakMap(),
  shallowReadonly: new WeakMap(),
};

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function canObserve(value: object): boolean {
  if (refTargets.has(value)) return false;
  return Array.isArray(value)
    || value instanceof Map
    || value instanceof Set
    || Object.prototype.toString.call(value) === '[object Object]';
}

function resolveCollectionKey(
  target: Collection,
  key: unknown,
): { readonly rawKey: unknown; readonly targetKey: unknown } {
  const rawKey = toRaw(key);
  const targetKey = target.has(rawKey)
    ? rawKey
    : target.has(key)
      ? key
      : rawKey;
  return { rawKey, targetKey };
}

function hasOwn(target: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function wrapValue(value: unknown, readonlyMode: boolean, shallow: boolean): unknown {
  if (shallow || !isObject(value)) return value;
  return readonlyMode ? readonly(value) : reactive(value);
}

function createObjectHandlers(
  mode: ProxyMode,
  readonlyMode: boolean,
  shallow: boolean,
): ProxyHandler<object> {
  return {
    get(target, key, receiver) {
      if (key === ReactiveFlag.IsReactive) return !readonlyMode;
      if (key === ReactiveFlag.IsReadonly) return readonlyMode;
      if (key === ReactiveFlag.IsShallow) return shallow;
      if (key === ReactiveFlag.Raw) {
        return receiver === proxyCaches[mode].get(target) ? target : undefined;
      }

      const value = Reflect.get(target, key, receiver);
      if (!readonlyMode) track(target, 'get', key);
      return wrapValue(value, readonlyMode, shallow);
    },

    set(target, key, value, receiver) {
      if (readonlyMode) return true;

      const oldValue = Reflect.get(target, key, receiver);
      const oldLength = Array.isArray(target) ? target.length : undefined;
      const existed = Array.isArray(target) && isArrayIndex(key)
        ? Number(key) < (oldLength ?? 0)
        : hasOwn(target, key);
      const rawValue = toRaw(value);
      const result = Reflect.set(target, key, rawValue, receiver);

      if (target !== toRaw(receiver)) return result;
      if (!existed) trigger(target, 'add', key, rawValue);
      else if (!Object.is(rawValue, toRaw(oldValue))) {
        trigger(target, 'set', key, rawValue, oldValue);
      }
      return result;
    },

    deleteProperty(target, key) {
      if (readonlyMode) return true;
      const existed = hasOwn(target, key);
      const oldValue = Reflect.get(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && existed) trigger(target, 'delete', key, undefined, oldValue);
      return result;
    },

    has(target, key) {
      const result = Reflect.has(target, key);
      if (!readonlyMode) track(target, 'has', key);
      return result;
    },

    ownKeys(target) {
      if (!readonlyMode) {
        track(target, 'iterate', Array.isArray(target) ? ARRAY_ITERATE_KEY : ITERATE_KEY);
      }
      return Reflect.ownKeys(target);
    },
  };
}

function createIterable(
  target: Collection,
  method: PropertyKey,
  readonlyMode: boolean,
  shallow: boolean,
): IterableIterator<unknown> {
  const map = target instanceof Map;
  const pair = method === 'entries' || (method === Symbol.iterator && map);
  const keyOnly = method === 'keys' && map;
  if (!readonlyMode) track(target, 'iterate', keyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);

  const iterator = Reflect.apply(
    Reflect.get(target, method) as (...args: never[]) => Iterator<unknown>,
    target,
    [],
  );

  return {
    next() {
      const result = iterator.next();
      if (result.done) return result;
      if (pair) {
        const [key, value] = result.value as [unknown, unknown];
        return {
          done: false,
          value: [
            wrapValue(key, readonlyMode, shallow),
            wrapValue(value, readonlyMode, shallow),
          ],
        };
      }
      return {
        done: false,
        value: wrapValue(result.value, readonlyMode, shallow),
      };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

function createCollectionHandlers(
  mode: ProxyMode,
  readonlyMode: boolean,
  shallow: boolean,
): ProxyHandler<Collection> {
  return {
    get(target, key, receiver) {
      if (key === ReactiveFlag.IsReactive) return !readonlyMode;
      if (key === ReactiveFlag.IsReadonly) return readonlyMode;
      if (key === ReactiveFlag.IsShallow) return shallow;
      if (key === ReactiveFlag.Raw) {
        return receiver === proxyCaches[mode].get(target) ? target : undefined;
      }

      if (key === 'size') {
        if (!readonlyMode) track(target, 'iterate', COLLECTION_SIZE_KEY);
        return Reflect.get(target, 'size', target);
      }

      if (key === 'get' && target instanceof Map) {
        return (lookupKey: unknown) => {
          const { targetKey } = resolveCollectionKey(target, lookupKey);
          if (!readonlyMode) track(target, 'get', targetKey);
          return wrapValue(target.get(targetKey), readonlyMode, shallow);
        };
      }

      if (key === 'has') {
        return (lookupKey: unknown) => {
          const { targetKey } = resolveCollectionKey(target, lookupKey);
          if (!readonlyMode) track(target, 'has', targetKey);
          return target.has(targetKey);
        };
      }

      if (key === 'set' && target instanceof Map) {
        return (mapKey: unknown, value: unknown) => {
          if (readonlyMode) return receiver;
          const { rawKey, targetKey } = resolveCollectionKey(target, mapKey);
          const rawValue = toRaw(value);
          const existed = target.has(targetKey);
          const oldValue = target.get(targetKey);
          const storedKey = existed ? targetKey : rawKey;
          target.set(storedKey, rawValue);
          if (!existed) trigger(target, 'add', storedKey, rawValue);
          else if (!Object.is(rawValue, oldValue)) {
            trigger(target, 'set', storedKey, rawValue, oldValue);
          }
          return receiver;
        };
      }

      if (key === 'add' && target instanceof Set) {
        return (value: unknown) => {
          if (readonlyMode) return receiver;
          const { rawKey, targetKey } = resolveCollectionKey(target, value);
          const existed = target.has(targetKey);
          const storedValue = existed ? targetKey : rawKey;
          target.add(storedValue);
          if (!existed) trigger(target, 'add', storedValue, storedValue);
          return receiver;
        };
      }

      if (key === 'delete') {
        return (lookupKey: unknown) => {
          if (readonlyMode) return false;
          const { targetKey } = resolveCollectionKey(target, lookupKey);
          const existed = target.has(targetKey);
          const oldValue = target instanceof Map ? target.get(targetKey) : targetKey;
          const result = target.delete(targetKey);
          if (result && existed) {
            trigger(target, 'delete', targetKey, undefined, oldValue);
          }
          return result;
        };
      }

      if (key === 'clear') {
        return () => {
          if (readonlyMode) return undefined;
          const hadItems = target.size > 0;
          const result = target.clear();
          if (hadItems) trigger(target, 'clear');
          return result;
        };
      }

      if (key === 'forEach') {
        return (callback: (value: unknown, key: unknown, collection: unknown) => void, thisArg?: unknown) => {
          if (!readonlyMode) track(target, 'iterate', ITERATE_KEY);
          target.forEach((value, entryKey) => {
            callback.call(
              thisArg,
              wrapValue(value, readonlyMode, shallow),
              wrapValue(entryKey, readonlyMode, shallow),
              receiver,
            );
          });
        };
      }

      if (
        key === Symbol.iterator
        || key === 'entries'
        || key === 'keys'
        || key === 'values'
      ) {
        return () => createIterable(target, key, readonlyMode, shallow);
      }

      return Reflect.get(target, key, target);
    },
  };
}

function createProxy<T extends object>(target: T, mode: ProxyMode): T {
  if (isReadonly(target) && (mode === 'reactive' || mode === 'shallowReactive')) {
    return target;
  }

  const readonlyMode = mode === 'readonly' || mode === 'shallowReadonly';
  const shallow = mode === 'shallowReactive' || mode === 'shallowReadonly';
  if (
    isProxy(target)
    && isReadonly(target) === readonlyMode
    && Boolean(Reflect.get(target, ReactiveFlag.IsShallow)) === shallow
  ) {
    return target;
  }

  const rawTarget = toRaw(target);
  if (!canObserve(rawTarget)) return target;

  const cached = proxyCaches[mode].get(rawTarget);
  if (cached) return cached as T;

  const handlers = rawTarget instanceof Map || rawTarget instanceof Set
    ? createCollectionHandlers(mode, readonlyMode, shallow)
    : createObjectHandlers(mode, readonlyMode, shallow);
  const proxy = new Proxy(rawTarget as Collection & object, handlers as ProxyHandler<Collection & object>);
  proxyCaches[mode].set(rawTarget, proxy);
  return proxy as T;
}

export function reactive<T extends object>(target: T): T {
  return createProxy(target, 'reactive');
}

export function shallowReactive<T extends object>(target: T): T {
  return createProxy(target, 'shallowReactive');
}

export function readonly<T extends object>(target: T): DeepReadonly<T> {
  return createProxy(target, 'readonly') as DeepReadonly<T>;
}

export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createProxy(target, 'shallowReadonly') as Readonly<T>;
}

export function isReactive(value: unknown): boolean {
  return Boolean(isObject(value) && Reflect.get(value, ReactiveFlag.IsReactive));
}

export function isReadonly(value: unknown): boolean {
  return Boolean(isObject(value) && Reflect.get(value, ReactiveFlag.IsReadonly));
}

export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value);
}

export function toRaw<T>(value: T): T {
  if (!isObject(value)) return value;
  const raw = Reflect.get(value, ReactiveFlag.Raw) as T | undefined;
  return raw === undefined ? value : toRaw(raw);
}
