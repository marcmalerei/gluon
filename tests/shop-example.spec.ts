import { beforeEach, describe, expect, it } from 'vitest';
import { adoptStyles } from '../src/index.js';
import { nextTick } from '@gluonjs/reactivity';
import { createMemoryHistory } from '@gluonjs/router';
import { createShopApplication } from '../examples/shop/src/app.js';
import { products } from '../examples/shop/src/data.js';
import { ProductConfiguratorElement } from '../examples/shop/src/product-configurator.js';
import {
  registerBagQuantityControl,
  type BagQuantityControlElement,
} from '../examples/shop/src/bag-quantity-control.js';
import { shopStyles } from '../examples/shop/src/styles.js';

describe('GLUON GOODS reference shop', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    localStorage.clear();
    adoptStyles(document, shopStyles);
  });

  it('browses, deep-links, configures, and manages a bag through public APIs', async () => {
    const { app, router } = createShopApplication(createMemoryHistory(['/']), { storage: null });
    await router.isReady();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);

    expect(root.querySelector('h1')?.textContent).toBe('Objects that work the way you do.');
    expect(root.querySelectorAll('.product-card')).toHaveLength(4);
    root.querySelector<HTMLAnchorElement>('[aria-label^="Orbit Lamp"]')!.click();
    await settleShop();
    expect(router.currentRoute.value.path).toBe('/products/orbit-lamp');
    expect(root.querySelector('#product-title')?.textContent).toBe('Orbit Lamp');
    const productPage = root.querySelector('.product-page');
    const configurator = getProductConfigurator(root);
    await configurator.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 70));
    expect(configurator.shadowRoot?.querySelector('.inventory-status')?.textContent)
      .toContain('Checking workshop availability');
    await new Promise((resolve) => setTimeout(resolve, 280));
    expect(configurator.shadowRoot?.querySelector('.inventory-status')?.textContent)
      .toContain('In stock · dispatches in 2–3 days');

    configurator.shadowRoot?.querySelector<HTMLInputElement>('input[name="finish"]:not(:checked)')!.click();
    configurator.shadowRoot?.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    expect(document.querySelector('[role="dialog"] #bag-title')?.textContent).toBe('Bag 1');
    expect(document.querySelector('.bag-line p')?.textContent).toContain('Graphite');
    getBagQuantityControl(document).shadowRoot?.querySelector<HTMLButtonElement>('[aria-label="Increase quantity"]')!.click();
    await settleShop();
    expect(document.querySelector('#bag-title')?.textContent).toBe('Bag 2');

    document.querySelector<HTMLButtonElement>('[aria-label="Close bag"]')!.click();
    router.back();
    await settleShop();
    expect(router.currentRoute.value.path).toBe('/');
    router.forward();
    await settleShop();
    expect(router.currentRoute.value.path).toBe('/products/orbit-lamp');
    expect(root.querySelector('.product-page')).toBe(productPage);
    app.unmount();
    expect(document.querySelector('gluon-teleport')).toBeNull();
  });

  it('exposes functional mobile navigation and catalog filters', async () => {
    const { app, router, store } = createShopApplication(createMemoryHistory(['/shop']), { storage: null });
    await router.isReady();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);

    root.querySelector<HTMLButtonElement>('[aria-label="Open menu"]')!.click();
    await settleShop();
    expect(root.querySelector('.mobile-menu[role="dialog"]')).not.toBeNull();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close menu');
    const newLink = [...root.querySelectorAll<HTMLAnchorElement>('.mobile-menu nav a')]
      .find((link) => link.textContent?.includes('New'))!;
    newLink.click();
    await settleShop();
    expect(router.currentRoute.value.fullPath).toBe('/shop?sort=new');
    expect(store.menuOpen).toBe(false);
    expect(root.querySelector('.mobile-menu[role="dialog"]')).toBeNull();
    const lighting = [...root.querySelectorAll<HTMLAnchorElement>('.catalog-filters a')]
      .find((link) => link.textContent === 'Lighting')!;
    lighting.click();
    await settleShop();
    expect(router.currentRoute.value.fullPath).toBe('/shop?category=Lighting');
    expect(root.querySelectorAll('.catalog-grid .product-card')).toHaveLength(1);
    app.unmount();
  });

  it('completes bag checkout and renders a durable order confirmation route', async () => {
    const { app, router, store } = createShopApplication(createMemoryHistory(['/products/orbit-lamp']), { storage: null });
    await router.isReady();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    expect(() => store.placeOrder()).toThrow('at least one bag line');
    await getProductConfigurator(root).updateComplete;
    getProductConfigurator(root).shadowRoot?.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    document.querySelector<HTMLAnchorElement>('.bag-summary a')!.click();
    await settleShop();
    expect(router.currentRoute.value.path).toBe('/checkout');
    expect(root.querySelector('h1')?.textContent).toBe('Delivery details');

    for (const [name, value] of Object.entries({
      email: 'ada@example.com', name: 'Ada Lovelace', address: '1 Gluon Way', postalCode: '10115', city: 'Berlin',
    })) {
      const input = root.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    root.querySelector<HTMLFormElement>('form')!.requestSubmit();
    await settleShop();
    expect(router.currentRoute.value.path).toMatch(/^\/orders\/GG-/);
    expect(root.querySelector('.order-confirmation')?.textContent).toContain('ada@example.com');
    expect(root.querySelector('.order-confirmation')?.textContent).toContain('€189');
    expect(store.bagCount).toBe(0);
    expect(store.order?.lines[0]?.configuration.finish).toBe('Cobalt');
    app.unmount();
  });

  it('searches the catalog and exposes a useful empty bag path', async () => {
    const { app, router, store } = createShopApplication(createMemoryHistory(['/']), { storage: null });
    await router.isReady();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);

    const searchReturnTarget = root.querySelector<HTMLButtonElement>('.mobile-menu-button')!;
    searchReturnTarget.click();
    await settleShop();
    root.querySelector<HTMLButtonElement>('.menu-search-action')!.click();
    await settleShop();
    const input = root.querySelector<HTMLInputElement>('#shop-search')!;
    expect(document.activeElement).toBe(input);
    input.value = 'lamp';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settleShop();
    expect(root.querySelectorAll('.search-results .product-card')).toHaveLength(1);
    expect(root.querySelector('.search-results')?.textContent).toContain('1 object');
    root.querySelector<HTMLElement>('.search-panel')!.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    }));
    await settleShop();
    expect(store.searchOpen).toBe(false);
    expect(root.querySelector('.search-panel')).toBeNull();
    expect(document.activeElement).toBe(searchReturnTarget);

    root.querySelector<HTMLButtonElement>('.bag-action')!.click();
    await settleShop();
    expect(document.querySelector('.empty-bag')?.textContent).toContain('ready for something useful');
    document.querySelector<HTMLAnchorElement>('.empty-bag a')!.click();
    await settleShop();
    expect(router.currentRoute.value.path).toBe('/shop');
    await expect.poll(() => document.querySelector('.bag-drawer'), { timeout: 5_000 }).toBeNull();
    app.unmount();
  });

  it('removes bag lines and renders policy and fallback routes', async () => {
    const { app, router } = createShopApplication(
      createMemoryHistory(['/products/orbit-lamp']),
      { storage: null },
    );
    await router.isReady();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);

    await getProductConfigurator(root).updateComplete;
    getProductConfigurator(root).shadowRoot?.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close bag');
    getBagQuantityControl(document).shadowRoot?.querySelector<HTMLButtonElement>('[aria-label="Decrease quantity"]')!.click();
    await settleShop();
    expect(document.querySelector('.empty-bag')).not.toBeNull();

    document.querySelector<HTMLButtonElement>('[aria-label="Close bag"]')!.click();
    getProductConfigurator(root).shadowRoot?.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    getBagQuantityControl(document).shadowRoot?.querySelector<HTMLButtonElement>('.remove-line')!.click();
    await settleShop();
    expect(document.querySelector('.empty-bag')).not.toBeNull();

    await router.push('/shipping');
    await settleShop();
    expect(root.querySelector('.policy-page h1')?.textContent).toBe('Shipping');
    await router.push('/returns');
    await settleShop();
    expect(root.querySelector('.policy-page h1')?.textContent).toBe('Returns');
    await router.push('/products/not-a-product');
    await settleShop();
    expect(root.querySelector('.not-found h1')?.textContent).toBe('That object moved.');
    await router.push('/not-a-route');
    await settleShop();
    expect(root.querySelector('.not-found h1')?.textContent).toBe('That object moved.');
    app.unmount();
  });

  it('isolates application stores and restores persisted bag state in the customer flow', async () => {
    const isolatedA = createShopApplication(createMemoryHistory(['/']), { storage: null });
    const isolatedB = createShopApplication(createMemoryHistory(['/']), { storage: null });
    isolatedA.store.addToBag(products[0]!);
    expect(isolatedA.store.bagCount).toBe(1);
    expect(isolatedB.store.bagCount).toBe(0);

    const first = createShopApplication(createMemoryHistory(['/products/stack-tray']));
    await first.router.isReady();
    const firstRoot = document.createElement('div');
    document.body.append(firstRoot);
    first.app.mount(firstRoot);
    await getProductConfigurator(firstRoot).updateComplete;
    getProductConfigurator(firstRoot).shadowRoot?.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    first.app.unmount();

    const second = createShopApplication(createMemoryHistory(['/']));
    await second.router.isReady();
    const secondRoot = document.createElement('div');
    document.body.append(secondRoot);
    second.app.mount(secondRoot);
    secondRoot.querySelector<HTMLButtonElement>('.bag-action')!.click();
    await settleShop();
    expect(document.querySelector('.bag-line h3')?.textContent).toBe('Stack Tray');
    expect(document.querySelector('.bag-line p')?.textContent).toContain('Cobalt');
    isolatedA.storeManager.dispose();
    isolatedB.storeManager.dispose();
    second.app.unmount();
  });

  it('keeps the bag quantity control optimistic state synchronized and cancelable', async () => {
    const Control = registerBagQuantityControl();
    const control = document.createElement('gluon-bag-quantity') as InstanceType<typeof Control>;
    control.lineKey = 'orbit-lamp:cobalt';
    control.productName = 'Orbit Lamp';
    control.quantity = 1;
    control.addEventListener('quantity-change', (event) => event.preventDefault(), { once: true });
    document.body.append(control);
    await control.updateComplete;

    control.shadowRoot?.querySelector<HTMLButtonElement>('[aria-label="Increase quantity"]')!.click();
    await control.updateComplete;
    expect(control.shadowRoot?.querySelector('output')?.textContent).toBe('1');

    control.quantity = 2;
    await settleShop();
    expect(control.shadowRoot?.querySelector('output')?.textContent).toBe('2');
    control.focus();
    expect(control.shadowRoot?.activeElement).toBe(
      control.shadowRoot?.querySelector('[aria-label="Decrease quantity"]'),
    );

    control.shadowRoot?.querySelector<HTMLButtonElement>('[aria-label="Decrease quantity"]')!.click();
    control.shadowRoot?.querySelector<HTMLButtonElement>('[aria-label="Decrease quantity"]')!.click();
    await control.updateComplete;
    control.shadowRoot?.querySelector<HTMLButtonElement>('[aria-label="Decrease quantity"]')!.click();
    await control.updateComplete;
    expect(control.shadowRoot?.querySelector('output')?.textContent).toBe('0');
  });
});

async function settleShop(): Promise<void> {
  await Promise.resolve();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function getProductConfigurator(root: ParentNode): ProductConfiguratorElement {
  const configurator = root.querySelector<ProductConfiguratorElement>('gluon-product-configurator');
  if (!configurator) throw new Error('Expected the product configurator to be rendered.');
  return configurator;
}

function getBagQuantityControl(root: ParentNode): BagQuantityControlElement {
  const control = root.querySelector<BagQuantityControlElement>('gluon-bag-quantity');
  if (!control) throw new Error('Expected the bag quantity control to be rendered.');
  return control;
}
