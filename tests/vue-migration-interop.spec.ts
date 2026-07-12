import { beforeEach, expect, test, vi } from 'vitest';
import { defineElement } from '@gluonjs/core';
import { products } from '../examples/shop/src/data.js';
import {
  ProductConfiguratorElement,
  registerProductConfigurator,
  type ProductConfiguratorEvent,
} from '../examples/shop/src/product-configurator.js';
import {
  createDefaultProductConfiguration,
  isProductConfiguration,
  parseProductConfiguration,
  serializeProductConfiguration,
} from '../examples/shop/src/product-configuration.js';

let upgradeSequence = 0;

beforeEach(() => {
  document.body.replaceChildren();
  registerProductConfigurator();
});

test('validates configuration serialization without guessing malformed values', async () => {
  const expected = createDefaultProductConfiguration();
  const serialized = serializeProductConfiguration(expected);
  expect(isProductConfiguration(null)).toBe(false);
  expect(isProductConfiguration('configuration')).toBe(false);
  expect(isProductConfiguration([])).toBe(false);
  expect(isProductConfiguration({ ...expected, finish: 'Green' })).toBe(false);
  expect(isProductConfiguration({ ...expected, temperature: 'Hot' })).toBe(false);
  expect(isProductConfiguration({ ...expected, cable: '4 m' })).toBe(false);
  expect(isProductConfiguration(expected)).toBe(true);
  expect(parseProductConfiguration('{broken')).toBeUndefined();
  expect(parseProductConfiguration('{}')).toBeUndefined();
  expect(parseProductConfiguration(serialized)).toEqual(expected);

  const detached = document.createElement('gluon-product-configurator') as ProductConfiguratorElement;
  detached.configuration = { ...expected, finish: 'Graphite' };
  detached.formResetCallback();
  expect(detached.configuration.finish).toBe('Cobalt');

  const element = document.createElement('gluon-product-configurator') as ProductConfiguratorElement;
  expect(element.name).toBe('');
  element.name = 'configuration';
  expect(element.name).toBe('configuration');
  expect(element.type).toBe('gluon-product-configurator');
  document.body.append(element);
  await element.updateComplete;
  expect(element.checkValidity()).toBe(false);
  expect(element.reportValidity()).toBe(false);
  expect(element.validity?.valueMissing).toBe(true);
  expect(element.willValidate).toBe(true);
  expect(element.value).toBe(serialized);

  element.required = false;
  await element.updateComplete;
  expect(element.checkValidity()).toBe(true);
  element.required = true;

  element.value = '{broken';
  expect(element.configuration).toEqual(expected);
  element.value = serializeProductConfiguration({ ...expected, cable: '2.5 m' });
  await element.updateComplete;
  expect(element.configuration.cable).toBe('2.5 m');
  element.formStateRestoreCallback(null);
  element.formStateRestoreCallback(new FormData());
  element.formStateRestoreCallback('{broken');
  expect(element.configuration.cable).toBe('2.5 m');

  const changes = vi.fn();
  element.addEventListener('configuration-change', changes);
  element.product = products[1]!;
  element.disabled = true;
  await element.updateComplete;
  expect(element.shadowRoot?.querySelector<HTMLInputElement>('input')?.disabled).toBe(true);
  element.shadowRoot?.querySelector<HTMLInputElement>('input[name="finish"][value="Graphite"]')?.click();
  expect(changes).not.toHaveBeenCalled();
  element.disabled = false;
  await element.updateComplete;
  expect(element.shadowRoot?.querySelector<HTMLInputElement>('input')?.disabled).toBe(false);

  const warnings = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  element.product = { ...products[0]!, availability: 'backorder' } as unknown as typeof element.product;
  await element.updateComplete;
  element.product = { ...products[0]!, dispatch: 'later' } as unknown as typeof element.product;
  await element.updateComplete;
  expect(warnings).toHaveBeenCalledTimes(2);
  warnings.mockRestore();
});

test('upgrades pre-definition product state and enforces explicit registration ownership', async () => {
  const tag = `gluon-product-upgrade-${upgradeSequence += 1}` as `${string}-${string}`;
  const pending = document.createElement(tag) as ProductConfiguratorElement;
  pending.product = products[0]!;
  pending.configuration = {
    ...createDefaultProductConfiguration(),
    finish: 'Graphite',
  };
  document.body.append(pending);

  class UpgradedProductConfigurator extends ProductConfiguratorElement {}
  defineElement(tag, UpgradedProductConfigurator);
  await customElements.whenDefined(tag);
  await pending.updateComplete;

  expect(pending).toBeInstanceOf(UpgradedProductConfigurator);
  expect(pending.product).toBe(products[0]);
  expect(pending.configuration.finish).toBe('Graphite');
  expect(pending.shadowRoot?.textContent).toContain('Orbit Lamp');
  expect(defineElement(tag, UpgradedProductConfigurator)).toBe(UpgradedProductConfigurator);

  class ConflictingProductConfigurator extends ProductConfiguratorElement {}
  expect(() => defineElement(tag, ConflictingProductConfigurator))
    .toThrow(`Custom element "${tag}" is already defined with another constructor.`);
});

