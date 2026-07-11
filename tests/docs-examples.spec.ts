import { expect, test } from 'vitest';
import { nextTick } from '@gluonjs/reactivity';
import { GluonCounter } from '../docs-site/examples/custom-element.js';
import { mountVueHost } from '../docs-site/examples/vue-host.js';

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

test('runs the Vue host example around the Gluon Custom Element', async () => {
  const root = document.createElement('div');
  document.body.append(root);
  const host = mountVueHost(root);
  await nextTick();
  const element = root.querySelector('gluon-counter') as GluonCounter;
  expect(element).toBeInstanceOf(GluonCounter);
  await element.updateComplete;
  expect(element.shadowRoot!.querySelector('button')).not.toBeNull();
  host.unmount();
  root.remove();
});
