import { afterEach, expect, test, vi } from 'vitest';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';
import { PurchasePrimitive, PurchasePrimitiveStyleSelection, installPurchasePrimitiveStyles } from './purchase-primitive.js';

afterEach(() => cleanupFixtures());

test('PurchasePrimitive renders native semantics, interaction, accessibility, and owned style cleanup', () => {
  const press = vi.fn();
  const ref: { value?: HTMLButtonElement } = {};
  const fixture = renderFixture(() => PurchasePrimitive({ label: 'Save changes', pressed: true, ref, onPress: press }));
  const owner = installPurchasePrimitiveStyles(document);
  fixture.own(() => owner.dispose(), 'PurchasePrimitive stylesheet owner');
  const button = fixture.get<HTMLButtonElement>('button');
  expect(button.type).toBe('button');
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(button.dataset.component).toBe('purchase-primitive');
  expect(ref.value).toBe(button);
  expect(PurchasePrimitiveStyleSelection.entries[0]?.id).toBe('app-purchase-primitive');
  button.click();
  expect(press).toHaveBeenCalledOnce();
  fixture.cleanup();
  expect(ref.value).toBeUndefined();
  expect(owner.disposed).toBe(true);
});
