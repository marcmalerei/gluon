import { describe, expect, it, vi } from 'vitest';
import {
  createPersistencePlugin,
  createStoreManager,
  createTestingStoreManager,
  defineStore,
  type StorageLike,
  type StoreTransaction,
} from '../packages/store/src/index.js';

const counterDefinition = defineStore({
  id: 'counter',
  state: () => ({ count: 1, label: 'ready', nested: { active: true } }),
  getters: (state) => ({
    doubled: state.count * 2,
    summary: `${state.label}:${state.count * 2}`,
  }),
  actions: (store) => ({
    increment(amount = 1) {
      store.count += amount;
      return store.count;
    },
    async incrementLater(amount: number) {
      await Promise.resolve();
      store.count += amount;
      return store.count;
    },
    async failLater() {
      await Promise.resolve();
      throw new Error('async action failed');
    },
    fail() {
      store.count += 1;
      throw new Error('action failed');
    },
  }),
});

describe('@gluonjs/store definitions and transactions', () => {
  it('infers state, getters, and actions and records action and patch details', async () => {
    const records: StoreTransaction[] = [];
    const manager = createStoreManager({ onTransaction: (record) => records.push(record) });
    const store = counterDefinition.use(manager);
    const actionAfter = vi.fn();
    const actionError = vi.fn();
    store.$onAction((context) => {
      context.after(actionAfter);
      context.onError(actionError);
    });

    expect(store.count).toBe(1);
    expect(store.doubled).toBe(2);
    expect(store.summary).toBe('ready:2');
    expect(manager.withMetadata({ requestId: 'r1' }, () => store.increment(2))).toBe(3);
    expect(actionAfter).toHaveBeenLastCalledWith(3);
    expect(records[0]).toMatchObject({
      id: 1,
      storeId: 'counter',
      type: 'action',
      name: 'increment',
      status: 'fulfilled',
      metadata: { requestId: 'r1' },
      before: { count: 1 },
      after: { count: 3 },
    });

    store.$patch({ count: 5, unknown: 'ignored' } as never, { source: 'object' });
    store.$patch((state) => { state.count += 1; }, { source: 'function' });
    expect(store.count).toBe(6);
    expect(records.slice(1, 3).map((record) => record.type))
      .toEqual(['patch-object', 'patch-function']);
    expect(records[2]?.metadata).toMatchObject({ source: 'function' });

    await manager.withMetadata({ requestId: 'async' }, () => store.incrementLater(2));
    expect(records.at(-1)).toMatchObject({
      type: 'action',
      name: 'incrementLater',
      metadata: { requestId: 'async' },
      after: { count: 8 },
    });

    expect(() => store.fail()).toThrow('action failed');
    expect(actionError).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'action failed' }));
    expect(records.at(-1)).toMatchObject({ type: 'action', name: 'fail', status: 'rejected' });
    await expect(store.failLater()).rejects.toThrow('async action failed');
    expect(records.at(-1)).toMatchObject({ type: 'action', name: 'failLater', status: 'rejected' });
  });

  it('supports store and manager subscriptions, resets, plugins, and cleanup', () => {
    const local = vi.fn();
    const global = vi.fn();
    const cleanup = vi.fn();
    const manager = createStoreManager({
      plugins: [({ store }) => {
        expect(store.$id).toBe('counter');
        return { inspectionId: 'counter:1' };
      }, () => cleanup],
    });
    const removeGlobal = manager.subscribe(global);
    const store = manager.use(counterDefinition);
    const removeLocal = store.$subscribe(local);

    store.increment();
    expect(local).toHaveBeenCalledOnce();
    expect(global).toHaveBeenCalledOnce();
    expect(store.$extensions.inspectionId).toBe('counter:1');
    store.$reset({ reason: 'test' });
    expect(store.count).toBe(1);
    expect(local).toHaveBeenCalledTimes(2);
    expect(local.mock.calls[1]?.[0]).toMatchObject({ type: 'reset', metadata: { reason: 'test' } });

    removeLocal();
    removeGlobal();
    store.increment();
    expect(local).toHaveBeenCalledTimes(2);
    expect(global).toHaveBeenCalledTimes(2);
    store.$dispose();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(() => store.$patch({ count: 2 })).toThrow('disposed');
    expect(manager.use(counterDefinition)).not.toBe(store);
    manager.dispose();
    expect(() => manager.use(counterDefinition)).toThrow('disposed');
    manager.dispose();
  });

  it('adds plugins to existing stores and rejects invalid definitions', () => {
    const manager = createStoreManager();
    const store = counterDefinition.use(manager);
    const remove = manager.addPlugin(() => ({ late: true }));
    expect(store.$extensions.late).toBe(true);
    remove();

    expect(() => defineStore({ id: '', state: () => ({ ok: true }) })).toThrow('cannot be empty');
    expect(() => manager.use(defineStore({
      id: 'invalid-state',
      state: () => [] as unknown as Record<string, unknown>,
    }))).toThrow('plain object');
    expect(() => manager.use(defineStore({
      id: 'reserved',
      state: () => ({ $internal: true }),
    }))).toThrow('reserved key');
    expect(() => manager.use(defineStore({
      id: 'duplicate',
      state: () => ({ value: 1 }),
      getters: () => ({ value: 2 }),
    }))).toThrow('duplicate key');
    expect(() => manager.use(defineStore({
      id: 'invalid-getters',
      state: () => ({ value: 1 }),
      getters: (() => []) as never,
    }))).toThrow('getters must return a plain object');
    expect(() => manager.use(defineStore({
      id: 'invalid-actions',
      state: () => ({ value: 1 }),
      actions: (() => []) as never,
    }))).toThrow('actions must return a plain object');
    expect(() => manager.use(defineStore({
      id: 'invalid-action-value',
      state: () => ({ value: 1 }),
      actions: (() => ({ broken: true })) as never,
    }))).toThrow('must be a function');
  });
});

