import {
  batch,
  computed,
  effectScope,
  reactive,
  toRaw,
  type DeepReadonly,
  type EffectScope,
} from '@gluonjs/reactivity';

export type StateTree = Record<string, unknown>;
export type StoreGetterTree<State extends StateTree = StateTree> = Record<string, unknown>;
export type StoreActionTree = Record<string, (...args: any[]) => unknown>;
export type StoreTransactionType =
  | 'action'
  | 'hydrate'
  | 'hmr'
  | 'patch-function'
  | 'patch-object'
  | 'reset';
export type StoreTransactionStatus = 'fulfilled' | 'rejected';
export type StoreTransactionMetadata = Readonly<Record<string, unknown>>;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export interface StoreSnapshot {
  readonly version: 1;
  readonly stores: Readonly<Record<string, Readonly<Record<string, JsonValue>>>>;
}

export interface StoreTransaction {
  readonly id: number;
  readonly storeId: string;
  readonly type: StoreTransactionType;
  readonly name?: string;
  readonly timestamp: number;
  readonly metadata: StoreTransactionMetadata;
  readonly before: Readonly<Record<string, JsonValue>>;
  readonly after: Readonly<Record<string, JsonValue>>;
  readonly status: StoreTransactionStatus;
  readonly error?: unknown;
}

export interface StoreActionContext {
  readonly storeId: string;
  readonly name: string;
  readonly args: readonly unknown[];
  after(callback: (result: unknown) => void): void;
  onError(callback: (error: unknown) => void): void;
}

export type StoreSubscription = (transaction: StoreTransaction) => void;
export type StoreActionSubscription = (context: StoreActionContext) => void;

export interface PersistOptions<State extends StateTree> {
  readonly key?: string;
  readonly paths?: readonly (keyof State & string)[];
  readonly version?: number;
  readonly migrations?: readonly PersistMigrationStep[];
  readonly legacy?: PersistLegacyMigration;
  /** Defines how persisted client data combines with request/SSR state. */
  readonly merge?: PersistMergePolicy<State>;
  /** Optional JSON-compatible codec for applications that need richer values. */
  readonly serialize?: (envelope: PersistedStateEnvelope) => string;
  readonly deserialize?: (raw: string) => unknown;
  /** Opt into BroadcastChannel synchronization for this store. */
  readonly sync?: boolean;
}

export type PersistMergePolicy<State extends StateTree> =
  | 'server-wins'
  | 'persisted-wins'
  | 'merge'
  | ((server: PersistedStateRecord, persisted: PersistedStateRecord) => PersistedStateRecord);

/**
 * The object shape exposed to migration callbacks.
 *
 * Application DTO interfaces do not need a string index signature. Every
 * migration result is still normalized and validated as JSON before Gluon
 * patches store state or writes it to storage.
 */
export type PersistedStateRecord = Readonly<Record<string, unknown>>;

type PersistedJsonStateRecord = Readonly<Record<string, JsonValue>>;

export interface PersistedStateEnvelope {
  readonly version: number;
  readonly state: PersistedStateRecord;
}

export interface PersistMigrationStep {
  readonly from: number;
  readonly to: number;
  readonly migrate: (state: PersistedStateRecord) => PersistedStateRecord;
}

export interface PersistLegacyMigration {
  /** Version of the state returned by migrate(). */
  readonly to: number;
  readonly migrate: (state: PersistedStateRecord) => PersistedStateRecord;
}

export interface PersistedStateRecovery {
  readonly key: string;
  reset(): void;
  remove(): void;
  quarantine(): void;
}

export type PersistenceStatus = 'idle' | 'hydrating' | 'ready' | 'failed';

export interface PersistenceLifecycle {
  readonly status: PersistenceStatus;
  readonly error: unknown;
  readonly ready: Promise<void>;
  dispose(): void;
}

export interface PersistedStateErrorContext {
  readonly key: string;
  readonly raw: string | null;
  readonly kind:
    | 'legacy'
    | 'future'
    | 'storage-read'
    | 'storage-write'
    | 'corrupt-json'
    | 'corrupt-envelope'
    | 'migration-missing'
    | 'migration-throw'
    | 'migration-invalid-output';
  readonly version?: number;
  readonly targetVersion: number;
  readonly recovery: PersistedStateRecovery;
}

interface PersistencePlan {
  readonly version: number;
  readonly steps: readonly PersistMigrationStep[];
  readonly legacy?: PersistLegacyMigration;
}

export interface DefineStoreOptions<
  Id extends string,
  State extends StateTree,
  Getters extends StoreGetterTree<State>,
  Actions extends StoreActionTree,
> {
  readonly id: Id;
  readonly state: () => State;
  readonly getters?: (state: DeepReadonly<State>) => Getters;
  readonly actions?: (store: State & Readonly<Getters>) => Actions;
  readonly persist?: boolean | PersistOptions<State>;
}

export type StoreGetterValues<Getters extends Record<string, unknown>> = {
  readonly [Key in keyof Getters]: Getters[Key];
};

export interface StoreProperties<Id extends string, State extends StateTree> {
  readonly $id: Id;
  readonly $state: State;
  readonly $extensions: Readonly<Record<string, unknown>>;
  $patch(patch: Partial<State>, metadata?: StoreTransactionMetadata): void;
  $patch(mutator: (state: State) => void, metadata?: StoreTransactionMetadata): void;
  $reset(metadata?: StoreTransactionMetadata): void;
  $subscribe(callback: StoreSubscription): () => void;
  $onAction(callback: StoreActionSubscription): () => void;
  $dispose(): void;
}

export type Store<
  Id extends string,
  State extends StateTree,
  Getters extends StoreGetterTree<State>,
  Actions extends StoreActionTree,
> = State & StoreGetterValues<Getters> & Actions & StoreProperties<Id, State>;

export interface StoreDefinition<
  Id extends string,
  State extends StateTree,
  Getters extends StoreGetterTree<State>,
  Actions extends StoreActionTree,
> {
  readonly id: Id;
  readonly options: DefineStoreOptions<Id, State, Getters, Actions>;
  use(manager: StoreManager): Store<Id, State, Getters, Actions>;
}

export interface StorePluginDefinition {
  readonly id: string;
  readonly options: {
    readonly state: () => StateTree;
    readonly getters?: (state: DeepReadonly<StateTree>) => StoreGetterTree;
    readonly actions?: (store: StateTree) => StoreActionTree;
    readonly persist?: boolean | PersistOptions<StateTree>;
  };
}

export interface StorePluginStore extends StoreProperties<string, StateTree> {
  [key: string]: unknown;
}

export interface StorePluginContext {
  readonly manager: StoreManager;
  readonly definition: StorePluginDefinition;
  readonly store: StorePluginStore;
}

