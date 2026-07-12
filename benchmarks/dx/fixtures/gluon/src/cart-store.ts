import { defineStore } from '@gluonjs/store';

const persistenceKey = 'dx-gluon-cart-v1';
type CartState = { quantity: number; email: string };
function persistState(state: CartState) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(persistenceKey, JSON.stringify(state));
}

export const useCartStore = defineStore({
  id: 'cart',
  state: () => ({ quantity: 1, email: '' }),
  actions: (state) => ({
    setQuantity(quantity: number) {
      state.quantity = quantity;
      persistState(state);
    },
    setEmail(email: string) {
      state.email = email;
      persistState(state);
    },
    persist() {
      persistState(state);
    },
    hydrate() {
      if (typeof localStorage === 'undefined') return;
      const saved = localStorage.getItem(persistenceKey);
      if (saved) Object.assign(state, JSON.parse(saved) as { quantity: number; email: string });
    },
  }),
});

export type CartStore = ReturnType<typeof useCartStore.use>;
