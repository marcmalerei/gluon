import { compose, createApp, html, type GluonApp } from '@gluonjs/core';
import { Button } from '@gluonjs/atoms';
import { ref } from '@gluonjs/reactivity';
import { RouterLink, RouterView, createRouterPlugin, type Router } from '@gluonjs/router';
import { createStoreManager, type StoreManager } from '@gluonjs/store';
import { useCartStore, type CartStore } from './cart-store.js';
import { CheckoutLayout, DeliveryComposition, PurchasePrimitive } from './components/index.js';
import './quantity-control.js';

export interface StarterActionProps {
  readonly count: number;
  readonly onIncrement: () => void;
}

/** App-owned Atom consumer. Vite hot-updates this function without recreating application state. */
export function StarterAction({ count, onIncrement }: StarterActionProps) {
  return Button({
    label: `Actions: ${count}`,
    variant: count % 2 === 0 ? 'primary' : 'secondary',
    size: 'large',
    onClick: onIncrement,
    attributes: {
      class: 'starter-action',
      'aria-label': 'Increment starter action count',
      data: { starterAction: true },
    },
  });
}


export interface StarterApplicationOptions {
  readonly router: Router;
  readonly storeManager?: StoreManager;
}

export interface StarterApplication {
  readonly app: GluonApp;
  readonly storeManager: StoreManager;
  readonly cart: CartStore;
}

export function createStarterApplication(options: StarterApplicationOptions): StarterApplication {
  const ownsStoreManager = options.storeManager === undefined;
  const storeManager = options.storeManager ?? createStoreManager();
  const cart = useCartStore.use(storeManager);
  const actionCount = ref(0);
  const app = createApp(() => {
    const checkout = options.router.currentRoute.value.path === '/checkout';
    return html`
    <header>
      <a class="brand" href="/">DX Checkout</a>
      <nav aria-label="Primary">
        ${compose(RouterLink, { to: '/' })`Product`}
        ${compose(RouterLink, { to: '/checkout' })`Checkout`}
      </nav>
    </header>
    <main>
      <section class="starter-panel">
      ${RouterView()}
      ${checkout ? CheckoutLayout({
        heading: 'Checkout summary',
        summary: `${cart.quantity} × Evidence Tote for ${cart.email || 'guest'}`,
        continueLabel: 'Place order',
      }) : html`
        <label>Email <input type="email" .value=${cart.email} @input=${(event: Event) => cart.setEmail((event.currentTarget as HTMLInputElement).value)}></label>
        <starter-quantity-control name="quantity" required .value=${cart.quantity}
          @quantity-change=${(event: Event) => cart.setQuantity((event as CustomEvent<{ quantity: number }>).detail.quantity)}
        >Quantity <span slot="help">Choose one to nine.</span></starter-quantity-control>
        ${DeliveryComposition({ title: 'Delivery', actionLabel: 'Standard delivery' })}
        ${PurchasePrimitive({ label: 'Reset', onPress: () => cart.setQuantity(1) })}
        ${StarterAction({ count: actionCount.value, onIncrement: () => { actionCount.value += 1; } })}
        ${Button({ label: 'Add to bag', onClick: () => { cart.persist(); void options.router.push('/checkout'); }, attributes: { 'data-analytics': 'add' } })}
      `}
      </section>
    </main>
  `; });
  app.use(createRouterPlugin(options.router));
  if (ownsStoreManager) app.onUnmounted(() => storeManager.dispose());
  return { app, storeManager, cart };
}
