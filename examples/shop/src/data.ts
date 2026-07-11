export type ProductCategory = 'Lighting' | 'Carry' | 'Workspace' | 'Seating';

export interface Product {
  readonly slug: string;
  readonly name: string;
  readonly price: number;
  readonly category: ProductCategory;
  readonly description: string;
  readonly image: string;
  readonly alt: string;
  readonly availability: 'in-stock' | 'low-stock';
  readonly dispatch: '1–2 days' | '2–3 days';
}

export const products: readonly Product[] = Object.freeze([
  {
    slug: 'orbit-lamp',
    name: 'Orbit Lamp',
    price: 189,
    category: 'Lighting',
    description: 'Focused light, tuned to your space.',
    image: new URL('../assets/orbit-lamp.webp', import.meta.url).href,
    alt: 'Black Orbit desk lamp with an opal shade and cobalt control',
    availability: 'in-stock',
    dispatch: '2–3 days',
  },
  {
    slug: 'field-tote',
    name: 'Field Tote',
    price: 128,
    category: 'Carry',
    description: 'Structured carry with a place for every module.',
    image: new URL('../assets/field-tote.webp', import.meta.url).href,
    alt: 'Cobalt Field Tote with black leather handles and base',
    availability: 'low-stock',
    dispatch: '1–2 days',
  },
  {
    slug: 'stack-tray',
    name: 'Stack Tray',
    price: 79,
    category: 'Workspace',
    description: 'A two-level organizer that changes with your desk.',
    image: new URL('../assets/stack-tray.webp', import.meta.url).href,
    alt: 'Cobalt two-tier Stack Tray desktop organizer',
    availability: 'in-stock',
    dispatch: '2–3 days',
  },
  {
    slug: 'fold-stool',
    name: 'Fold Stool',
    price: 249,
    category: 'Seating',
    description: 'A compact seat that folds when the room needs to change.',
    image: new URL('../assets/fold-stool.webp', import.meta.url).href,
    alt: 'Black folding stool with a woven seat and tubular frame',
    availability: 'low-stock',
    dispatch: '2–3 days',
  },
]);

export const heroImage = new URL('../assets/hero-orbit-workspace.webp', import.meta.url).href;

export const categories: readonly ProductCategory[] = Object.freeze([
  'Lighting',
  'Carry',
  'Workspace',
  'Seating',
]);

export function findProduct(slug: string | readonly string[] | undefined): Product | undefined {
  const value = Array.isArray(slug) ? slug[0] : slug;
  return products.find((product) => product.slug === value);
}

export function formatPrice(price: number): string {
  return `€${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price)}`;
}
