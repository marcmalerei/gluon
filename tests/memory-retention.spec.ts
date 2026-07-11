import { expect, test, vi } from 'vitest';
import { adoptStyles, html } from '../src/index.js';
import { nextTick } from '@gluonjs/reactivity';
import { createMemoryHistory } from '@gluonjs/router';
import { activeFixtureNames, assertNoFixtureLeaks, renderFixture } from '@gluonjs/test-utils';
import { createShopApplication } from '../examples/shop/src/app.js';
import { products } from '../examples/shop/src/data.js';
import { shopStyles } from '../examples/shop/src/styles.js';

test('releases repeated customer-flow apps, caches, listeners, refs, Router, and Store ownership', async () => {
  document.body.replaceChildren();
  localStorage.clear();
  adoptStyles(document, shopStyles);

  for (let cycle = 0; cycle < 30; cycle += 1) {
    const { app, router, store } = createShopApplication(
      createMemoryHistory(['/products/orbit-lamp']),
      { storage: null },
    );
    await router.isReady();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    const addButton = root.querySelector<HTMLButtonElement>('.add-to-bag')!;
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