export type StorePluginResult = void | (() => void) | Readonly<Record<string, unknown>>;
export type StorePlugin = (context: StorePluginContext) => StorePluginResult;

export interface StoreManagerOptions {
  readonly plugins?: readonly StorePlugin[];
  readonly onTransaction?: StoreSubscription;
}

export interface TestingStoreManagerOptions extends StoreManagerOptions {
  readonly initialState?: StoreSnapshot | Readonly<Record<string, Readonly<Record<string, JsonValue>>>>;
}

interface StoreRuntime {
  definition: StorePluginDefinition;
  readonly state: StateTree;
  readonly store: StorePluginStore;
  readonly subscribers: Set<StoreSubscription>;
  readonly actionSubscribers: Set<StoreActionSubscription>;
  readonly pluginCleanups: Array<() => void>;
  readonly stateKeys: Set<string>;
  readonly getterKeys: Set<string>;
  readonly actionKeys: Set<string>;
  scope: EffectScope;
  disposed: boolean;
}

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);
let persistenceSourceSequence = 0;

export function defineStore<
  const Id extends string,
  State extends StateTree,
  const Getters extends StoreGetterTree<State> = Record<never, never>,
  const Actions extends StoreActionTree = Record<never, never>,
>(
  id: Id,
  state: () => State,
  options: Omit<DefineStoreOptions<Id, State, Getters, Actions>, 'id' | 'state'>,
): StoreDefinition<Id, State, Getters, Actions>;
export function defineStore<
  const Id extends string,
  State extends StateTree,
  const Getters extends StoreGetterTree<State> = Record<never, never>,
  const Actions extends StoreActionTree = Record<never, never>,
>(
  options: DefineStoreOptions<Id, State, Getters, Actions>,
): StoreDefinition<Id, State, Getters, Actions>;
export function defineStore<
  const Id extends string,
  State extends StateTree,
  Getters extends StoreGetterTree<State>,
  Actions extends StoreActionTree,
>(
  idOrOptions: Id | DefineStoreOptions<Id, State, Getters, Actions>,
  state?: () => State,
  behavior?: Omit<DefineStoreOptions<Id, State, Getters, Actions>, 'id' | 'state'>,
): StoreDefinition<Id, State, Getters, Actions> {
  const options = typeof idOrOptions === 'string'
    ? { id: idOrOptions, state: state!, ...behavior }
    : idOrOptions;
  if (!options.id.trim()) throw new TypeError('A store id cannot be empty.');
  return Object.freeze({
    id: options.id,
    options,
    use(manager: StoreManager): Store<Id, State, Getters, Actions> {
      return manager.use(this);
    },
  });
}

export function createStoreManager(options: StoreManagerOptions = {}): StoreManager {
  return new StoreManager(options);
}

export function createTestingStoreManager(options: TestingStoreManagerOptions = {}): StoreManager {
  const manager = new StoreManager(options);
  if (options.initialState) {
    manager.hydrate(isStoreSnapshot(options.initialState)
      ? options.initialState
      : { version: 1, stores: options.initialState });
  }
  return manager;
}

export class StoreManager {
  private readonly plugins: StorePlugin[];
  private readonly runtimes = new Map<string, StoreRuntime>();
  private readonly pendingState = new Map<string, Readonly<Record<string, JsonValue>>>();
  private readonly transactionSubscribers = new Set<StoreSubscription>();
  private readonly metadataStack: StoreTransactionMetadata[] = [];
  private transactionSequence = 0;
  private disposed = false;

  constructor(options: StoreManagerOptions = {}) {
    this.plugins = [...(options.plugins ?? [])];
    if (options.onTransaction) this.transactionSubscribers.add(options.onTransaction);
  }

  use<Id extends string, State extends StateTree, Getters extends StoreGetterTree<State>, Actions extends StoreActionTree>(
    definition: StoreDefinition<Id, State, Getters, Actions>,
  ): Store<Id, State, Getters, Actions> {
    this.assertActive();
    const existing = this.runtimes.get(definition.id);
    if (existing) return existing.store as Store<Id, State, Getters, Actions>;

    const initialState = definition.options.state();
    assertStateTree(initialState, definition.id);
    const state = reactive(initialState) as StateTree;
    const target = Object.create(null) as Record<string, unknown>;
    const runtime: StoreRuntime = {
      definition: definition as unknown as StorePluginDefinition,
      state,
      store: target as StorePluginStore,
      subscribers: new Set(),
      actionSubscribers: new Set(),
      pluginCleanups: [],
      stateKeys: new Set(),
      getterKeys: new Set(),
      actionKeys: new Set(),
      scope: effectScope({ detached: true }),
      disposed: false,
    };
    this.runtimes.set(definition.id, runtime);
    this.defineStoreProperties(runtime);
    this.rebuildDefinitionProperties(runtime);

    const pending = this.pendingState.get(definition.id);
    if (pending) {
      this.pendingState.delete(definition.id);
      this.patchRuntime(runtime, pending, 'hydrate');
    }
    this.applyPlugins(runtime);
    return runtime.store as Store<Id, State, Getters, Actions>;
  }

  addPlugin(plugin: StorePlugin): () => void {
    this.assertActive();
    this.plugins.push(plugin);
    for (const runtime of this.runtimes.values()) this.applyPlugin(runtime, plugin);
    return () => {
      const index = this.plugins.indexOf(plugin);
      if (index >= 0) this.plugins.splice(index, 1);
    };
  }

  subscribe(callback: StoreSubscription): () => void {
    this.assertActive();
    this.transactionSubscribers.add(callback);
    return () => this.transactionSubscribers.delete(callback);
  }

  withMetadata<Result>(metadata: StoreTransactionMetadata, callback: () => Result): Result {
    this.assertActive();
    this.metadataStack.push(metadata);
    try {
      return callback();
    } finally {
      this.metadataStack.pop();
    }
  }

  hotUpdate<Id extends string, State extends StateTree, Getters extends StoreGetterTree<State>, Actions extends StoreActionTree>(
    definition: StoreDefinition<Id, State, Getters, Actions>,
    metadata: StoreTransactionMetadata = {},
  ): Store<Id, State, Getters, Actions> {
    this.assertActive();
    const runtime = this.runtimes.get(definition.id);
    if (!runtime) return this.use(definition);
    const before = snapshotState(runtime.state);
    const defaults = definition.options.state();
    assertStateTree(defaults, definition.id);
    batch(() => reconcileHmrState(runtime.state, defaults));
    runtime.definition = definition as unknown as StorePluginDefinition;
    this.rebuildDefinitionProperties(runtime);
    this.publish(runtime, {
      type: 'hmr',
      metadata: this.resolveMetadata(metadata),
      before,
      after: snapshotState(runtime.state),
      status: 'fulfilled',
    });
    return runtime.store as Store<Id, State, Getters, Actions>;
  }

