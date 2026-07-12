import { afterEach, expect, test } from 'vitest';
import { html } from '@gluonjs/core';
import { Button } from '@gluonjs/atoms';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';
import { CheckoutLayout, DeliveryComposition, PurchasePrimitive } from './components/index.js';

afterEach(() => cleanupFixtures());

test('renders an operable starter control', () => {
  const fixture = renderFixture(() => CheckoutLayout({
    heading: 'Checkout summary',
    summary: '3 × Evidence Tote for buyer@example.test',
    continueLabel: 'Place order',
  }));
  expect(fixture.get('main').textContent).toContain('3 × Evidence Tote for buyer@example.test');
});

test('renders the app-local primitive and composition with public contracts', () => {
  const fixture = renderFixture(() => html`
    ${PurchasePrimitive({ label: 'Reset' })}
    ${DeliveryComposition({ title: 'Delivery', actionLabel: 'Standard delivery' })}
    ${Button({ label: 'Add to bag' })}
  `);
  expect([...fixture.container.querySelectorAll('button')].map((button) => button.textContent)).toEqual(['Reset', 'Standard delivery', 'Add to bag']);
});
