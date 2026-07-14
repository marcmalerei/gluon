import { describe, expect, it, vi } from 'vitest';
import {
  computed,
  effect,
  isProxy,
  isReactive,
  isReadonly,
  isRef,
  reactive,
  readonly,
  ref,
  shallowReactive,
  shallowReadonly,
  shallowRef,
  stop,
  toRaw,
  unref,
} from '../packages/reactivity/src/index.js';

describe('@gluonjs/reactivity', () => {
  it('runs in Node without a DOM global', () => {
    expect('document' in globalThis).toBe(false);
  });

  it('tracks only effects subscribed to the changed property', () => {
    const state = reactive({ first: 1, second: 2 });
    const firstEffect = vi.fn(() => state.first);
    const secondEffect = vi.fn(() => state.second);

    effect(firstEffect);
    effect(secondEffect);
    state.first = 3;

    expect(firstEffect).toHaveBeenCalledTimes(2);
    expect(secondEffect).toHaveBeenCalledTimes(1);
  });

  it('deduplicates repeated reads and prevents active effects from recursing', () => {
    const state = reactive({ count: 0 });
    const repeated = vi.fn(() => state.count + state.count);
    effect(repeated);
    state.count = 1;
    expect(repeated).toHaveBeenCalledTimes(2);

    const selfUpdating = vi.fn(() => {
      if (state.count < 2) state.count += 1;
    });
    effect(selfUpdating);
    expect(state.count).toBe(2);
    expect(selfUpdating).toHaveBeenCalledOnce();
  });

  it('handles explicit nested calls to the same effect runner', () => {
    let recurse = false;
    let runner!: () => number;
    const callback = vi.fn(() => {
      if (recurse) {
        recurse = false;
        return runner();
      }
      return 1;
    });
    runner = effect(callback);
    recurse = true;
    expect(runner()).toBe(1);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('cleans stale conditional dependencies and supports manual runners', () => {
    const state = reactive({ enabled: true, primary: 1, fallback: 2 });
    let value = 0;
    const runner = effect(() => {
      value = state.enabled ? state.primary : state.fallback;
      return value;
    });

    state.enabled = false;
    expect(value).toBe(2);
    state.primary = 10;
    expect(value).toBe(2);
    state.fallback = 20;
    expect(value).toBe(20);
    expect(runner()).toBe(20);
  });

  it('restores the parent effect after nested runner execution', () => {
    const state = reactive({ outer: 1, inner: 2, after: 3 });
    const inner = effect(() => state.inner);
    const outer = vi.fn(() => {
      state.outer;
      inner();
      state.after;
    });
    effect(outer);

    state.after = 4;
    expect(outer).toHaveBeenCalledTimes(2);
    state.inner = 5;
    expect(outer).toHaveBeenCalledTimes(2);
  });

  it('stops effects once and lets stopped runners execute without tracking', () => {
    const state = reactive({ count: 0 });
    const onStop = vi.fn();
    const callback = vi.fn(() => state.count);
    const runner = effect(callback, { onStop });

    stop(runner);
    stop(runner);
    state.count += 1;
    expect(callback).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledOnce();

    runner();
    state.count += 1;
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does not leak reads from a stopped runner into an active parent effect', () => {
    const state = reactive({ parent: 1, child: 1 });
    const child = effect(() => state.child);
    stop(child);
    const parent = vi.fn(() => {
      state.parent;
      child();
    });
    effect(parent);

    state.child = 2;
    expect(parent).toHaveBeenCalledOnce();
    state.parent = 2;
    expect(parent).toHaveBeenCalledTimes(2);
  });

  it('reports development tracking and triggering events', () => {
    const state = reactive({ count: 0 });
    const onTrack = vi.fn();
    const onTrigger = vi.fn();
    effect(() => state.count, { onTrack, onTrigger });

    state.count = 1;

    expect(onTrack).toHaveBeenCalledWith(expect.objectContaining({
      target: toRaw(state),
      type: 'get',
      key: 'count',
    }));
    expect(onTrigger).toHaveBeenCalledWith(expect.objectContaining({
      target: toRaw(state),
      type: 'set',
      key: 'count',
      newValue: 1,
      oldValue: 0,
    }));
  });

  it('does not read development mode when dependency debugger hooks are absent', () => {
    const originalProcess = globalThis.process;
    let environmentReads = 0;
    vi.stubGlobal('process', {
      get env() {
        environmentReads += 1;
        return originalProcess.env;
      },
    });
    try {
      const state = reactive({ count: 0 });
      const runner = effect(() => state.count);
      state.count = 1;
      stop(runner);

      expect(environmentReads).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('disables dependency debugger callbacks in production mode', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const state = reactive({ count: 0 });
      const onTrack = vi.fn();
      const onTrigger = vi.fn();
      effect(() => state.count, { onTrack, onTrigger });
      state.count = 1;
      expect(onTrack).not.toHaveBeenCalled();
      expect(onTrigger).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it('creates deep proxies and preserves proxy identity', () => {
    const raw = { nested: { count: 1 }, list: [{ label: 'one' }] };
    const state = reactive(raw);

    expect(isReactive(state)).toBe(true);
    expect(isProxy(state.nested)).toBe(true);
    expect(state.nested).toBe(state.nested);
    expect(state.list[0]).toBe(state.list[0]);
    expect(reactive(raw)).toBe(state);
    expect(reactive(state)).toBe(state);
    expect(toRaw(state)).toBe(raw);
    const date = new Date(0);
    expect(reactive(date)).toBe(date);
  });

  it('cannot confuse user string properties with internal identity markers', () => {
    const raw = {
      __gluon_raw: 'user-value',
      __gluon_isReactive: true,
      count: 1,
    };
    const state = reactive(raw);
    const refLike = { __gluon_isRef: true, value: 1 };

    expect(state).not.toBe(raw);
    expect(toRaw(raw)).toBe(raw);
    expect(toRaw(state)).toBe(raw);
    expect(isProxy(raw)).toBe(false);
    expect(isRef(refLike)).toBe(false);
    expect(ref(refLike)).not.toBe(refLike);
  });

  it('keeps nested values raw in shallow reactive and shallow readonly modes', () => {
    const nested = { count: 1 };
    const shallowState = shallowReactive({ nested });
    const shallowView = shallowReadonly({ nested });

    expect(isReactive(shallowState)).toBe(true);
    expect(isReactive(shallowState.nested)).toBe(false);
    expect(isReadonly(shallowView)).toBe(true);
    expect(isReadonly(shallowView.nested)).toBe(false);
    expect(shallowReactive(shallowState)).toBe(shallowState);
    expect(shallowReadonly(shallowView)).toBe(shallowView);
  });

  it('prevents deep readonly object and collection mutations', () => {
    const raw = {
      nested: { count: 1 },
      map: new Map([['count', 1]]),
      set: new Set([1]),
    };
    const view = readonly(raw);

    Reflect.set(view.nested, 'count', 2);
    (view.map as Map<string, number>).set('count', 2);
    (view.set as Set<number>).add(2);
    Reflect.deleteProperty(view.nested, 'count');
    (view.map as Map<string, number>).clear();

    expect(raw.nested.count).toBe(1);
    expect(raw.map.get('count')).toBe(1);
    expect([...raw.set]).toEqual([1]);
    expect(isReadonly(view.nested)).toBe(true);
    expect(reactive(view)).toBe(view);
    expect(readonly(view)).toBe(view);
    expect('nested' in view).toBe(true);
    expect(Object.keys(view)).toContain('nested');
  });

  it('does not trigger through prototype receiver writes or missing deletes', () => {
    const base = reactive({ count: 1 });
    const callback = vi.fn(() => base.count);
    effect(callback);
    const child = Object.create(base) as { count: number };

    child.count = 2;
    delete (base as { missing?: number }).missing;
    expect(callback).toHaveBeenCalledOnce();
    expect(base.count).toBe(1);
  });

  it('tracks property existence and object key iteration', () => {
    const state = reactive<Record<string, number>>({ first: 1 });
    const hasSecond = vi.fn(() => 'second' in state);
    const keys = vi.fn(() => Object.keys(state));
    effect(hasSecond);
    effect(keys);

    state.second = 2;
    state.second = 3;
    delete state.second;

    expect(hasSecond).toHaveBeenCalledTimes(3);
    expect(keys).toHaveBeenCalledTimes(3);
  });

  it('tracks array indices, length changes, and structural iteration', () => {
    const list = reactive<string[]>(['a']);
    const length = vi.fn(() => list.length);
    const second = vi.fn(() => list[1]);
    const keys = vi.fn(() => Object.keys(list));
    effect(length);
    effect(second);
    effect(keys);

    list.push('b');
    expect(length).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
    expect(keys).toHaveBeenCalledTimes(2);

    list.length = 1;
    expect(length).toHaveBeenCalledTimes(3);
    expect(second).toHaveBeenCalledTimes(3);
    expect(keys).toHaveBeenCalledTimes(3);

    delete list[0];
    expect(keys).toHaveBeenCalledTimes(4);
  });

  it('does not treat non-canonical numeric array properties as indices', () => {
    const list = reactive<string[]>([]);
    const length = vi.fn(() => list.length);
    effect(length);

    Reflect.set(list, '01', 'value');
    Reflect.set(list, '4294967295', 'value');
    expect(list.length).toBe(0);
    expect(length).toHaveBeenCalledOnce();
  });

  it('reacts to nested object changes reached through arrays', () => {
    const list = reactive([{ count: 1 }]);
    const callback = vi.fn(() => list[0]?.count);
    effect(callback);
    list[0]!.count = 2;
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('tracks Map keys independently and wraps deep values', () => {
    const rawValue = { count: 1 };
    const state = reactive(new Map<string, { count: number }>([['first', rawValue]]));
    const first = vi.fn(() => state.get('first')?.count);
    const second = vi.fn(() => state.get('second'));
    effect(first);
    effect(second);

    state.get('first')!.count = 2;
    state.set('second', { count: 3 });

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
    expect(isReactive(state.get('first'))).toBe(true);
    expect(toRaw(state.get('first'))).toBe(rawValue);
  });

  it('separates Map key, value, size, and entry iteration dependencies', () => {
    const state = reactive(new Map([['first', 1]]));
    const keys = vi.fn(() => [...state.keys()]);
    const values = vi.fn(() => [...state.values()]);
    const entries = vi.fn(() => [...state]);
    const size = vi.fn(() => state.size);
    effect(keys);
    effect(values);
    effect(entries);
    effect(size);

    state.set('first', 2);
    expect(keys).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(2);
    expect(entries).toHaveBeenCalledTimes(2);
    expect(size).toHaveBeenCalledTimes(1);
    state.set('first', 2);
    expect(values).toHaveBeenCalledTimes(2);

    state.set('second', 3);
    expect(keys).toHaveBeenCalledTimes(2);
    expect(size).toHaveBeenCalledTimes(2);
    state.delete('second');
    expect(keys).toHaveBeenCalledTimes(3);
    expect(size).toHaveBeenCalledTimes(3);
  });

  it('supports Map forEach and clear', () => {
    const state = reactive(new Map([['first', { count: 1 }]]));
    const callback = vi.fn(() => {
      let total = 0;
      state.forEach((value, key, collection) => {
        expect(collection).toBe(state);
        expect(key).toBe('first');
        total += value.count;
      });
      return total;
    });
    effect(callback);

    state.get('first')!.count = 2;
    state.clear();
    state.clear();
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('normalizes reactive collection keys and exposes readonly collection reads', () => {
    const rawKey = { id: 1 };
    const proxyKey = reactive(rawKey);
    const state = reactive(new Map<object, { count: number }>());
    state.set(proxyKey, { count: 1 });
    expect(state.get(rawKey)?.count).toBe(1);

    const view = readonly(state);
    expect(view.size).toBe(1);
    expect(view.has(proxyKey)).toBe(true);
    expect(view.get(rawKey)?.count).toBe(1);
    expect([...view.keys()][0]).toBe(readonly(rawKey));
    let seen = 0;
    view.forEach((value) => { seen += value.count; });
    expect(seen).toBe(1);
    expect((view as Map<object, { count: number }>).delete(rawKey)).toBe(false);
    expect(Reflect.get(view, Symbol.toStringTag)).toBe('Map');
  });

  it('supports proxy keys already present in raw Map and Set collections', () => {
    const rawKey = { id: 1 };
    const proxyKey = reactive(rawKey);
    const map = reactive(new Map<object, number>([[proxyKey, 1]]));
    const callback = vi.fn(() => map.get(proxyKey));
    effect(callback);

    map.set(proxyKey, 2);
    expect(map.get(rawKey)).toBeUndefined();
    expect(map.get(proxyKey)).toBe(2);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(map.delete(proxyKey)).toBe(true);

    const set = reactive(new Set<object>([proxyKey]));
    expect(set.has(proxyKey)).toBe(true);
    expect(set.add(proxyKey)).toBe(set);
    expect(set.size).toBe(1);
    expect(set.delete(proxyKey)).toBe(true);
  });

  it('tracks Set membership, size, values, entries, add, delete, and clear', () => {
    const state = reactive(new Set<object>());
    const value = { id: 1 };
    const hasValue = vi.fn(() => state.has(value));
    const size = vi.fn(() => state.size);
    const values = vi.fn(() => [...state.values()]);
    effect(hasValue);
    effect(size);
    effect(values);

    expect(state.add(value)).toBe(state);
    state.add(value);
    expect(hasValue).toHaveBeenCalledTimes(2);
    expect(size).toHaveBeenCalledTimes(2);
    expect(isReactive([...state][0])).toBe(true);
    expect([...state.entries()][0]?.[0]).toBe([...state.entries()][0]?.[1]);

    state.delete(value);
    expect(state.delete(value)).toBe(false);
    state.clear();
    expect(hasValue).toHaveBeenCalledTimes(3);
    expect(size).toHaveBeenCalledTimes(3);
  });

  it('creates deep and shallow refs and preserves existing refs', () => {
    const deep = ref({ count: 1 });
    const shallow = shallowRef({ count: 1 });

    expect(isRef(deep)).toBe(true);
    expect(isReactive(deep.value)).toBe(true);
    expect(isReactive(shallow.value)).toBe(false);
    expect(ref(deep)).toBe(deep);
    expect(shallowRef(shallow)).toBe(shallow);
    expect(reactive(deep)).toBe(deep);
    expect(unref(deep)).toBe(deep.value);
    expect(unref(3)).toBe(3);
  });

  it('does not trigger refs for the same raw value', () => {
    const raw = { count: 1 };
    const value = ref(raw);
    const callback = vi.fn(() => value.value);
    effect(callback);

    value.value = reactive(raw);
    expect(callback).toHaveBeenCalledTimes(1);
    value.value = { count: 2 };
    expect(callback).toHaveBeenCalledTimes(2);

    const shallow = shallowRef(raw);
    const shallowCallback = vi.fn(() => shallow.value);
    effect(shallowCallback);
    shallow.value = { count: 3 };
    expect(shallowCallback).toHaveBeenCalledTimes(2);
  });

  it('keeps computed values lazy and cached until a dependency invalidates them', () => {
    const count = ref(1);
    const getter = vi.fn(() => count.value * 2);
    const doubled = computed(getter);

    expect(getter).not.toHaveBeenCalled();
    expect(doubled.value).toBe(2);
    expect(doubled.value).toBe(2);
    expect(getter).toHaveBeenCalledOnce();

    count.value = 2;
    count.value = 3;
    expect(getter).toHaveBeenCalledOnce();
    expect(doubled.value).toBe(6);
    expect(getter).toHaveBeenCalledTimes(2);
  });

  it('notifies computed subscribers only when invalidated', () => {
    const count = ref(1);
    const doubled = computed(() => count.value * 2);
    const callback = vi.fn(() => doubled.value);
    effect(callback);

    count.value = 2;
    count.value = 2;
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('supports writable computed values and ignores readonly computed writes', () => {
    const count = ref(1);
    const writable = computed({
      get: () => count.value,
      set: (value: number) => { count.value = value; },
    });
    writable.value = 3;
    expect(count.value).toBe(3);

    const readonlyValue = computed(() => count.value);
    Reflect.set(readonlyValue, 'value', 4);
    expect(count.value).toBe(3);
  });
});
