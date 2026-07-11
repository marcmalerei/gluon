import { defineStore, type StoreManager } from '@gluonjs/store';
import type { Product } from './data.js';

export interface ProductConfiguration {
  finish: 'Graphite' | 'Cobalt' | 'Bone';
  temperature: 'Warm 2700K' | 'Clear 3200K';
  cable: '1.5 m' | '2.5 m';
}

export interface BagLine {
  readonly key: string;
  readonly product: Product;
  readonly configuration: ProductConfiguration;
  quantity: number;
}

const defaultConfiguration = (): ProductConfiguration => ({
  finish: 'Cobalt',
  temperature: 'Warm 2700K',
  cable: '1.5 m',
});

export const shopStoreDefinition = defineStore('shop', () => ({
  bagOpen: false,
  menuOpen: false,
  searchOpen: false,
  searchQuery: '',
  configuration: defaultConfiguration(),
  bag: [] as BagLine[],
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
  }),
  persist: { paths: ['bag'] },
});

export function createShopStore(manager: StoreManager) {
  return shopStoreDefinition.use(manager);
}

export type ShopStore = ReturnType<typeof createShopStore>;