describe('@gluonjs/store HMR and universal state', () => {
  it('replaces logic and reconciles only compatible state during HMR', () => {
    const manager = createStoreManager();
    const original = counterDefinition.use(manager);
    original.count = 7;
    original.label = 'kept';

    const updatedDefinition = defineStore({
      id: 'counter',
      state: () => ({ count: 0, label: 4, added: true }),
      getters: (state) => ({
        tripled: state.count * 3,
      }),
      actions: (store) => ({
        decrement() {
          store.count -= 1;
        },
      }),
    });
    const updated = manager.hotUpdate(updatedDefinition, { module: 'counter.ts' });

    expect(updated).toBe(original);
    expect(updated.count).toBe(7);
    expect(updated.label).toBe(4);
    expect(updated.added).toBe(true);
    expect(updated.tripled).toBe(21);
    updated.decrement();
    expect(updated.count).toBe(6);
    expect('nested' in updated).toBe(false);
    expect('doubled' in updated).toBe(false);
  });

  it('covers compatible arrays, records, nulls, new stores, and removed reset keys', () => {
    const manager = createStoreManager();
    const originalDefinition = defineStore({
      id: 'shape',
      state: () => ({ array: [1], record: { value: 1 }, nullable: null as null | string, removed: true }),
    });
    const store = manager.use(originalDefinition);
    store.array.push(2);
    store.record.value = 4;
    const nextDefinition = defineStore({
      id: 'shape',
      state: () => ({ array: [] as number[], record: {} as Record<string, number>, nullable: 'ready', added: 1 }),
    });
    const updated = manager.hotUpdate(nextDefinition);
    expect(updated.array).toEqual([1, 2]);
    expect(updated.record).toEqual({ value: 4 });
    expect(updated.nullable).toBe('ready');
    expect('removed' in updated).toBe(false);
    updated.$reset();
    expect(updated).toMatchObject({ array: [], record: {}, nullable: 'ready', added: 1 });

    const newDefinition = defineStore({ id: 'new-through-hmr', state: () => ({ ready: true }) });
    expect(manager.hotUpdate(newDefinition).ready).toBe(true);
  });

  it('creates isolated request managers and hydrates stores before or after use', () => {
    const requestA = createStoreManager();
    const requestB = createStoreManager();
    requestA.use(counterDefinition).increment(4);
    expect(requestA.use(counterDefinition).count).toBe(5);
    expect(requestB.use(counterDefinition).count).toBe(1);

    const snapshot = requestA.dehydrate();
    const beforeUse = createStoreManager();
    beforeUse.hydrate(snapshot);
    expect(beforeUse.use(counterDefinition).count).toBe(5);

    const afterUse = createStoreManager();
    const hydrated = afterUse.use(counterDefinition);
    afterUse.deserialize(requestA.serialize());
    expect(hydrated.count).toBe(5);
    expect(afterUse.dehydrate()).toEqual(snapshot);
  });

  it('escapes HTML-sensitive state and rejects unsafe or unserializable snapshots', () => {
    const manager = createStoreManager();
    const definition = defineStore({
      id: 'safe',
      state: () => ({ content: '</script><script>&\u2028\u2029' }),
    });
    manager.use(definition);
    const serialized = manager.serialize();
    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('>');
    expect(serialized).not.toContain('&');
    expect(serialized).toContain('\\u003c/script\\u003e');

    expect(() => manager.hydrate({ version: 2, stores: {} } as never)).toThrow('Invalid');
    expect(() => manager.deserialize('{"version":1,"stores":{"safe":[]}}')).toThrow('Invalid state');
    expect(() => createStoreManager().use(defineStore({
      id: 'circular',
      state: () => {
        const state: { self?: unknown } = {};
        state.self = state;
        return state;
      },
    })).$patch(() => undefined)).toThrow('circular');
    for (const value of [Number.NaN, undefined, new Date()] as const) {
      const invalid = createStoreManager();
      const invalidDefinition = defineStore({ id: `invalid-${String(value)}`, state: () => ({ value }) });
      invalid.use(invalidDefinition);
      expect(() => invalid.dehydrate()).toThrow('Store state');
    }
  });
});

