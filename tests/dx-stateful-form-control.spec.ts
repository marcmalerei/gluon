import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, test } from 'vitest';
import { GluonElement, renderGluonElementForServer } from '@gluonjs/core';
import { prepareForHydration } from '@gluonjs/ssr';
import { hydrateElement } from '@gluonjs/ssr/hydration';
import {
  ClassQuantityControl,
  gluonClassLifecycleEvidence,
  gluonClassTag,
} from '../benchmarks/dx/stateful-form-control/gluon-class.js';
import {
  FunctionalQuantityControl,
  gluonFunctionalLifecycleEvidence,
  gluonFunctionalTag,
} from '../benchmarks/dx/stateful-form-control/gluon-functional.js';
import {
  reactLifecycleEvidence,
  reactQuantityTag,
  registerReactQuantityControl,
  renderReactQuantityShadow,
} from '../benchmarks/dx/stateful-form-control/react.js';
import {
  appendQuantityContent,
  product,
  type QuantityChange,
  type QuantityControlPublic,
} from '../benchmarks/dx/stateful-form-control/shared.js';
import {
  registerVueQuantityControl,
  renderVueQuantityShadow,
  vueLifecycleEvidence,
  vueQuantityTag,
} from '../benchmarks/dx/stateful-form-control/vue.js';

type TestControl = QuantityControlPublic & { readonly updateComplete?: Promise<unknown> };

registerVueQuantityControl();
registerReactQuantityControl();

afterEach(() => { document.body.replaceChildren(); });

describe.each([
  ['Gluon class', gluonClassTag],
  ['Gluon functional', gluonFunctionalTag],
  ['Vue', vueQuantityTag],
  ['React', reactQuantityTag],
] as const)('%s retained stateful form-control fixture', (_name, tagName) => {
  test('works from plain HTML with structured input, slots, events, validation, focus, and forms', async () => {
    const form = document.createElement('form');
    const control = document.createElement(tagName) as TestControl;
    control.setAttribute('name', 'quantity');
    control.product = product;
    control.value = 1;
    control.required = true;
    appendQuantityContent(control);
    form.append(control);
    document.body.append(form);
    await settled(control);

    expect(control.shadowRoot?.querySelector('section')?.getAttribute('aria-label')).toBe('Orbit Lamp quantity');
    expect(control.shadowRoot?.querySelector('output')?.textContent).toBe('1');
    expect(control.shadowRoot?.querySelector('strong')?.textContent).toBe('Total €249.00');
    expect(control.querySelector('[slot="help"]')?.textContent).toBe('Choose one to five.');
    expect(new FormData(form).get('quantity')).toBe('1');

    const changes: QuantityChange[] = [];
    control.addEventListener('quantity-change', (event) => changes.push((event as CustomEvent<QuantityChange>).detail));
    expect(control.setQuantity(2)).toBe(true);
    await settled(control);
    expect(changes).toEqual([{ productId: product.id, quantity: 2 }]);
    expect(control.shadowRoot?.querySelector('output')?.textContent).toBe('2');
    expect(control.shadowRoot?.querySelector('strong')?.textContent).toBe('Total €498.00');

    control.addEventListener('quantity-change', (event) => event.preventDefault(), { once: true });
    expect(control.setQuantity(3)).toBe(false);
    await settled(control);
    expect(control.quantity).toBe(2);

    control.setQuantity(0);
    await settled(control);
    expect(control.checkValidity()).toBe(false);
    expect(control.validationMessage).toBe('Choose at least one item.');
    control.focus();
    expect(control.shadowRoot?.activeElement).toBe(control.shadowRoot?.querySelector('button'));
  });
});

test('the retained Gluon class and functional comparator tags hydrate their exact server DOM', async () => {
  for (const [tagName, definition] of [
    [gluonClassTag, ClassQuantityControl],
    [gluonFunctionalTag, FunctionalQuantityControl],
  ] as const) {
    const server = renderGluonElementForServer(definition, { product, value: 2, required: true });
    const prepared = await prepareForHydration(server.template);
    const control = document.createElement(tagName) as TestControl;
    control.product = product;
    control.value = 2;
    control.required = true;
    appendQuantityContent(control);
    control.shadowRoot!.innerHTML = prepared.html;
    const retainedSection = control.shadowRoot?.querySelector('section');

    const hydration = await hydrateElement(control as unknown as GluonElement);
    document.body.append(control);
    await settled(control);
    expect(hydration.retained).toBe(true);
    expect(hydration.recovered).toBe(false);
    expect(control.shadowRoot?.querySelector('section')).toBe(retainedSection);
    expect(control.shadowRoot?.querySelector('strong')?.textContent).toBe('Total €498.00');
    control.setQuantity(3);
    await settled(control);
    expect(control.shadowRoot?.querySelector('output')?.textContent).toBe('3');
    control.remove();
  }
});

test('Vue and React hydrate retained server markup and every lane disposes its connection owner', async () => {
  const classBefore = gluonClassLifecycleEvidence.cleanups;
  const functionalBefore = gluonFunctionalLifecycleEvidence.cleanups;
  const vueBefore = vueLifecycleEvidence.cleanups;
  const reactBefore = reactLifecycleEvidence.cleanups;
  const cases = [
    [vueQuantityTag, await renderVueQuantityShadow(product, 2)],
    [reactQuantityTag, renderReactQuantityShadow(product, 2)],
  ] as const;

  for (const [tagName, serverMarkup] of cases) {
    const control = document.createElement(tagName) as TestControl;
    const shadow = control.attachShadow({ mode: 'open' });
    shadow.innerHTML = serverMarkup;
    const retainedSection = shadow.querySelector('section');
    control.product = product;
    control.value = 2;
    document.body.append(control);
    await settled(control);
    expect(control.shadowRoot?.querySelector('section')).toBe(retainedSection);
    expect(control.shadowRoot?.querySelector('strong')?.textContent).toBe('Total €498.00');
    control.remove();
    await settled(control);
  }

  for (const tagName of [gluonClassTag, gluonFunctionalTag]) {
    const control = document.createElement(tagName) as TestControl;
    control.product = product;
    appendQuantityContent(control);
    document.body.append(control);
    await settled(control);
    control.remove();
    await settled(control);
  }

  expect(gluonClassLifecycleEvidence.cleanups).toBe(classBefore + 1);
  expect(gluonFunctionalLifecycleEvidence.cleanups).toBe(functionalBefore + 1);
  expect(vueLifecycleEvidence.cleanups).toBe(vueBefore + 1);
  expect(reactLifecycleEvidence.cleanups).toBe(reactBefore + 1);
});

test('a Vue host consumes the Gluon functional custom element without a wrapper component', async () => {
  let control: InstanceType<typeof FunctionalQuantityControl> | undefined;
  const Host = defineComponent(() => () => h(gluonFunctionalTag as string, {
    ref: (element: unknown) => { control = element as InstanceType<typeof FunctionalQuantityControl> | undefined; },
    product,
    value: 2,
  }, ['Quantity', h('span', { slot: 'help' }, 'Vue host help')]));
  const mount = document.createElement('div');
  document.body.append(mount);
  const app = createApp(Host);
  app.mount(mount);
  await nextTick();
  await settled(control!);
  expect(control).toBeInstanceOf(FunctionalQuantityControl);
  expect(control?.shadowRoot?.querySelector('strong')?.textContent).toBe('Total €498.00');
  expect(control?.querySelector('[slot="help"]')?.textContent).toBe('Vue host help');
  app.unmount();
});

async function settled(control: TestControl): Promise<void> {
  await control.updateComplete;
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
