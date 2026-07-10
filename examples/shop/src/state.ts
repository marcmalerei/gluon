import { computed, reactive } from '@gluonjs/reactivity';
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

interface ShopState {
  bagOpen: boolean;
  menuOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  configuration: ProductConfiguration;
  bag: BagLine[];
}

const defaultConfiguration = (): ProductConfiguration => ({
  finish: 'Cobalt',
  temperature: 'Warm 2700K',
  cable: '1.5 m',
});

export const shopState = reactive<ShopState>({
  bagOpen: false,
  menuOpen: false,
  searchOpen: false,
  searchQuery: '',
  configuration: defaultConfiguration(),
  bag: [],
});

export const bagCount = computed(() => (
  shopState.bag.reduce((total, line) => total + line.quantity, 0)
));

export const bagTotal = computed(() => (
  shopState.bag.reduce((total, line) => total + line.product.price * line.quantity, 0)
));

export function configure<Key extends keyof ProductConfiguration>(
  key: Key,
  value: ProductConfiguration[Key],
): void {
  shopState.configuration[key] = value;
}

export function addToBag(product: Product): void {
  const configuration = { ...shopState.configuration };
  const key = [
    product.slug,
    configuration.finish,
    configuration.temperature,
    configuration.cable,
  ].join(':');
  const existing = shopState.bag.find((line) => line.key === key);
  if (existing) existing.quantity += 1;
  else shopState.bag.push({ key, product, configuration, quantity: 1 });
  shopState.bagOpen = true;
}

export function changeQuantity(key: string, change: number): void {
  const line = shopState.bag.find((entry) => entry.key === key);
  if (!line) return;
  line.quantity += change;
  if (line.quantity <= 0) removeFromBag(key);
}

export function removeFromBag(key: string): void {
  const index = shopState.bag.findIndex((line) => line.key === key);
  if (index >= 0) shopState.bag.splice(index, 1);
}

export function resetShopState(): void {
  shopState.bagOpen = false;
  shopState.menuOpen = false;
  shopState.searchOpen = false;
  shopState.searchQuery = '';
  shopState.configuration = defaultConfiguration();
  shopState.bag.splice(0);
}
