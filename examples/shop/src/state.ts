import { defineStore, type StoreManager } from '@gluonjs/store';
import type { Product } from './data.js';
import { products } from './data.js';
import {
  createDefaultProductConfiguration,
  cloneProductConfiguration,
  isProductConfiguration,
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
  readonly deliveryInstructions: string;
}

interface LegacyBagLine {
  readonly productSlug: string;
  readonly quantity: number;
  readonly configuration: ProductConfiguration;
}

function isLegacyBagLine(value: unknown): value is LegacyBagLine {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LegacyBagLine>;
  return typeof candidate.productSlug === 'string'
    && typeof candidate.quantity === 'number'
    && Number.isInteger(candidate.quantity)
    && candidate.quantity > 0
    && isProductConfiguration(candidate.configuration);
}

export const shopStoreDefinition = defineStore('shop', () => ({
  bagOpen: false,
  menuOpen: false,
  searchOpen: false,
  searchQuery: '',
  configuration: createDefaultProductConfiguration(),
  bag: [] as BagLine[],
  checkout: { email: '', name: '', address: '', city: '', postalCode: '', deliveryInstructions: '' },
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
        deliveryInstructions: store.checkout.deliveryInstructions,
      };
      store.order = order;
      store.bag = [];
      store.bagOpen = false;
      return order;
    },
  }),
  persist: {
    paths: ['bag'],
    version: 1,
    legacy: {
      to: 1,
      migrate: (state: Readonly<Record<string, unknown>>) => ({
        bag: Array.isArray(state.bag)
          ? state.bag
              .filter(isLegacyBagLine)
              .flatMap((line) => {
                const product = products.find((item) => item.slug === line.productSlug);
                if (!product) return [];
                return [{
                  key: [product.slug, line.configuration.finish, line.configuration.temperature, line.configuration.cable].join(':'),
                  product,
                  configuration: cloneProductConfiguration(line.configuration),
                  quantity: line.quantity,
                }];
              })
          : [],
      }),
    },
  },
});

export function createShopStore(manager: StoreManager) {
  return shopStoreDefinition.use(manager);
}

export type ShopStore = ReturnType<typeof createShopStore>;
