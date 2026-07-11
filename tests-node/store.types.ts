import {
  createStoreManager,
  createTestingStoreManager,
  defineStore,
  type StoreTransaction,
} from '../packages/store/dist/index.js';

const manager = createStoreManager();
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
// @ts-expect-error stores do not expose undeclared state, getter, or action keys
simple.missing;
