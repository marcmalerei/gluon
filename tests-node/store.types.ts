import {
  createStoreManager,
  createTestingStoreManager,
  createAsyncPersistencePlugin,
  defineStore,
  type PersistedStateEnvelope,
  type StoreTransaction,
} from '../packages/store/dist/index.js';

const manager = createStoreManager();
const asyncPlugin = createAsyncPersistencePlugin({
  storage: {
    async getItem(_key, _signal) { return null; },
    async setItem(_key, _value, _signal) {},
  },
});
const asyncStatus: 'idle' | 'hydrating' | 'ready' | 'failed' = asyncPlugin.lifecycle.status;
void asyncStatus;
const useCounter = defineStore('counter', () => ({ count: 1, label: 'ready' }), {
  getters: (state) => ({
    doubled: state.count * 2,
    summary: `${state.label}:${state.count * 2}`,
  }),
  actions: (store) => ({
    increment(amount: number) {
      store.count += amount;
      return store.count;
    },
  }),
  persist: { paths: ['count'] },
});

const counter = useCounter.use(manager);
const count: number = counter.count;
const doubled: number = counter.doubled;
const result: number = counter.increment(2);
counter.$patch({ label: 'changed' }, { source: 'type-test' });
counter.$subscribe((transaction: StoreTransaction) => transaction.after);
manager.hotUpdate(useCounter);
manager.hydrate(manager.dehydrate());
createTestingStoreManager({ initialState: manager.dehydrate() });
const simple = defineStore({ id: 'simple', state: () => ({ ready: true }) }).use(manager);
const ready: boolean = simple.ready;
const envelope: PersistedStateEnvelope = { version: 1, state: { count: 1 } };
void envelope;
void count;
void doubled;
void result;
void ready;

// @ts-expect-error actions preserve their argument types
counter.increment('2');
// @ts-expect-error state properties preserve their inferred types
counter.count = 'invalid';
// @ts-expect-error computed getters are readonly
counter.doubled = 4;
// @ts-expect-error persistence paths must name state keys
defineStore({ id: 'invalid-path', state: () => ({ count: 1 }), persist: { paths: ['missing'] } });
defineStore({
  id: 'migrated',
  state: () => ({ count: 1 }),
  persist: {
    version: 2,
    legacy: { to: 0, migrate: (state) => ({ count: Number(state.count ?? 0) }) },
    migrations: [
      { from: 0, to: 1, migrate: (state) => ({ count: Number(state.count ?? 0) }) },
      { from: 1, to: 2, migrate: (state) => ({ count: Number(state.count ?? 0), label: 'ready' }) },
    ],
  },
});
interface PersistedItemDto {
  readonly id: string;
  readonly label: string;
}
const typedMigration = defineStore('typed-migration', () => ({ items: [] as PersistedItemDto[] }), {
  actions: (store) => ({ add(item: PersistedItemDto) { store.items.push(item); } }),
  persist: {
    version: 1,
    legacy: { to: 1, migrate: () => ({ items: [{ id: 'one', label: 'Typed DTO' }] as PersistedItemDto[] }) },
  },
});
typedMigration.use(manager).add({ id: 'two', label: 'No index signature required' });
// @ts-expect-error stores do not expose undeclared state, getter, or action keys
simple.missing;
