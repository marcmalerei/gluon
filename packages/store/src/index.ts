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
          runtime.subscribers.add(callback);
          return () => runtime.subscribers.delete(callback);
        },
      },
      $onAction: {
        enumerable: false,
        value: (callback: StoreActionSubscription) => {
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
        set: (value) => { runtime.state[key] = value; },
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

export interface PersistencePluginOptions {
  readonly storage: StorageLike;
  readonly namespace?: string;
  readonly onError?: (error: unknown, storeId: string) => void;
}

export function createPersistencePlugin(options: PersistencePluginOptions): StorePlugin {
  return ({ definition, store }) => {
    const persist = definition.options.persist;
    if (!persist) return;
    const config = persist === true ? {} : persist;
    const key = config.key ?? `${options.namespace ?? 'gluon'}:${definition.id}`;
    const select = () => {
      const state = store.$state;
      if (!config.paths) return snapshotState(state);
      const selected: Record<string, JsonValue> = Object.create(null);
      for (const path of config.paths) {
        if (path in state) selected[path] = toJsonValue(state[path], new WeakSet());
      }
      return selected;
    };

    try {
      const saved = options.storage.getItem(key);
      if (saved) store.$patch(parseStateRecord(saved), { source: 'persistence' });
    } catch (error) {
      options.onError?.(error, definition.id);
    }

    return store.$subscribe(() => {
      try {
        options.storage.setItem(key, JSON.stringify(select()));
      } catch (error) {
        options.onError?.(error, definition.id);
      }
    });
  };
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

function parseStateRecord(serialized: string): Readonly<Record<string, JsonValue>> {
  const value = JSON.parse(serialized) as unknown;
  if (!isPlainRecord(value)) throw new TypeError('Persisted store state must be a plain object.');
  for (const key of Object.keys(value)) assertSafeKey(key);
  return value as Readonly<Record<string, JsonValue>>;
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