  dehydrate(): StoreSnapshot {
    this.assertActive();
    const stores: Record<string, Readonly<Record<string, JsonValue>>> = Object.create(null);
    for (const [id, runtime] of this.runtimes) stores[id] = snapshotState(runtime.state);
    for (const [id, state] of this.pendingState) if (!(id in stores)) stores[id] = state;
    return { version: 1, stores };
  }

  serialize(): string {
    return JSON.stringify(this.dehydrate())
      .replaceAll('&', '\\u0026')
      .replaceAll('<', '\\u003c')
      .replaceAll('>', '\\u003e')
      .replaceAll('\u2028', '\\u2028')
      .replaceAll('\u2029', '\\u2029');
  }

  hydrate(snapshot: StoreSnapshot): void {
    this.assertActive();
    assertSnapshot(snapshot);
    for (const [id, state] of Object.entries(snapshot.stores)) {
      const runtime = this.runtimes.get(id);
      if (runtime) this.patchRuntime(runtime, state, 'hydrate');
      else this.pendingState.set(id, state);
    }
  }

  deserialize(serialized: string): void {
    this.hydrate(JSON.parse(serialized) as StoreSnapshot);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const runtime of [...this.runtimes.values()]) this.disposeRuntime(runtime);
    this.runtimes.clear();
    this.pendingState.clear();
    this.transactionSubscribers.clear();
    this.metadataStack.length = 0;
  }

  private defineStoreProperties(runtime: StoreRuntime): void {
    Object.defineProperties(runtime.store, {
      $id: { enumerable: false, value: runtime.definition.id },
      $state: { enumerable: false, get: () => runtime.state },
      $extensions: {
        enumerable: false,
        value: Object.create(null) as Record<string, unknown>,
      },
      $patch: {
        enumerable: false,
        value: (patch: Partial<StateTree> | ((state: StateTree) => void), metadata = {}) => {
          this.patchRuntime(
            runtime,
            patch,
            typeof patch === 'function' ? 'patch-function' : 'patch-object',
            metadata,
          );
        },
      },
      $reset: {
        enumerable: false,
        value: (metadata: StoreTransactionMetadata = {}) => {
          const defaults = runtime.definition.options.state();
          this.mutate(runtime, 'reset', metadata, () => replaceState(runtime.state, defaults));
        },
      },
      $subscribe: {
        enumerable: false,
        value: (callback: StoreSubscription) => {
          this.assertRuntimeActive(runtime);
          runtime.subscribers.add(callback);
          return () => runtime.subscribers.delete(callback);
        },
      },
      $onAction: {
        enumerable: false,
        value: (callback: StoreActionSubscription) => {
          this.assertRuntimeActive(runtime);
          runtime.actionSubscribers.add(callback);
          return () => runtime.actionSubscribers.delete(callback);
        },
      },
      $dispose: { enumerable: false, value: () => this.disposeRuntime(runtime) },
    });
  }

  private rebuildDefinitionProperties(runtime: StoreRuntime): void {
    runtime.scope.stop();
    runtime.scope = effectScope({ detached: true });
    for (const key of runtime.stateKeys) Reflect.deleteProperty(runtime.store, key);
    for (const key of runtime.getterKeys) Reflect.deleteProperty(runtime.store, key);
    for (const key of runtime.actionKeys) Reflect.deleteProperty(runtime.store, key);
    runtime.stateKeys.clear();
    runtime.getterKeys.clear();
    runtime.actionKeys.clear();

    for (const key of Object.keys(runtime.state)) {
      assertPublicKey(key, runtime.definition.id);
      runtime.stateKeys.add(key);
      Object.defineProperty(runtime.store, key, {
        enumerable: true,
        configurable: true,
        get: () => runtime.state[key],
        set: (value) => {
          this.assertRuntimeActive(runtime);
          runtime.state[key] = value;
        },
      });
    }

    runtime.scope.run(() => {
      const getterFactory = runtime.definition.options.getters;
      const getterValues = getterFactory?.(runtime.state as DeepReadonly<StateTree>) ?? {};
      assertDefinitionRecord(getterValues, runtime.definition.id, 'getters');
      for (const key of Object.keys(getterValues)) {
        assertDefinitionKey(key, runtime);
        const value = computed(() => getterFactory!(runtime.state as DeepReadonly<StateTree>)[key]);
        runtime.getterKeys.add(key);
        Object.defineProperty(runtime.store, key, {
          enumerable: true,
          configurable: true,
          get: () => value.value,
        });
      }
    });

    const actionValues = runtime.definition.options.actions?.(runtime.store) ?? {};
    assertDefinitionRecord(actionValues, runtime.definition.id, 'actions');
    for (const [key, action] of Object.entries(actionValues)) {
      assertDefinitionKey(key, runtime);
      if (typeof action !== 'function') {
        throw new TypeError(`Store "${runtime.definition.id}" action "${key}" must be a function.`);
      }
      runtime.actionKeys.add(key);
      Object.defineProperty(runtime.store, key, {
        enumerable: false,
        configurable: true,
        value: (...args: unknown[]) => this.runAction(runtime, key, action, args),
      });
    }
  }

  private runAction(
    runtime: StoreRuntime,
    name: string,
    action: (...args: never[]) => unknown,
    args: unknown[],
  ): unknown {
    this.assertRuntimeActive(runtime);
    const before = snapshotState(runtime.state);
    const metadata = this.resolveMetadata();
    const afterCallbacks: Array<(result: unknown) => void> = [];
    const errorCallbacks: Array<(error: unknown) => void> = [];
    const context: StoreActionContext = {
      storeId: runtime.definition.id,
      name,
      args,
      after: (callback) => afterCallbacks.push(callback),
      onError: (callback) => errorCallbacks.push(callback),
    };
    for (const subscriber of [...runtime.actionSubscribers]) subscriber(context);

    let result: unknown;
    try {
      result = batch(() => action.apply(runtime.store, args as never[]));
    } catch (error) {
      for (const callback of errorCallbacks) callback(error);
      this.publish(runtime, {
        type: 'action', name, before, after: snapshotState(runtime.state),
        metadata, status: 'rejected', error,
      });
      throw error;
    }

    if (isPromiseLike(result)) {
      return Promise.resolve(result).then(
        (value) => {
          for (const callback of afterCallbacks) callback(value);
          this.publish(runtime, {
            type: 'action', name, before, after: snapshotState(runtime.state),
            metadata, status: 'fulfilled',
          });
          return value;
        },
        (error: unknown) => {
          for (const callback of errorCallbacks) callback(error);
          this.publish(runtime, {
            type: 'action', name, before, after: snapshotState(runtime.state),
            metadata, status: 'rejected', error,
          });
          throw error;
        },
      );
    }

    for (const callback of afterCallbacks) callback(result);
    this.publish(runtime, {
      type: 'action', name, before, after: snapshotState(runtime.state),
      metadata, status: 'fulfilled',
    });
    return result;
  }

  private patchRuntime(
    runtime: StoreRuntime,
    patch: Partial<StateTree> | Readonly<Record<string, JsonValue>> | ((state: StateTree) => void),
    type: Extract<StoreTransactionType, 'hydrate' | 'patch-function' | 'patch-object'>,
    metadata: StoreTransactionMetadata = {},
  ): void {
    this.mutate(runtime, type, metadata, () => {
      if (typeof patch === 'function') patch(runtime.state);
      else patchState(runtime.state, patch);
    });
  }

  private mutate(
    runtime: StoreRuntime,
    type: Exclude<StoreTransactionType, 'action' | 'hmr'>,
    metadata: StoreTransactionMetadata,
    mutation: () => void,
  ): void {
    this.assertRuntimeActive(runtime);
    const before = snapshotState(runtime.state);
    batch(mutation);
    this.publish(runtime, {
      type,
      before,
      after: snapshotState(runtime.state),
      metadata: this.resolveMetadata(metadata),
      status: 'fulfilled',
    });
  }

  private publish(
    runtime: StoreRuntime,
    transaction: Omit<StoreTransaction, 'id' | 'storeId' | 'timestamp'>,
  ): void {
    const record: StoreTransaction = Object.freeze({
      id: ++this.transactionSequence,
      storeId: runtime.definition.id,
      timestamp: Date.now(),
      ...transaction,
    });
    for (const subscriber of [...runtime.subscribers]) subscriber(record);
    for (const subscriber of [...this.transactionSubscribers]) subscriber(record);
  }

  private resolveMetadata(metadata: StoreTransactionMetadata = {}): StoreTransactionMetadata {
    return Object.freeze(Object.assign(Object.create(null), ...this.metadataStack, metadata));
  }

  private applyPlugins(runtime: StoreRuntime): void {
    for (const plugin of this.plugins) this.applyPlugin(runtime, plugin);
  }

  private applyPlugin(runtime: StoreRuntime, plugin: StorePlugin): void {
    const result = plugin({
      manager: this,
      definition: runtime.definition,
      store: runtime.store,
    });
    if (typeof result === 'function') runtime.pluginCleanups.push(result);
    else if (result) Object.assign(runtime.store.$extensions, result);
  }

  private disposeRuntime(runtime: StoreRuntime): void {
    if (runtime.disposed) return;
    runtime.disposed = true;
    runtime.scope.stop();
    for (let index = runtime.pluginCleanups.length - 1; index >= 0; index -= 1) {
      runtime.pluginCleanups[index]?.();
    }
    runtime.pluginCleanups.length = 0;
    runtime.subscribers.clear();
    runtime.actionSubscribers.clear();
    this.runtimes.delete(runtime.definition.id);
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('The store manager has been disposed.');
  }

  private assertRuntimeActive(runtime: StoreRuntime): void {
    this.assertActive();
    if (runtime.disposed) throw new Error(`Store "${runtime.definition.id}" has been disposed.`);
  }
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface PersistenceChannel {
  postMessage(message: unknown): void;
  addEventListener(listener: (message: unknown) => void): void;
  removeEventListener(listener: (message: unknown) => void): void;
  close?(): void;
}

