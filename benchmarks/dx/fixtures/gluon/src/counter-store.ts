import { defineStore, type Store } from '@gluonjs/store';

export const useCounterStore = defineStore({
  id: 'counter',
  state: () => ({ count: 0 }),
  actions: (state) => ({
    increment() {
      state.count += 1;
    },
  }),
});

export type CounterStore = ReturnType<typeof useCounterStore.use>;