describe('@gluonjs/store persistence and testing', () => {
  it('hydrates and persists selected paths through an explicit storage adapter', () => {
    const values = new Map<string, string>([['goods:cart', '{"items":["lamp"]}']]);
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
    };
    const definition = defineStore({
      id: 'cart',
      state: () => ({ items: [] as string[], open: false }),
      actions: (store) => ({
        add(item: string) { store.items.push(item); },
      }),
      persist: { paths: ['items'] },
    });
    const manager = createStoreManager({
      plugins: [createPersistencePlugin({ storage, namespace: 'goods' })],
    });
    const store = manager.use(definition);
    expect(store.items).toEqual(['lamp']);
    store.open = true;
    store.add('tray');
    expect(JSON.parse(values.get('goods:cart')!)).toEqual({ items: ['lamp', 'tray'] });
    expect(JSON.parse(values.get('goods:cart')!)).not.toHaveProperty('open');
  });

  it('reports storage failures and creates isolated testing stores with initial state', () => {
    const onError = vi.fn();
    const storage: StorageLike = {
      getItem: () => { throw new Error('read failed'); },
      setItem: () => { throw new Error('write failed'); },
    };
    const persistent = defineStore({
      id: 'persistent',
      state: () => ({ value: 0 }),
      persist: true,
    });
    const manager = createStoreManager({ plugins: [createPersistencePlugin({ storage, onError })] });
    const store = manager.use(persistent);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'read failed' }), 'persistent');
    store.$patch({ value: 1 });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'write failed' }), 'persistent');

    const first = createTestingStoreManager({ initialState: { persistent: { value: 4 } } });
    const second = createTestingStoreManager();
    expect(first.use(persistent).value).toBe(4);
    expect(second.use(persistent).value).toBe(0);
  });

  it('persists complete state under custom keys and rejects invalid persisted values', () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
    };
    const definition = defineStore({
      id: 'preferences',
      state: () => ({ theme: 'light', pageSize: 20 }),
      persist: { key: 'custom-preferences' },
    });
    const manager = createStoreManager({ plugins: [createPersistencePlugin({ storage })] });
    const store = manager.use(definition);
    store.$patch({ theme: 'dark' });
    expect(JSON.parse(values.get('custom-preferences')!)).toEqual({ theme: 'dark', pageSize: 20 });

    values.set('broken', '[]');
    const errors = vi.fn();
    const broken = defineStore({
      id: 'broken',
      state: () => ({ value: 1 }),
      persist: { key: 'broken' },
    });
    createStoreManager({ plugins: [createPersistencePlugin({ storage, onError: errors })] }).use(broken);
    expect(errors).toHaveBeenCalledWith(expect.any(TypeError), 'broken');
    expect((errors.mock.calls[0]?.[0] as Error).message).toContain('plain object');
  });
});