test('preserves native slots, adopted styles, host identity, lifecycle retention, and cleanup', async () => {
  const element = document.createElement('gluon-product-configurator') as ProductConfiguratorElement;
  element.product = products[0]!;
  element.configuration = createDefaultProductConfiguration();
  const title = document.createElement('div');
  title.slot = 'title';
  title.textContent = 'Vue-owned title';
  const facts = document.createElement('ul');
  facts.textContent = 'Vue-owned facts';
  element.append(title, facts);
  document.body.append(element);
  await element.updateComplete;

  const shadow = element.shadowRoot!;
  const titleSlot = shadow.querySelector<HTMLSlotElement>('slot[name="title"]')!;
  const defaultSlot = shadow.querySelector<HTMLSlotElement>('slot:not([name])')!;
  const firstInput = shadow.querySelector<HTMLInputElement>('input')!;
  expect(titleSlot.assignedNodes()).toEqual([title]);
  expect(defaultSlot.assignedNodes()).toEqual([facts]);
  expect(title.parentNode).toBe(element);
  expect(shadow.adoptedStyleSheets).toHaveLength(1);
  expect(shadow.adoptedStyleSheets[0]?.cssRules.length).toBeGreaterThan(0);
  expect(shadow.querySelector('style')).toBeNull();

  const slotChanged = new Promise<void>((resolve) => {
    titleSlot.addEventListener('slotchange', () => resolve(), { once: true });
  });
  title.remove();
  await slotChanged;
  expect(titleSlot.assignedNodes()).toEqual([]);
  expect(titleSlot.textContent).toContain('Orbit Lamp');

  element.product = products[2]!;
  await element.updateComplete;
  expect(element).toBe(document.querySelector('gluon-product-configurator'));
  expect(shadow.querySelector('input')).toBe(firstInput);
  expect(titleSlot.textContent).toContain('Stack Tray');

  element.remove();
  firstInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  expect(element.configuration.finish).toBe('Cobalt');
  document.body.append(element);
  await element.updateComplete;
  const graphite = shadow.querySelector<HTMLInputElement>('input[name="finish"][value="Graphite"]')!;
  graphite.click();
  await element.updateComplete;
  expect(element.configuration.finish).toBe('Graphite');

  element.remove();
  const retained = element.configuration;
  graphite.click();
  expect(element.configuration).toBe(retained);
});

test('transports typed properties, native events, and the platform form contract', async () => {
  const form = document.createElement('form');
  const fieldset = document.createElement('fieldset');
  const label = document.createElement('label');
  label.htmlFor = 'product-configuration';
  label.textContent = 'Product configuration';
  const element = document.createElement('gluon-product-configurator') as ProductConfiguratorElement;
  element.id = 'product-configuration';
  element.name = 'configuration';
  element.required = true;
  element.product = products[0]!;
  element.configuration = createDefaultProductConfiguration();
  fieldset.append(label, element);
  form.append(fieldset);
  document.body.append(form);
  await element.updateComplete;

  expect(element.form).toBe(form);
  expect([...element.labels]).toContain(label);
  expect(element.checkValidity()).toBe(true);
  expect(new FormData(form).get('configuration')).toBe(serializeProductConfiguration(
    createDefaultProductConfiguration(),
  ));

  const configurationChange = vi.fn<(
    event: ProductConfiguratorEvent<'configuration-change'>,
  ) => void>();
  const input = vi.fn();
  const add = vi.fn<(event: ProductConfiguratorEvent<'add-to-bag'>) => void>();
  element.addEventListener('configuration-change', configurationChange as unknown as EventListener);
  element.addEventListener('input', input);
  element.addEventListener('add-to-bag', add as unknown as EventListener);
  element.shadowRoot?.querySelector<HTMLInputElement>('input[name="finish"]:not(:checked)')?.click();
  await element.updateComplete;

  expect(configurationChange).toHaveBeenCalledOnce();
  const configurationEvent = configurationChange.mock.calls[0]![0];
  expect(configurationEvent.detail).toEqual({
    product: products[0],
    configuration: expect.objectContaining({ finish: 'Graphite' }),
  });
  expect(configurationEvent.bubbles).toBe(true);
  expect(configurationEvent.composed).toBe(true);
  expect(configurationEvent.cancelable).toBe(false);
  expect(input).toHaveBeenCalledOnce();
  expect(new FormData(form).get('configuration')).toContain('"finish":"Graphite"');

  element.shadowRoot?.querySelector<HTMLButtonElement>('.add-to-bag')?.click();
  expect(add).toHaveBeenCalledOnce();
  const addEvent = add.mock.calls[0]![0];
  expect(addEvent.detail.configuration.finish).toBe('Graphite');
  expect(addEvent.bubbles).toBe(true);
  expect(addEvent.composed).toBe(true);
  expect(addEvent.cancelable).toBe(true);

  form.reset();
  await element.updateComplete;
  expect(element.configuration.finish).toBe('Cobalt');
  element.formStateRestoreCallback(serializeProductConfiguration({
    ...createDefaultProductConfiguration(),
    cable: '2.5 m',
  }));
  await element.updateComplete;
  expect(element.configuration.cable).toBe('2.5 m');

  element.focus();
  expect(element.shadowRoot?.activeElement).toBe(element.shadowRoot?.querySelector('input:checked'));
  for (const radio of element.shadowRoot?.querySelectorAll<HTMLInputElement>('input') ?? []) {
    radio.checked = false;
  }
  element.focus();
  expect(element.shadowRoot?.activeElement).toBe(element.shadowRoot?.querySelector('input'));
  fieldset.disabled = true;
  await Promise.resolve();
  await element.updateComplete;
  expect(new FormData(form).has('configuration')).toBe(false);
  expect(element.shadowRoot?.querySelector<HTMLInputElement>('input')?.disabled).toBe(true);

  fieldset.disabled = false;
  element.product = undefined;
  await element.updateComplete;
  expect(element.checkValidity()).toBe(false);
  expect(element.validationMessage).toContain('Choose a product');
});
