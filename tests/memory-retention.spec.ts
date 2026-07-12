import { expect, test, vi } from 'vitest';
import { defineGluonElement, html } from '../src/index.js';
import { nextTick, ref } from '@gluonjs/reactivity';
import { createMemoryHistory } from '@gluonjs/router';
import { activeFixtureNames, assertNoFixtureLeaks, renderFixture } from '@gluonjs/test-utils';
import { createShopApplication } from '../examples/shop/src/app.js';
import { products } from '../examples/shop/src/data.js';
import type { ProductConfiguratorElement } from '../examples/shop/src/product-configurator.js';
import { shopStyles, shopUiTokenStyles } from '../examples/shop/src/styles.js';

test('releases repeated customer-flow apps, caches, listeners, refs, Router, and Store ownership', async () => {
  document.body.replaceChildren();
  localStorage.clear();
  document.adoptedStyleSheets = [];

  for (let cycle = 0; cycle < 30; cycle += 1) {
    const { app, router, store } = createShopApplication(
      createMemoryHistory(['/products/orbit-lamp']),
      { storage: null, styleTarget: document },
    );
    await router.isReady();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    const configurator = root.querySelector<ProductConfiguratorElement>('gluon-product-configurator')!;
    await configurator.updateComplete;
    const addButton = configurator.shadowRoot!.querySelector<HTMLButtonElement>('.add-to-bag')!;
    addButton.click();
    await nextTick();
    expect(store.bagCount).toBe(1);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    app.unmount();
    const retainedCount = store.bagCount;
    await expect(router.push('/shop')).rejects.toThrow('destroyed router');
    expect(() => store.addToBag(products[0]!)).toThrow(/disposed/i);
    addButton.click();
    await nextTick();
    expect(store.bagCount).toBe(retainedCount);
    expect(root.childNodes).toHaveLength(0);
    expect(document.querySelector('gluon-teleport')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.adoptedStyleSheets).not.toContain(shopUiTokenStyles);
    expect(document.adoptedStyleSheets).not.toContain(shopStyles);
    root.remove();
  }
});

test('reports and clears test-owned resource retention deterministically', () => {
  document.body.replaceChildren();
  const click = vi.fn();
  const fixture = renderFixture(() => html`<button @click=${click}>Retained?</button>`, {
    name: 'retention-probe',
  });
  const button = fixture.get<HTMLButtonElement>('button');
  button.click();
  expect(click).toHaveBeenCalledOnce();
  fixture.cleanup();
  button.click();
  expect(click).toHaveBeenCalledOnce();
  expect(activeFixtureNames()).toEqual([]);
  assertNoFixtureLeaks();
});

test('releases functional element setup watchers, listeners, and callbacks on every disconnect', async () => {
  document.body.replaceChildren();
  const source = ref(0);
  const setup = vi.fn();
  const cleanup = vi.fn();
  const watchRuns = vi.fn();
  const resize = vi.fn();
  const FunctionalRetentionProbe = defineGluonElement({
    tagName: 'gluon-functional-retention-probe',
    setup(context) {
      setup();
      context.watch(source, watchRuns);
      window.addEventListener('resize', resize);
      context.onCleanup(() => {
        window.removeEventListener('resize', resize);
        cleanup();
      });
      return { render: () => html`<output>${source.value}</output>` };
    },
  });

  for (let cycle = 1; cycle <= 30; cycle += 1) {
    const element = document.createElement('gluon-functional-retention-probe') as InstanceType<typeof FunctionalRetentionProbe>;
    document.body.append(element);
    await element.updateComplete;
    source.value = cycle;
    await nextTick();
    window.dispatchEvent(new Event('resize'));
    const watchedBeforeDisconnect = watchRuns.mock.calls.length;
    const resizedBeforeDisconnect = resize.mock.calls.length;
    element.remove();
    source.value = cycle + 1_000;
    await nextTick();
    window.dispatchEvent(new Event('resize'));
    expect(watchRuns).toHaveBeenCalledTimes(watchedBeforeDisconnect);
    expect(resize).toHaveBeenCalledTimes(resizedBeforeDisconnect);
  }
  expect(setup).toHaveBeenCalledTimes(30);
  expect(cleanup).toHaveBeenCalledTimes(30);
});
