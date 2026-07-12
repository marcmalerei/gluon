import { defineStore, type StoreManager } from '@gluonjs/store';
import type { Product } from './data.js';
import {
  createDefaultProductConfiguration,
  type ProductConfiguration,
} from './product-configuration.js';

export type { ProductConfiguration } from './product-configuration.js';

export interface BagLine {
  readonly key: string;
  readonly product: Product;
  readonly configuration: ProductConfiguration;
  quantity: number;
}

export interface ShopOrder {
  readonly id: string;
  readonly lines: readonly BagLine[];
  readonly total: number;
  readonly email: string;
}

export const shopStoreDefinition = defineStore('shop', () => ({
  bagOpen: false,
  menuOpen: false,
  searchOpen: false,
  searchQuery: '',
  configuration: createDefaultProductConfiguration(),
  bag: [] as BagLine[],
  checkout: { email: '', name: '', address: '', city: '', postalCode: '' },
  order: null as ShopOrder | null,
}), {
  getters: (state) => ({
    bagCount: state.bag.reduce((total, line) => total + line.quantity, 0),
    bagTotal: state.bag.reduce((total, line) => total + line.product.price * line.quantity, 0),
  }),
  actions: (store) => ({
    configure<Key extends keyof ProductConfiguration>(
      key: Key,
      value: ProductConfiguration[Key],
    ): void {
      store.configuration[key] = value;
    },
    addToBag(product: Product): void {
      const configuration = { ...store.configuration };
      const key = [
        product.slug,
        configuration.finish,
        configuration.temperature,
        configuration.cable,
      ].join(':');
      const existing = store.bag.find((line) => line.key === key);
      if (existing) existing.quantity += 1;
      else store.bag.push({ key, product, configuration, quantity: 1 });
      store.bagOpen = true;
    },
    changeQuantity(key: string, change: number): void {
      const line = store.bag.find((entry) => entry.key === key);
      if (!line) return;
      line.quantity += change;
      if (line.quantity <= 0) this.removeFromBag(key);
    },
    removeFromBag(key: string): void {
      const index = store.bag.findIndex((line) => line.key === key);
      if (index >= 0) store.bag.splice(index, 1);
    },
    updateCheckout(field: keyof typeof store.checkout, value: string): void {
      store.checkout[field] = value;
    },
    placeOrder(): ShopOrder {
      if (store.bag.length === 0) throw new Error('An order requires at least one bag line.');
      const order: ShopOrder = {
        id: `GG-${String(store.bagCount).padStart(2, '0')}-${String(store.bagTotal)}`,
        lines: store.bag.map((line) => ({ ...line, configuration: { ...line.configuration } })),
        total: store.bagTotal,
        email: store.checkout.email,
      };
      store.order = order;
      store.bag = [];
      store.bagOpen = false;
      return order;
    },
  }),
  persist: { paths: ['bag'] },
});

export function createShopStore(manager: StoreManager) {
  return shopStoreDefinition.use(manager);
}

export type ShopStore = ReturnType<typeof createShopStore>;