export interface PersistenceChannelFactory {
  create(name: string): PersistenceChannel;
}

export function createMemoryStorage(initial: Readonly<Record<string, string>> = {}): StorageLike {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

export function createWebStorageAdapter(kind: 'local' | 'session', storage?: StorageLike): StorageLike {
  if (storage) return storage;
  const candidate = (globalThis as unknown as Record<string, unknown>)[`${kind}Storage`];
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`The ${kind}Storage API is unavailable in this environment.`);
  }
  return candidate as StorageLike;
}

export function createLocalStorageAdapter(storage?: StorageLike): StorageLike {
  return createWebStorageAdapter('local', storage);
}

export function createSessionStorageAdapter(storage?: StorageLike): StorageLike {
  return createWebStorageAdapter('session', storage);
}

export function createBroadcastChannelFactory(
  constructor?: new (name: string) => {
    postMessage(message: unknown): void;
    addEventListener(type: 'message', listener: (event: { readonly data: unknown }) => void): void;
    removeEventListener(type: 'message', listener: (event: { readonly data: unknown }) => void): void;
    close?(): void;
  },
): PersistenceChannelFactory {
  const Channel = constructor ?? (globalThis as unknown as { BroadcastChannel?: new (name: string) => {
    postMessage(message: unknown): void;
    addEventListener(type: 'message', listener: (event: { readonly data: unknown }) => void): void;
    removeEventListener(type: 'message', listener: (event: { readonly data: unknown }) => void): void;
    close?(): void;
  } }).BroadcastChannel;
  if (!Channel) throw new Error('The BroadcastChannel API is unavailable in this environment.');
  return {
    create(name) {
      const native = new Channel(name);
      const listeners = new Map<(message: unknown) => void, (event: { readonly data: unknown }) => void>();
      return {
        postMessage: (message) => native.postMessage(message),
        addEventListener(listener) {
          const wrapped = (event: { readonly data: unknown }) => listener(event.data);
          listeners.set(listener, wrapped);
          native.addEventListener('message', wrapped);
        },
        removeEventListener(listener) {
          const wrapped = listeners.get(listener);
          if (wrapped) native.removeEventListener('message', wrapped);
          listeners.delete(listener);
        },
        close: () => native.close?.(),
      };
    },
  };
}

export interface IndexedDbStorageOptions {
  readonly database?: string;
  readonly store?: string;
  readonly factory?: IndexedDbFactory;
}

export interface IndexedDbFactory {
  open(name: string, version?: number): IndexedDbOpenRequest;
}

interface IndexedDbOpenRequest {
  result: IndexedDbDatabase;
  error?: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onupgradeneeded: (() => void) | null;
}

interface IndexedDbDatabase {
  objectStoreNames: { contains(name: string): boolean };
  createObjectStore(name: string): void;
  transaction(name: string, mode: 'readonly' | 'readwrite'): IndexedDbTransaction;
  close(): void;
}

interface IndexedDbTransaction {
  objectStore(name: string): IndexedDbObjectStore;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
}

interface IndexedDbObjectStore {
  get(key: string): IndexedDbRequest;
  put(value: string, key: string): IndexedDbRequest;
  delete(key: string): IndexedDbRequest;
}

