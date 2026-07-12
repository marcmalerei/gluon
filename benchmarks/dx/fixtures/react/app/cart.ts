export type CartState = { quantity: number; email: string };
const key = 'dx-react-cart-v1';
export function readCart(): CartState {
  if (typeof window === 'undefined') return { quantity: 1, email: '' };
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw) as CartState : { quantity: 1, email: '' };
}
export function writeCart(state: CartState): void { window.localStorage.setItem(key, JSON.stringify(state)); }
