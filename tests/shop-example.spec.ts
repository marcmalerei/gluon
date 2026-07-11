import { beforeEach, describe, expect, it } from 'vitest';
import { adoptStyles } from '../src/index.js';
import { nextTick } from '@gluonjs/reactivity';
import { createMemoryHistory } from '@gluonjs/router';
import { createShopApplication } from '../examples/shop/src/app.js';
import { products } from '../examples/shop/src/data.js';
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

    root.querySelector<HTMLInputElement>('input[name="finish"]:not(:checked)')!.click();
    root.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    expect(root.querySelector('[role="dialog"] #bag-title')?.textContent).toBe('Bag 1');
    expect(root.querySelector('.bag-line p')?.textContent).toContain('Graphite');
    root.querySelector<HTMLButtonElement>('[aria-label="Increase quantity"]')!.click();
    await settleShop();
    expect(root.querySelector('#bag-title')?.textContent).toBe('Bag 2');

    root.querySelector<HTMLButtonElement>('[aria-label="Close bag"]')!.click();
    router.back();
    await settleShop();
    expect(router.currentRoute.value.path).toBe('/');
    router.forward();
    await settleShop();
    expect(router.currentRoute.value.path).toBe('/products/orbit-lamp');
    app.unmount();
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
    expect(root.querySelector('.empty-bag')?.textContent).toContain('ready for something useful');
    root.querySelector<HTMLAnchorElement>('.empty-bag a')!.click();
    await settleShop();
    expect(router.currentRoute.value.path).toBe('/shop');
    expect(root.querySelector('.bag-drawer')).toBeNull();
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

    root.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close bag');
    root.querySelector<HTMLButtonElement>('[aria-label="Decrease quantity"]')!.click();
    await settleShop();
    expect(root.querySelector('.empty-bag')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[aria-label="Close bag"]')!.click();
    root.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    root.querySelector<HTMLButtonElement>('.remove-line')!.click();
    await settleShop();
    expect(root.querySelector('.empty-bag')).not.toBeNull();

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
    firstRoot.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
    await settleShop();
    first.app.unmount();

    const second = createShopApplication(createMemoryHistory(['/']));
    await second.router.isReady();
    const secondRoot = document.createElement('div');
    document.body.append(secondRoot);
    second.app.mount(secondRoot);
    secondRoot.querySelector<HTMLButtonElement>('.bag-action')!.click();
    await settleShop();
    expect(secondRoot.querySelector('.bag-line h3')?.textContent).toBe('Stack Tray');
    expect(secondRoot.querySelector('.bag-line p')?.textContent).toContain('Cobalt');
    isolatedA.storeManager.dispose();
    isolatedB.storeManager.dispose();
    second.app.unmount();
  });
});

async function settleShop(): Promise<void> {
  await Promise.resolve();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
