import { describe, expect, it, vi } from 'vitest';
import {
  createPersistencePlugin,
  createAsyncPersistencePlugin,
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
    expect(() => store.increment()).toThrow('disposed');
    expect(() => { store.count = 2; }).toThrow('disposed');
    expect(() => store.$subscribe(() => undefined)).toThrow('disposed');
    expect(() => store.$onAction(() => undefined)).toThrow('disposed');
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
  it('hydrates async storage in a defined lifecycle and ignores stale reads after a mutation', async () => {
    let resolveRead!: (value: string | null) => void;
    const values = new Map([['gluon:async-cart', JSON.stringify({ version: 1, state: { count: 9 } })]]);
    const storage = {
      getItem: vi.fn(() => new Promise<string | null>((resolve) => { resolveRead = resolve; })),
      setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    };
    const plugin = createAsyncPersistencePlugin({ storage });
    const definition = defineStore({ id: 'async-cart', state: () => ({ count: 0 }), persist: true });
    const manager = createStoreManager({ plugins: [plugin] });
    const store = manager.use(definition);
    expect(plugin.lifecycle.status).toBe('hydrating');
    store.$patch({ count: 3 });
    resolveRead(values.get('gluon:async-cart')!);
    await plugin.lifecycle.ready;
    expect(plugin.lifecycle.status).toBe('ready');
    expect(store.count).toBe(3);
    expect(storage.setItem).toHaveBeenCalledWith('gluon:async-cart', expect.stringContaining('"count":3'), expect.objectContaining({ aborted: false }));
    manager.dispose();
    expect(plugin.lifecycle.status).toBe('ready');
  });

  it('isolates async applications and exposes stable failed lifecycle errors', async () => {
    const error = new Error('offline');
    const first = createAsyncPersistencePlugin({ storage: { getItem: async () => { throw error; }, setItem: async () => undefined } });
    const second = createAsyncPersistencePlugin({ storage: { getItem: async () => null, setItem: async () => undefined } });
    const definition = defineStore({ id: 'async-isolated', state: () => ({ value: 1 }), persist: true });
    createStoreManager({ plugins: [first] }).use(definition);
    createStoreManager({ plugins: [second] }).use(definition);
    await first.lifecycle.ready;
    await second.lifecycle.ready;
    expect(first.lifecycle.status).toBe('failed');
    expect(first.lifecycle.error).toBe(error);
    expect(second.lifecycle.status).toBe('ready');
  });

  it('does not write an unchanged successful restore back to storage', async () => {
    const setItem = vi.fn(async () => undefined);
    const plugin = createAsyncPersistencePlugin({
      storage: {
        getItem: async () => JSON.stringify({ version: 1, state: { value: 4 } }),
        setItem,
      },
    });
    const store = createStoreManager({ plugins: [plugin] }).use(defineStore({
      id: 'async-clean-restore', state: () => ({ value: 0 }), persist: true,
    }));

    await plugin.lifecycle.ready;
    expect(store.value).toBe(4);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('supports disposal and a DOM-free abort signal while selecting persisted paths', async () => {
    let abortListener!: () => void;
    const signal = {
      aborted: false,
      addEventListener: (_type: 'abort', listener: () => void) => { abortListener = listener; },
    };
    const getItem = vi.fn(() => new Promise<string | null>(() => undefined));
    const plugin = createAsyncPersistencePlugin({
      signal,
      storage: { getItem, setItem: async () => undefined },
    });
    const definition = defineStore({
      id: 'async-dispose', state: () => ({ value: 1, ignored: true }),
      persist: { paths: ['value'] },
    });
    const manager = createStoreManager({ plugins: [plugin] });
    manager.use(definition);
    expect(getItem).toHaveBeenCalledWith('gluon:async-dispose', expect.objectContaining({ aborted: false }));
    plugin.lifecycle.dispose();
    abortListener?.();
    await plugin.lifecycle.ready;
    expect(plugin.lifecycle.status).toBe('failed');
  });

  it('settles an externally aborted never-settling adapter without reporting cancellation', async () => {
    let abortListener!: () => void;
    const signal = {
      aborted: false,
      addEventListener: (_type: 'abort', listener: () => void) => { abortListener = listener; },
    };
    const onError = vi.fn();
    const plugin = createAsyncPersistencePlugin({
      signal,
      onError,
      storage: { getItem: async () => new Promise<string | null>(() => undefined), setItem: async () => undefined },
    });
    createStoreManager({ plugins: [plugin] }).use(defineStore({ id: 'async-abort', state: () => ({ value: 1 }), persist: true }));
    abortListener();
    await plugin.lifecycle.ready;
    expect(plugin.lifecycle.status).toBe('failed');
    expect(plugin.lifecycle.error).toMatchObject({ name: 'AbortError', message: expect.stringContaining('aborted') });
    expect(onError).not.toHaveBeenCalled();
  });

  it('settles dispose immediately even when the adapter ignores cancellation', async () => {
    const plugin = createAsyncPersistencePlugin({
      storage: { getItem: async () => new Promise<string | null>(() => undefined), setItem: async () => undefined },
    });
    createStoreManager({ plugins: [plugin] }).use(defineStore({ id: 'async-dispose-never', state: () => ({ value: 1 }), persist: true }));
    plugin.lifecycle.dispose();
    await plugin.lifecycle.ready;
    expect(plugin.lifecycle.status).toBe('failed');
    expect(plugin.lifecycle.error).toMatchObject({ name: 'AbortError' });
  });

  it('creates a new ready promise for a later hydration cycle', async () => {
    const reads: Array<(value: string | null) => void> = [];
    const plugin = createAsyncPersistencePlugin({
      storage: {
        getItem: () => new Promise<string | null>((resolve) => reads.push(resolve)),
        setItem: async () => undefined,
      },
    });
    const manager = createStoreManager({ plugins: [plugin] });
    const definition = defineStore({ id: 'async-cycles', state: () => ({ value: 0 }), persist: true });
    manager.use(definition);
    const firstReady = plugin.lifecycle.ready;
    reads.shift()!('{"version":1,"state":{"value":2}}');
    await firstReady;
    expect(plugin.lifecycle.status).toBe('ready');
    manager.use(defineStore({ id: 'async-cycles-2', state: () => ({ value: 0 }), persist: true }));
    const secondReady = plugin.lifecycle.ready;
    expect(secondReady).not.toBe(firstReady);
    reads.shift()!(null);
    await secondReady;
    expect(plugin.lifecycle.status).toBe('ready');
  });

  it('serializes deferred writes in transaction order and fails on a rejected write', async () => {
    const writes: Array<{ value: string; resolve: () => void }> = [];
    const onError = vi.fn();
    const plugin = createAsyncPersistencePlugin({
      onError,
      storage: {
        getItem: async () => null,
        setItem: async (_key, value) => new Promise<void>((resolve) => writes.push({ value, resolve })),
      },
    });
    const store = createStoreManager({ plugins: [plugin] }).use(defineStore({
      id: 'async-order', state: () => ({ value: 0 }), persist: true,
    }));
    await plugin.lifecycle.ready;
    store.$patch({ value: 1 });
    store.$patch({ value: 2 });
    await Promise.resolve();
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]!.value).state.value).toBe(1);
    writes[0]!.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(writes).toHaveLength(2);
    expect(JSON.parse(writes[1]!.value).state.value).toBe(2);
    writes[1]!.resolve();
    await Promise.resolve();
    expect(plugin.lifecycle.status).toBe('ready');
  });

  it('transitions to failed and reports a real write failure', async () => {
    const onError = vi.fn();
    const plugin = createAsyncPersistencePlugin({
      onError,
      storage: { getItem: async () => null, setItem: async () => { throw new Error('write offline'); } },
    });
    const store = createStoreManager({ plugins: [plugin] }).use(defineStore({
      id: 'async-write-failure', state: () => ({ value: 0 }), persist: true,
    }));
    await plugin.lifecycle.ready;
    store.$patch({ value: 1 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(plugin.lifecycle.status).toBe('failed');
    expect(plugin.lifecycle.error).toMatchObject({ message: 'write offline' });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'write offline' }), 'async-write-failure');
  });

  it('blocks already queued writes after the first storage failure', async () => {
    let rejectFirst!: (reason: unknown) => void;
    const setItem = vi.fn((_key: string, _value: string) => new Promise<void>((_resolve, reject) => { rejectFirst = reject; }));
    const onError = vi.fn();
    const plugin = createAsyncPersistencePlugin({
      onError,
      storage: { getItem: async () => null, setItem },
    });
    const store = createStoreManager({ plugins: [plugin] }).use(defineStore({
      id: 'async-write-stop', state: () => ({ value: 0 }), persist: true,
    }));
    await plugin.lifecycle.ready;
    store.$patch({ value: 1 });
    store.$patch({ value: 2 });
    await Promise.resolve();
    expect(setItem).toHaveBeenCalledTimes(1);
    rejectFirst(new Error('first write failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(plugin.lifecycle.status).toBe('failed');
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('writes only configured async persistence paths after hydration', async () => {
    const writes: string[] = [];
    const plugin = createAsyncPersistencePlugin({
      storage: {
        getItem: async () => null,
        setItem: async (_key, value) => { writes.push(value); },
      },
    });
    const store = createStoreManager({ plugins: [plugin] }).use(defineStore({
      id: 'async-paths', state: () => ({ value: 1, ignored: true }), persist: { paths: ['value'] },
    }));
    await plugin.lifecycle.ready;
    store.$patch({ value: 2, ignored: false });
    await Promise.resolve();
    expect(JSON.parse(writes.at(-1)!)).toEqual({ version: 1, state: { value: 2 } });
  });

  it('hydrates and persists selected paths through an explicit storage adapter', () => {
    const values = new Map<string, string>([['goods:cart', '{"version":1,"state":{"items":["lamp"]}}']]);
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
    expect(JSON.parse(values.get('goods:cart')!)).toEqual({ version: 1, state: { items: ['lamp', 'tray'] } });
    expect(JSON.parse(values.get('goods:cart')!)).not.toHaveProperty('state.open');
  });

  it('reports storage failures and creates isolated testing stores with initial state', () => {
    const persistent = defineStore({
      id: 'persistent',
      state: () => ({ value: 0 }),
      persist: true,
    });

    const readErrors = vi.fn();
    const readStorage: StorageLike = {
      getItem: () => { throw new Error('read failed'); },
      setItem: () => { throw new Error('write failed'); },
    };
    createStoreManager({ plugins: [createPersistencePlugin({ storage: readStorage, onError: readErrors })] }).use(persistent);
    expect(readErrors).toHaveBeenCalledWith(expect.objectContaining({ message: 'read failed' }), 'persistent', expect.objectContaining({
      kind: 'storage-read',
    }));
    expect(() => readErrors.mock.calls[0]?.[2]?.recovery.remove()).toThrow('StorageLike.removeItem');

    const writeErrors = vi.fn();
    const writeStorage: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('write failed'); },
    };
    const store = createStoreManager({ plugins: [createPersistencePlugin({ storage: writeStorage, onError: writeErrors })] }).use(persistent);
    store.$patch({ value: 1 });
    expect(writeErrors).toHaveBeenCalledWith(expect.objectContaining({ message: 'write failed' }), 'persistent', expect.objectContaining({
      kind: 'storage-write',
    }));

    const first = createTestingStoreManager({ initialState: { persistent: { value: 4 } } });
    const second = createTestingStoreManager();
    expect(first.use(persistent).value).toBe(4);
    expect(second.use(persistent).value).toBe(0);
  });

  it('migrates envelope versions in contiguous steps and quarantines failed payloads on demand', () => {
    const values = new Map<string, string>([
      ['gluon:profile', JSON.stringify({ version: 0, state: { count: 2 } })],
    ]);
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    };
    const legacyStore = defineStore({
      id: 'profile',
      state: () => ({ count: 0, label: 'ready', migrated: false }),
      actions: (store) => ({
        increment() { store.count += 1; },
      }),
      persist: {
        version: 2,
        migrations: [
          {
            from: 0,
            to: 1,
            migrate: (state) => ({ count: Number(state.count ?? 0), label: 'legacy' }),
          },
          {
            from: 1,
            to: 2,
            migrate: (state) => ({ count: Number(state.count ?? 0), label: String(state.label), migrated: true }),
          },
        ],
      },
    });
    const onError = vi.fn();
    const manager = createStoreManager({ plugins: [createPersistencePlugin({ storage, onError })] });
    const store = manager.use(legacyStore);
    expect(store).toMatchObject({ count: 2, label: 'legacy', migrated: true });
    store.increment();
    expect(JSON.parse(values.get('gluon:profile')!)).toEqual({ version: 2, state: { count: 3, label: 'legacy', migrated: true } });

    values.set('gluon:profile', JSON.stringify({ version: 5, state: { count: 1 } }));
    const future = createStoreManager({
      plugins: [createPersistencePlugin({ storage, onError })],
    }).use(legacyStore);
    expect(future.count).toBe(0);
    expect(onError).toHaveBeenLastCalledWith(
      expect.any(TypeError),
      'profile',
      expect.objectContaining({ kind: 'future', key: 'gluon:profile', targetVersion: 2 }),
    );
    onError.mockClear();

    values.set('gluon:profile', '{"version":2,"state":[1,2,3]}');
    const corrupt = createStoreManager({
      plugins: [createPersistencePlugin({ storage, onError })],
    }).use(legacyStore);
    expect(corrupt.count).toBe(0);
    expect(onError).toHaveBeenLastCalledWith(
      expect.any(TypeError),
      'profile',
      expect.objectContaining({ kind: 'corrupt-envelope', key: 'gluon:profile' }),
    );
    const recovery = onError.mock.calls.at(-1)?.[2]?.recovery;
    recovery?.quarantine();
    expect(values.get('gluon:profile:quarantine')).toBe('{"version":2,"state":[1,2,3]}');
    expect(values.has('gluon:profile')).toBe(false);

    onError.mockClear();
    values.set('gluon:profile', '{"version":1.5,"state":{"count":1}}');
    createStoreManager({ plugins: [createPersistencePlugin({ storage, onError })] }).use(legacyStore);
    expect(onError).toHaveBeenLastCalledWith(
      expect.any(TypeError),
      'profile',
      expect.objectContaining({ kind: 'corrupt-envelope', version: undefined }),
    );
  });

  it('rejects invalid migration plans and preserves explicit recovery choices', () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    };
    const definition = defineStore({
      id: 'preferences',
      state: () => ({ theme: 'light', pageSize: 20 }),
      persist: { key: 'custom-preferences', version: 1 },
    });
    const manager = createStoreManager({ plugins: [createPersistencePlugin({ storage })] });
    const store = manager.use(definition);
    store.$patch({ theme: 'dark' });
    expect(JSON.parse(values.get('custom-preferences')!)).toEqual({ version: 1, state: { theme: 'dark', pageSize: 20 } });

    const invalidPlan = defineStore({
      id: 'invalid-plan',
      state: () => ({ value: 0 }),
      persist: {
        version: 3,
        migrations: [
          { from: 0, to: 1, migrate: (state) => state },
          { from: 2, to: 3, migrate: (state) => state },
        ],
      },
    });
    expect(() => createStoreManager({ plugins: [createPersistencePlugin({ storage })] }).use(invalidPlan))
      .toThrow('must be contiguous');
    const invalidLegacy = defineStore({
      id: 'invalid-legacy',
      state: () => ({ value: 0 }),
      persist: { version: 1, legacy: { to: 2, migrate: (state) => state } },
    });
    expect(() => createStoreManager({ plugins: [createPersistencePlugin({ storage })] }).use(invalidLegacy))
      .toThrow('integer output version');

    values.set('gluon:broken', '[]');
    const errors = vi.fn();
    const broken = defineStore({
      id: 'broken',
      state: () => ({ value: 1 }),
      persist: { key: 'gluon:broken', version: 1 },
    });
    createStoreManager({ plugins: [createPersistencePlugin({ storage, onError: errors })] }).use(broken);
    expect(errors).toHaveBeenCalledWith(expect.any(TypeError), 'broken', expect.objectContaining({
      kind: 'corrupt-envelope',
      recovery: expect.objectContaining({ key: 'gluon:broken' }),
    }));
    expect((errors.mock.calls[0]?.[0] as Error).message).toContain('plain object');
    errors.mockClear();

    values.set('gluon:legacy', '{"version":1,"state":{"value":1}}');
    const legacyMigration = defineStore({
      id: 'legacy',
      state: () => ({ value: 0 }),
      persist: {
        key: 'gluon:legacy',
        version: 2,
        migrations: [
          { from: 0, to: 1, migrate: (state) => ({ value: Number(state.value ?? 0) }) },
          { from: 1, to: 2, migrate: () => [] as never },
        ],
      },
    });
    createStoreManager({ plugins: [createPersistencePlugin({ storage, onError: errors })] }).use(legacyMigration);
    expect(errors).toHaveBeenCalledWith(expect.any(TypeError), 'legacy', expect.objectContaining({
      kind: 'migration-invalid-output',
      key: 'gluon:legacy',
      raw: '{"version":1,"state":{"value":1}}',
    }));
  });

  it('rejects every ambiguous, discontinuous, or out-of-range migration plan', () => {
    const storage: StorageLike = { getItem: () => null, setItem: () => undefined };
    const invalidPlans: readonly [string, unknown, string][] = [
      ['zero-version', { version: 0 }, 'positive integer'],
      ['fractional-version', { version: 1.5 }, 'positive integer'],
      ['invalid-step', { version: 1, migrations: [{ from: -1, to: 0, migrate: (state: unknown) => state }] }, 'increasing integer'],
      ['invalid-migrate', { version: 1, migrations: [{ from: 0, to: 1, migrate: true }] }, 'increasing integer'],
      ['skipped-version', { version: 2, migrations: [{ from: 0, to: 2, migrate: (state: unknown) => state }] }, 'one version at a time'],
      ['duplicate-step', { version: 2, migrations: [
        { from: 0, to: 1, migrate: (state: unknown) => state },
        { from: 0, to: 1, migrate: (state: unknown) => state },
      ] }, 'must not duplicate'],
      ['future-step', { version: 1, migrations: [{ from: 1, to: 2, migrate: (state: unknown) => state }] }, 'future versions'],
      ['unfinished-step', { version: 3, migrations: [{ from: 0, to: 1, migrate: (state: unknown) => state }] }, 'end at the configured version'],
      ['legacy-gap', { version: 2, legacy: { to: 1, migrate: (state: unknown) => state } }, 'requires a contiguous step'],
      ['legacy-fraction', { version: 2, legacy: { to: 0.5, migrate: (state: unknown) => state } }, 'integer output version'],
      ['legacy-migrate', { version: 1, legacy: { to: 0, migrate: false } }, 'integer output version'],
    ];

    for (const [id, persist, message] of invalidPlans) {
      const definition = defineStore({ id, state: () => ({ value: 0 }), persist: persist as never });
      expect(() => createStoreManager({ plugins: [createPersistencePlugin({ storage })] }).use(definition)).toThrow(message);
    }
  });

  it('classifies corrupt, legacy, missing, throwing, and invalid migration payloads', () => {
    const values = new Map<string, string>();
    const errors = vi.fn();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    };
    const run = (id: string, payload: string, persist: unknown) => {
      values.set(`gluon:${id}`, payload);
      const definition = defineStore({ id, state: () => ({ value: 0, migrated: false }), persist: persist as never });
      createStoreManager({ plugins: [createPersistencePlugin({ storage, onError: errors })] }).use(definition);
      return errors.mock.calls.at(-1)?.[2];
    };

    expect(run('bad-json', '{', true)).toMatchObject({ kind: 'corrupt-json' });
    expect(run('unowned-legacy', '{"value":1}', true)).toMatchObject({ kind: 'legacy' });
    expect(run('missing-step', '{"version":0,"state":{"value":1}}', { version: 2 })).toMatchObject({ kind: 'migration-missing', version: 0 });
    expect(run('throwing-step', '{"version":0,"state":{"value":1}}', {
      version: 1,
      migrations: [{ from: 0, to: 1, migrate: () => { throw new Error('step failed'); } }],
    })).toMatchObject({ kind: 'migration-throw', version: 0 });
    expect(run('throwing-legacy', '{"value":1}', {
      version: 1,
      legacy: { to: 1, migrate: () => { throw new Error('legacy failed'); } },
    })).toMatchObject({ kind: 'migration-throw', version: 1 });
    expect(run('invalid-legacy-output', '{"value":1}', {
      version: 1,
      legacy: { to: 1, migrate: () => ({ value: new Date() }) },
    })).toMatchObject({ kind: 'migration-invalid-output' });

    values.set('gluon:legacy-success', '{"value":3}');
    const successful = defineStore({
      id: 'legacy-success',
      state: () => ({ value: 0, migrated: false }),
      persist: {
        version: 2,
        legacy: { to: 1, migrate: (state) => ({ value: Number(state.value), migrated: false }) },
        migrations: [{ from: 1, to: 2, migrate: (state) => ({ ...state, migrated: true }) }],
      },
    });
    expect(createStoreManager({ plugins: [createPersistencePlugin({ storage })] }).use(successful))
      .toMatchObject({ value: 3, migrated: true });
  });

  it('keeps failed persistence blocked until reset, remove, or quarantine explicitly recovers it', () => {
    const values = new Map<string, string>([['gluon:recoverable', '{']]);
    const writes: string[] = [];
    const errors = vi.fn();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); writes.push(key); },
      removeItem: (key) => { values.delete(key); },
    };
    const definition = defineStore({ id: 'recoverable', state: () => ({ value: 1 }), persist: true });
    const store = createStoreManager({ plugins: [createPersistencePlugin({ storage, onError: errors })] }).use(definition);
    store.$patch({ value: 2 });
    expect(writes).toEqual([]);
    errors.mock.calls[0]?.[2]?.recovery.reset();
    expect(JSON.parse(values.get('gluon:recoverable')!)).toEqual({ version: 1, state: { value: 1 } });
    store.$patch({ value: 3 });
    expect(JSON.parse(values.get('gluon:recoverable')!)).toEqual({ version: 1, state: { value: 3 } });

    values.set('gluon:recoverable', '{');
    const removeErrors = vi.fn();
    const removed = createStoreManager({ plugins: [createPersistencePlugin({ storage, onError: removeErrors })] }).use(definition);
    removeErrors.mock.calls[0]?.[2]?.recovery.remove();
    expect(values.has('gluon:recoverable')).toBe(false);
    removed.$patch({ value: 4 });
    expect(JSON.parse(values.get('gluon:recoverable')!)).toEqual({ version: 1, state: { value: 4 } });

    let failWrite = true;
    const writeErrors = vi.fn();
    const writeStorage: StorageLike = {
      getItem: () => null,
      setItem: (key, value) => {
        if (failWrite) throw new Error('first write fails');
        values.set(key, value);
      },
      removeItem: (key) => { values.delete(key); },
    };
    const writeStore = createStoreManager({ plugins: [createPersistencePlugin({ storage: writeStorage, onError: writeErrors })] }).use(definition);
    writeStore.$patch({ value: 2 });
    writeStore.$patch({ value: 3 });
    expect(writeErrors).toHaveBeenCalledTimes(1);
    failWrite = false;
    writeErrors.mock.calls[0]?.[2]?.recovery.quarantine();
    expect(values.get('gluon:recoverable:quarantine')).toBe('');
    writeStore.$patch({ value: 4 });
    expect(JSON.parse(values.get('gluon:recoverable')!)).toEqual({ version: 1, state: { value: 4 } });
  });

  it('rejects non-record and unsafe serialized manager snapshots at the parse boundary', () => {
    const manager = createStoreManager();
    expect(() => manager.deserialize('[]')).toThrow('Invalid Gluon store snapshot');
    expect(() => manager.deserialize('{"version":1,"stores":{"__proto__":{}}}')).toThrow('Unsafe store state key');
  });
});
