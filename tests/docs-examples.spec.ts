import { expect, test } from 'vitest';
import { nextTick } from '@gluonjs/reactivity';
import { GluonCounter } from '../docs-site/examples/custom-element.js';
import { mountVueHost } from '../docs-site/examples/vue-host.js';
import {
  productConfiguratorStyles,
  type ProductConfiguratorElement,
} from '../examples/shop/src/product-configurator.js';

test('runs the plain Custom Element example through native events', async () => {
  const element = new GluonCounter();
  document.body.append(element);
  await element.updateComplete;
  let value = -1;
  element.addEventListener('change', (event) => { value = (event as CustomEvent<{ value: number }>).detail.value; });
  element.shadowRoot!.querySelector('button')!.click();
  await element.updateComplete;
  expect(value).toBe(1);
  expect(element.shadowRoot!.textContent).toContain('1');
  element.remove();
});

test('runs the Vue 3 migration host around the production Gluon product element', async () => {
  const root = document.createElement('div');
  document.body.append(root);
  const host = mountVueHost(root);
  await Promise.resolve();
  await nextTick();
  const element = root.querySelector('gluon-product-configurator') as ProductConfiguratorElement;
  await element.updateComplete;
  expect(element.product?.slug).toBe('orbit-lamp');
  const adoptedSheets = element.shadowRoot?.adoptedStyleSheets ?? [];
  expect(adoptedSheets).toHaveLength(1);
  expect([...adoptedSheets[0]!.cssRules].map((rule) => rule.cssText))
    .toEqual([...productConfiguratorStyles.cssRules].map((rule) => rule.cssText));
  expect(element.shadowRoot?.querySelector('style')).toBeNull();
  expect(element.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="title"]')?.assignedNodes()).toHaveLength(1);

  element.shadowRoot?.querySelector<HTMLInputElement>('input[name="finish"][value="Graphite"]')?.click();
  await Promise.resolve();
  await element.updateComplete;
  expect(root.querySelector('[data-current-configuration]')?.textContent).toContain('Graphite');

  element.shadowRoot?.querySelector<HTMLElement>('gluon-product-add-action')
    ?.querySelector<HTMLButtonElement>('button')?.click();
  await Promise.resolve();
  expect(root.querySelector('[data-added-line]')?.textContent)
    .toContain('Orbit Lamp · Graphite · Warm 2700K · 1.5 m');

  root.querySelector<HTMLButtonElement>('[data-use-product]')?.click();
  await Promise.resolve();
  await element.updateComplete;
  expect(element.product?.slug).toBe('stack-tray');
  expect(root.querySelector('#vue-product-title')?.textContent).toBe('Stack Tray');

  root.querySelector<HTMLFormElement>('form')?.requestSubmit();
  await Promise.resolve();
  expect(root.querySelector('[data-form-value]')?.textContent).toContain('"finish":"Cobalt"');
  host.unmount();
  root.remove();
});
