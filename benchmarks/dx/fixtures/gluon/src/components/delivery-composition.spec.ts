import { afterEach, expect, test, vi } from 'vitest';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';
import { DeliveryComposition, DeliveryCompositionStyleSelection, installDeliveryCompositionStyles } from './delivery-composition.js';

afterEach(() => cleanupFixtures());

test('DeliveryComposition composes an Atom with semantic output and releases owned styles', () => {
  const action = vi.fn();
  const fixture = renderFixture(() => DeliveryComposition({ title: 'Delivery', actionLabel: 'Continue', onAction: action }));
  const owner = installDeliveryCompositionStyles(document);
  fixture.own(() => owner.dispose(), 'DeliveryComposition stylesheet owner');
  const section = fixture.get<HTMLElement>('section');
  expect(section.getAttribute('aria-label')).toBe('Delivery');
  expect(section.querySelector('h2')?.textContent).toBe('Delivery');
  const button = fixture.get<HTMLButtonElement>('button');
  expect(button.textContent).toBe('Continue');
  expect(DeliveryCompositionStyleSelection.entries[0]?.scope).toBe('app-components');
  button.click();
  expect(action).toHaveBeenCalledOnce();
  fixture.cleanup();
  expect(owner.disposed).toBe(true);
});
