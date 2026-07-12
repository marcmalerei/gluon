import { afterEach, expect, test, vi } from 'vitest';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';
import { CheckoutLayout, CheckoutLayoutStyleSelection, installCheckoutLayoutStyles } from './checkout-layout.js';

afterEach(() => cleanupFixtures());

test('CheckoutLayout composes only downward with landmarks, interaction, and cleanup', () => {
  const continuation = vi.fn();
  const fixture = renderFixture(() => CheckoutLayout({
    heading: 'Review order',
    summary: 'One configured object',
    continueLabel: 'Place order',
    onContinue: continuation,
  }));
  const owner = installCheckoutLayoutStyles(document);
  fixture.own(() => owner.dispose(), 'CheckoutLayout stylesheet owner');
  const landmark = fixture.get<HTMLElement>('main');
  expect(landmark.getAttribute('aria-label')).toBe('Review order');
  expect(landmark.querySelector('article')).not.toBeNull();
  expect(landmark.textContent).toContain('One configured object');
  expect(CheckoutLayoutStyleSelection.entries[0]?.id).toBe('app-checkout-layout');
  fixture.get<HTMLButtonElement>('button').click();
  expect(continuation).toHaveBeenCalledOnce();
  fixture.cleanup();
  expect(owner.disposed).toBe(true);
});