interface IndexedDbRequest {
  result: unknown;
  error?: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

/** Browser IndexedDB adapter kept behind the async persistence contract. */
export function createIndexedDbStorage(options: IndexedDbStorageOptions = {}): AsyncStorageLike {
  const factory = options.factory
    ?? (globalThis as unknown as { indexedDB?: IndexedDbFactory }).indexedDB;
  if (!factory) throw new Error('The IndexedDB API is unavailable in this environment.');
  const database = options.database ?? 'gluon';
  const store = options.store ?? 'persistence';
  let connection: Promise<IndexedDbDatabase> | undefined;
  const open = (): Promise<IndexedDbDatabase> => connection ??= new Promise((resolve, reject) => {
    const request = factory.open(database, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
  });
  const run = (mode: 'readonly' | 'readwrite', action: (objectStore: IndexedDbObjectStore) => IndexedDbRequest): Promise<unknown> =>
    open().then((db) => new Promise((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const request = action(transaction.objectStore(store));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
      transaction.onerror = () => reject(new Error('IndexedDB transaction failed.'));
      transaction.onabort = () => reject(new Error('IndexedDB transaction aborted.'));
    }));
  return {
    getItem: (key) => run('readonly', (objectStore) => objectStore.get(key)).then((value) => typeof value === 'string' ? value : null),
    setItem: (key, value) => run('readwrite', (objectStore) => objectStore.put(value, key)).then(() => undefined),
    removeItem: (key) => run('readwrite', (objectStore) => objectStore.delete(key)).then(() => undefined),
  };
}

/** Promise-based persistence adapter. The synchronous StorageLike contract is intentionally unchanged. */
export interface AsyncStorageLike {
  getItem(key: string, signal?: StoreAbortSignal): Promise<string | null>;
  setItem(key: string, value: string, signal?: StoreAbortSignal): Promise<void>;
  removeItem?(key: string, signal?: StoreAbortSignal): Promise<void>;
}

/** DOM-free subset accepted by async adapters, also compatible with AbortSignal. */
export interface StoreAbortSignal {
  readonly aborted: boolean;
  readonly reason?: unknown;
  addEventListener?(type: 'abort', listener: () => void, options?: { readonly once?: boolean }): void;
}

export type AsyncPersistenceStatus = 'idle' | 'hydrating' | 'ready' | 'failed';

export interface AsyncPersistenceLifecycle {
  readonly status: AsyncPersistenceStatus;
  readonly error: unknown;
  readonly ready: Promise<void>;
  dispose(): void;
}

export interface AsyncPersistencePluginOptions {
  readonly storage: AsyncStorageLike;
  readonly namespace?: string;
  readonly signal?: StoreAbortSignal;
  readonly onError?: (error: unknown, storeId: string) => void;
}

export interface AsyncPersistencePlugin extends StorePlugin {
  readonly lifecycle: AsyncPersistenceLifecycle;
}

export interface PersistencePluginOptions {
  readonly storage: StorageLike;
  readonly namespace?: string;
  readonly channel?: PersistenceChannelFactory;
  readonly onError?: (error: unknown, storeId: string, recovery?: PersistedStateErrorContext) => void;
}

export function createPersistencePlugin(options: PersistencePluginOptions): StorePlugin {
  return ({ definition, store }) => {
    const persist = definition.options.persist;
    if (!persist) return;
    const config = persist === true ? {} : persist;
    const key = config.key ?? `${options.namespace ?? 'gluon'}:${definition.id}`;
    const plan = normalizePersistencePlan(config);
    let status: PersistenceStatus = 'hydrating';
    let failure: unknown;
    let resolveReady!: () => void;
    const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
    const lifecycle: PersistenceLifecycle = {
      get status() { return status; },
      get error() { return failure; },
      ready,
      dispose() {
        if (status === 'hydrating') {
          status = 'failed';
          failure ??= new Error('Synchronous store persistence was disposed before hydration completed.');
          resolveReady();
        }
      },
    };
    (store.$extensions as Record<string, unknown>).persistence = lifecycle;
    const select = () => {
      const state = store.$state;
      if (!config.paths) return snapshotState(state);
      const selected: Record<string, JsonValue> = Object.create(null);
      for (const path of config.paths) {
        if (path in state) selected[path] = toJsonValue(state[path], new WeakSet());
      }
      return selected;
    };
    let lastRaw: string | null = null;
    let recoveryState: 'ready' | 'blocked' = 'ready';
    let applyingRemote = false;
    const source = `gluon-persistence-${++persistenceSourceSequence}`;
    let channel: PersistenceChannel | undefined;
    const channelMessage = (message: unknown): void => {
      if (applyingRemote || !message || typeof message !== 'object') return;
      const candidate = message as { readonly source?: unknown; readonly raw?: unknown };
      if (candidate.source === source || typeof candidate.raw !== 'string') return;
      try {
        const loaded = loadPersistedState(candidate.raw, plan, definition.id, config);
        if (!loaded.state) return;
        applyingRemote = true;
        store.$patch(resolvePersistedState(snapshotState(store.$state), loaded.state, 'persisted-wins'), {
          source: 'persistence-sync',
        });
      } catch (error) {
        options.onError?.(error, definition.id);
      } finally {
        applyingRemote = false;
      }
    };
    if (config.sync) {
      try {
        const hasNativeChannel = Boolean((globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel);
        if (options.channel || hasNativeChannel) {
          channel = (options.channel ?? createBroadcastChannelFactory()).create(key);
          channel.addEventListener(channelMessage);
        }
      } catch (error) {
        failure = error;
        status = 'failed';
        options.onError?.(error, definition.id);
      }
    }
    const recovery = createRecovery({
      key,
      storage: options.storage,
      store,
      select,
      version: plan.version,
      serialize: config.serialize,
      getRaw: () => lastRaw,
      setRaw: (raw) => {
        lastRaw = raw;
      },
      onRecover: () => {
        recoveryState = 'ready';
        failure = undefined;
        status = 'ready';
      },
    });

    try {
      lastRaw = options.storage.getItem(key);
      const loaded = loadPersistedState(lastRaw, plan, definition.id, config);
      if (loaded.state) {
        store.$patch(resolvePersistedState(snapshotState(store.$state), loaded.state, config.merge), { source: 'persistence' });
      }
      if (status !== 'failed') status = 'ready';
    } catch (error) {
      recoveryState = 'blocked';
      failure = error;
      status = 'failed';
      options.onError?.(error, definition.id, createRecoveryContext(error, {
        key,
        raw: lastRaw,
        targetVersion: plan.version,
        recovery,
      }, 'storage-read'));
    }
    resolveReady();

    const unsubscribe = store.$subscribe(() => {
      if (recoveryState === 'blocked' || applyingRemote || status === 'failed') return;
      try {
        const envelope = { version: plan.version, state: select() } satisfies PersistedStateEnvelope;
        const raw = config.serialize?.(envelope) ?? JSON.stringify(envelope);
        options.storage.setItem(key, raw);
        lastRaw = raw;
        channel?.postMessage({ source, raw });
      } catch (error) {
        recoveryState = 'blocked';
        failure = error;
        status = 'failed';
        options.onError?.(error, definition.id, createRecoveryContext(error, {
          key,
          raw: lastRaw,
          targetVersion: plan.version,
          recovery,
        }, 'storage-write'));
      }
    });
    return () => {
      unsubscribe();
      channel?.removeEventListener(channelMessage);
      channel?.close?.();
      lifecycle.dispose();
    };
  };
}

/**
 * Creates an application-local async persistence plugin. `use()` is synchronous:
 * stores expose their defaults while the lifecycle is `hydrating`; callers that
 * need restored state await `plugin.lifecycle.ready` before starting rendering,
 * routing, or SSR hydration.
 */
export function createAsyncPersistencePlugin(options: AsyncPersistencePluginOptions): AsyncPersistencePlugin {
  let status: AsyncPersistenceStatus = 'idle';
  let error: unknown;
  let disposed = false;
  let pending = 0;
  let resolveReady!: () => void;
  let ready = new Promise<void>((resolve) => { resolveReady = resolve; });
  let aborted = Boolean(options.signal?.aborted);
  const listeners = new Set<() => void>();
  const controller: StoreAbortSignal = {
    get aborted() { return aborted; },
    get reason() { return options.signal?.reason; },
    addEventListener(_type, listener) { listeners.add(listener); },
  };
  const abort = () => { aborted = true; for (const listener of listeners) listener(); listeners.clear(); };
  const abortError = (): Error => {
    const failure = new Error('Async store persistence was aborted.');
    failure.name = 'AbortError';
    return failure;
  };
  const settleFailure = (failure: unknown): void => {
    if (status === 'failed') return;
    status = 'failed';
    error = failure;
    resolveReady();
  };
  const beginCycle = (): void => {
    if (status !== 'ready') return;
    ready = new Promise<void>((resolve) => { resolveReady = resolve; });
    error = undefined;
  };
  if (options.signal) {
    if (options.signal.aborted) {
      aborted = true;
      settleFailure(abortError());
    } else options.signal.addEventListener?.('abort', () => {
      settleFailure(abortError());
      abort();
    }, { once: true });
  }
  const lifecycle: AsyncPersistenceLifecycle = {
    get status() { return status; },
    get error() { return error; },
    get ready() { return ready; },
    dispose() {
      if (disposed) return;
      disposed = true;
      abort();
      settleFailure(abortError());
    },
  };
  const finish = () => {
    pending -= 1;
    if (pending === 0 && !disposed && status !== 'failed') {
      status = 'ready';
      resolveReady();
    } else if (pending === 0) resolveReady();
  };
  const plugin = (({ definition, store }: StorePluginContext) => {
    const persist = definition.options.persist;
    if (!persist || disposed || aborted || status === 'failed') return;
    if (pending === 0) beginCycle();
    const config = persist === true ? {} : persist;
    (store.$extensions as Record<string, unknown>).persistence = lifecycle;
    const key = config.key ?? `${options.namespace ?? 'gluon'}:${definition.id}`;
    const plan = normalizePersistencePlan(config);
    let revision = 0;
    let hydrated = false;
    let writeQueue = Promise.resolve();
    let disposedStore = false;
    pending += 1;
    status = 'hydrating';
    const report = (failure: unknown) => {
      if (disposed || status === 'failed' || (typeof failure === 'object' && failure !== null && 'name' in failure && failure.name === 'AbortError')) return;
      settleFailure(failure);
      options.onError?.(failure, definition.id);
    };
    const unsubscribe = store.$subscribe(() => {
      revision += 1;
      if (!hydrated || disposed || disposedStore || status === 'failed') return;
      const envelope = { version: plan.version, state: selectPersistedState(store, config.paths) } satisfies PersistedStateEnvelope;
      const raw = config.serialize?.(envelope) ?? JSON.stringify(envelope);
      writeQueue = writeQueue.then(() => {
        if (disposed || disposedStore || status === 'failed') return;
        return options.storage.setItem(key, raw, controller);
      }).catch(report);
    });
    const readRevision = revision;
    const task = options.storage.getItem(key, controller).then((raw) => {
      if (disposed || disposedStore) return;
      const loaded = loadPersistedState(raw, plan, definition.id, config);
      const stale = readRevision !== revision;
      if (!stale && loaded.state) {
        store.$patch(resolvePersistedState(snapshotState(store.$state), loaded.state, config.merge), { source: 'async-persistence' });
      }
      hydrated = true;
      if (stale && !disposed && status !== 'failed') {
        const envelope = { version: plan.version, state: selectPersistedState(store, config.paths) } satisfies PersistedStateEnvelope;
        const current = config.serialize?.(envelope) ?? JSON.stringify(envelope);
        writeQueue = writeQueue.then(() => {
          if (disposed || disposedStore || status === 'failed') return;
          return options.storage.setItem(key, current, controller);
        }).catch(report);
      }
    }).catch(report).finally(finish);
    return () => {
      disposedStore = true;
      unsubscribe();
      void task;
    };
  }) as AsyncPersistencePlugin;
  Object.defineProperty(plugin, 'lifecycle', { value: lifecycle, enumerable: true });
  Promise.resolve().then(() => { if (pending === 0 && !disposed && status === 'idle') { status = 'ready'; resolveReady(); } });
  return plugin;
}

function selectPersistedState(store: StorePluginStore, paths?: readonly string[]): Readonly<Record<string, JsonValue>> {
  if (!paths) return snapshotState(store.$state);
  const selected: Record<string, JsonValue> = Object.create(null);
  for (const path of paths) if (path in store.$state) selected[path] = toJsonValue(store.$state[path], new WeakSet());
  return selected;
}

function resolvePersistedState(
  serverState: PersistedStateRecord,
  persistedState: PersistedStateRecord,
  policy: PersistMergePolicy<StateTree> | undefined,
): PersistedStateRecord {
  if (typeof policy === 'function') return policy(serverState, persistedState);
  if (policy === 'server-wins') return { ...persistedState, ...serverState };
  if (policy === 'merge') return { ...serverState, ...persistedState };
  // Preserve the historical persistence behavior when no policy is supplied.
  return { ...serverState, ...persistedState };
}

function normalizePersistencePlan<State extends StateTree>(config: PersistOptions<State>): PersistencePlan {
  const version = config.version ?? 1;
  if (!Number.isInteger(version) || version < 1) throw new TypeError('Persisted state version must be a positive integer.');
  const steps = [...(config.migrations ?? [])];
  for (const step of steps) {
    if (!Number.isInteger(step.from) || !Number.isInteger(step.to) || step.from < 0 || step.to <= step.from || typeof step.migrate !== 'function') {
      throw new TypeError('Persisted state migrations must define increasing integer from/to versions.');
    }
    if (step.to !== step.from + 1) {
      throw new TypeError('Persisted state migrations must advance one version at a time.');
    }
  }
  const ordered = [...steps].sort((left, right) => left.from - right.from);
  for (let index = 0; index < ordered.length; index += 1) {
    const step = ordered[index]!;
    const ambiguous = ordered.find((other, otherIndex) => otherIndex !== index && (other.from === step.from || other.to === step.to));
    if (ambiguous) throw new TypeError('Persisted state migrations must not duplicate from/to versions.');
    const previous = ordered[index - 1];
    if (previous && previous.to !== step.from) {
      throw new TypeError('Persisted state migrations must be contiguous.');
    }
    if (step.to > version) throw new TypeError('Persisted state migrations cannot target future versions.');
  }
  if (ordered.length > 0 && ordered.at(-1)!.to !== version) {
    throw new TypeError('Persisted state migrations must end at the configured version.');
  }
  if (config.legacy) {
    if (!Number.isInteger(config.legacy.to) || config.legacy.to < 0 || config.legacy.to > version || typeof config.legacy.migrate !== 'function') {
      throw new TypeError('Persisted legacy migrations require an integer output version at or below the configured version.');
    }
    if (config.legacy.to < version && !ordered.some((step) => step.from === config.legacy!.to)) {
      throw new TypeError('Persisted legacy migration output requires a contiguous step to the configured version.');
    }
  }
  return { version, steps: ordered, legacy: config.legacy };
}

function loadPersistedState(
  saved: string | null,
  plan: PersistencePlan,
  storeId: string,
  config: { readonly deserialize?: (raw: string) => unknown } = {},
): { readonly state: PersistedJsonStateRecord | null; readonly version?: number } {
  if (saved === null) return { state: null };
  let parsed: unknown;
  try {
    parsed = config.deserialize?.(saved) ?? JSON.parse(saved);
  } catch (error) {
    throw new PersistenceFailure('corrupt-json', saved, plan.version, storeId, error);
  }
  if (isEnvelopeCandidate(parsed)) {
    if (!isPersistedEnvelope(parsed)) {
      throw new PersistenceFailure('corrupt-envelope', saved, plan.version, storeId, new TypeError('Persisted state envelope requires a non-negative integer version and plain-object state.'));
    }
    const state = assertPersistedStateRecord(parsed.state, plan.version, storeId, 'corrupt-envelope');
    return migratePersistedState(state, parsed.version, saved, plan, storeId);
  }
  if (isPlainRecord(parsed)) {
    if (!plan.legacy) {
      throw new PersistenceFailure('legacy', saved, plan.version, storeId, new TypeError('Legacy persisted state requires an explicit legacy migration policy.'));
    }
    const legacyState = assertPersistedStateRecord(parsed, plan.version, storeId, 'corrupt-envelope');
    let migrated: PersistedStateRecord;
    try {
      migrated = plan.legacy.migrate(legacyState);
    } catch (error) {
      throw new PersistenceFailure('migration-throw', saved, plan.version, storeId, error, plan.legacy.to);
    }
    const state = assertPersistedStateRecord(migrated, plan.version, storeId, 'migration-invalid-output');
    return migratePersistedState(state, plan.legacy.to, saved, plan, storeId);
  }
  throw new PersistenceFailure('corrupt-envelope', saved, plan.version, storeId, new TypeError('Persisted store state must be a plain object or versioned envelope.'));
}

function migratePersistedState(
  initialState: PersistedStateRecord,
  initialVersion: number,
  raw: string,
  plan: PersistencePlan,
  storeId: string,
): { readonly state: PersistedJsonStateRecord; readonly version: number } {
  if (initialVersion > plan.version) {
    throw new PersistenceFailure('future', raw, plan.version, storeId, new TypeError('Persisted state version is newer than the configured store version.'), initialVersion);
  }
  let state = assertPersistedStateRecord(initialState, plan.version, storeId, 'migration-invalid-output');
  let version = initialVersion;
  while (version < plan.version) {
    const step = plan.steps.find((candidate) => candidate.from === version);
    if (!step) {
      throw new PersistenceFailure('migration-missing', raw, plan.version, storeId, new TypeError(`Missing persisted migration step from version ${version}.`), version);
    }
    let output: PersistedStateRecord;
    try {
      output = step.migrate(state);
    } catch (error) {
      throw new PersistenceFailure('migration-throw', raw, plan.version, storeId, error, version);
    }
    state = assertPersistedStateRecord(output, plan.version, storeId, 'migration-invalid-output');
    version = step.to;
  }
  return { state, version };
}

function createRecovery(options: {
  readonly key: string;
  readonly storage: StorageLike;
  readonly store: StorePluginStore;
  readonly select: () => Readonly<Record<string, JsonValue>>;
  readonly version: number;
  readonly serialize?: (envelope: PersistedStateEnvelope) => string;
  readonly getRaw: () => string | null;
  readonly setRaw: (raw: string | null) => void;
  readonly onRecover: () => void;
}): PersistedStateRecovery {
  const removePersisted = (): void => {
    if (!options.storage.removeItem) {
      throw new Error('Persistence recovery requires StorageLike.removeItem().');
    }
    options.storage.removeItem(options.key);
    options.setRaw(null);
  };
  return {
    key: options.key,
    reset() {
      options.store.$reset({ source: 'persistence-recovery', recovery: 'reset' });
      const envelope = {
        version: options.version,
        state: options.select(),
      } satisfies PersistedStateEnvelope;
      const raw = options.serialize?.(envelope) ?? JSON.stringify(envelope);
      options.storage.setItem(options.key, raw);
      options.setRaw(raw);
      options.onRecover();
    },
    remove() {
      removePersisted();
      options.onRecover();
    },
    quarantine() {
      const quarantineKey = `${options.key}:quarantine`;
      options.storage.setItem(quarantineKey, options.getRaw() ?? '');
      removePersisted();
      options.onRecover();
    },
  };
}

function createRecoveryContext(error: unknown, options: {
  readonly key: string;
  readonly raw: string | null;
  readonly targetVersion: number;
  readonly recovery: PersistedStateRecovery;
}, fallbackKind: PersistedStateErrorContext['kind']): PersistedStateErrorContext {
  const kind = error instanceof PersistenceFailure ? error.kind : fallbackKind;
  return {
    key: options.key,
    raw: options.raw,
    kind,
    targetVersion: options.targetVersion,
    version: error instanceof PersistenceFailure ? error.version : undefined,
    recovery: options.recovery,
  };
}

class PersistenceFailure extends TypeError {
  constructor(
    readonly kind: PersistedStateErrorContext['kind'],
    readonly raw: string | null,
    readonly targetVersion: number,
    readonly storeId: string,
    cause: unknown,
    readonly version?: number,
  ) {
    super(`Persisted state for store "${storeId}" is ${kind}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'PersistenceFailure';
  }
}

function isEnvelopeCandidate(value: unknown): value is Record<string, unknown> {
  return isPlainRecord(value)
    && Object.prototype.hasOwnProperty.call(value, 'version')
    && Object.prototype.hasOwnProperty.call(value, 'state');
}

function isPersistedEnvelope(value: unknown): value is PersistedStateEnvelope {
  return isEnvelopeCandidate(value)
    && typeof value.version === 'number'
    && Number.isInteger(value.version)
    && value.version >= 0
    && isPlainRecord(value.state);
}

function assertPersistedStateRecord(
  value: unknown,
  targetVersion: number,
  storeId: string,
  kind: PersistedStateErrorContext['kind'],
): PersistedJsonStateRecord {
  if (!isPlainRecord(value)) throw new PersistenceFailure(kind, null, targetVersion, storeId, new TypeError('Persisted state must be a plain object.'));
  try {
    const normalized = toJsonValue(value, new WeakSet());
    if (!isPlainRecord(normalized)) throw new TypeError('Persisted state must be a plain object.');
    return normalized as PersistedJsonStateRecord;
  } catch (error) {
    if (error instanceof PersistenceFailure) throw error;
    throw new PersistenceFailure(kind, null, targetVersion, storeId, error);
  }
}

function snapshotState(state: StateTree): Readonly<Record<string, JsonValue>> {
  const snapshot: Record<string, JsonValue> = Object.create(null);
  const seen = new WeakSet<object>();
  for (const [key, value] of Object.entries(toRaw(state))) {
    assertSafeKey(key);
    snapshot[key] = toJsonValue(value, seen);
  }
  return Object.freeze(snapshot);
}

function toJsonValue(value: unknown, seen: WeakSet<object>): JsonValue {
  const raw = typeof value === 'object' && value !== null ? toRaw(value) : value;
  if (raw === null || typeof raw === 'string' || typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) throw new TypeError('Store state cannot serialize non-finite numbers.');
    return raw;
  }
  if (typeof raw !== 'object') {
    throw new TypeError(`Store state cannot serialize ${typeof raw} values.`);
  }
  if (seen.has(raw)) throw new TypeError('Store state cannot contain circular references.');
  seen.add(raw);
  try {
    if (Array.isArray(raw)) return raw.map((entry) => toJsonValue(entry, seen));
    if (!isPlainRecord(raw)) throw new TypeError('Store state can serialize only plain objects and arrays.');
    const result: Record<string, JsonValue> = Object.create(null);
    for (const [key, entry] of Object.entries(raw)) {
      assertSafeKey(key);
      result[key] = toJsonValue(entry, seen);
    }
    return result;
  } finally {
    seen.delete(raw);
  }
}

function patchState(target: StateTree, patch: Readonly<Record<string, unknown>>): void {
  for (const [key, value] of Object.entries(patch)) {
    assertSafeKey(key);
    if (Object.prototype.hasOwnProperty.call(target, key)) target[key] = cloneJsonCompatible(value);
  }
}

function replaceState(target: StateTree, replacement: StateTree): void {
  for (const key of Object.keys(target)) if (!(key in replacement)) Reflect.deleteProperty(target, key);
  for (const [key, value] of Object.entries(replacement)) {
    assertSafeKey(key);
    target[key] = value;
  }
}

function reconcileHmrState(target: StateTree, defaults: StateTree): void {
  for (const key of Object.keys(target)) if (!(key in defaults)) Reflect.deleteProperty(target, key);
  for (const [key, defaultValue] of Object.entries(defaults)) {
    assertSafeKey(key);
    if (!(key in target) || !isCompatibleValue(target[key], defaultValue)) target[key] = defaultValue;
  }
}

function isCompatibleValue(current: unknown, replacement: unknown): boolean {
  if (current === null || replacement === null) return current === replacement;
  if (Array.isArray(current) || Array.isArray(replacement)) {
    return Array.isArray(current) && Array.isArray(replacement);
  }
  if (isPlainRecord(current) || isPlainRecord(replacement)) {
    return isPlainRecord(current) && isPlainRecord(replacement);
  }
  return typeof current === typeof replacement;
}

function cloneJsonCompatible(value: unknown): unknown {
  return JSON.parse(JSON.stringify(toJsonValue(value, new WeakSet()))) as unknown;
}

function assertSnapshot(snapshot: StoreSnapshot): void {
  if (!isPlainRecord(snapshot) || snapshot.version !== 1 || !isPlainRecord(snapshot.stores)) {
    throw new TypeError('Invalid Gluon store snapshot.');
  }
  for (const [id, state] of Object.entries(snapshot.stores)) {
    assertSafeKey(id);
    if (!isPlainRecord(state)) throw new TypeError(`Invalid state snapshot for store "${id}".`);
    for (const key of Object.keys(state)) assertSafeKey(key);
    toJsonValue(state, new WeakSet());
  }
}

function isStoreSnapshot(
  value: StoreSnapshot | Readonly<Record<string, Readonly<Record<string, JsonValue>>>>,
): value is StoreSnapshot {
  const candidate = value as { readonly version?: unknown; readonly stores?: unknown };
  return isPlainRecord(value) && candidate.version === 1 && isPlainRecord(candidate.stores);
}

function assertStateTree(state: unknown, id: string): asserts state is StateTree {
  if (!isPlainRecord(state)) throw new TypeError(`Store "${id}" state must be a plain object.`);
  for (const key of Object.keys(state)) assertPublicKey(key, id);
}

function assertDefinitionRecord(
  value: unknown,
  id: string,
  source: 'actions' | 'getters',
): asserts value is Record<string, unknown> {
  if (!isPlainRecord(value)) throw new TypeError(`Store "${id}" ${source} must return a plain object.`);
}

function assertDefinitionKey(key: string, runtime: StoreRuntime): void {
  assertPublicKey(key, runtime.definition.id);
  if (runtime.stateKeys.has(key) || runtime.getterKeys.has(key) || runtime.actionKeys.has(key)) {
    throw new Error(`Store "${runtime.definition.id}" defines duplicate key "${key}".`);
  }
}

function assertPublicKey(key: string, id: string): void {
  assertSafeKey(key);
  if (key.startsWith('$')) throw new Error(`Store "${id}" cannot define reserved key "${key}".`);
}

function assertSafeKey(key: string): void {
  if (unsafeKeys.has(key)) throw new TypeError(`Unsafe store state key "${key}".`);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
    ? typeof (value as PromiseLike<unknown>).then === 'function'
    : false;
}
