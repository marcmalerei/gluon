import axe from 'axe-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ResponsiveActionBar } from '@gluonjs/molecules';
import { q } from '@gluonjs/quarks';
import { render } from '../src/index.js';

beforeEach(() => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('ResponsiveActionBar', () => {
  it('renders the minimal ready contract without manufacturing a live region', () => {
    render(ResponsiveActionBar({
      summary: 'Ready to continue',
      primaryAction: q.button({ type: 'button', children: 'Continue' }),
    }), document.body);

    const root = document.querySelector<HTMLElement>('.gluon-responsive-action-bar')!;
    expect(root.tagName).toBe('SECTION');
    expect(root.dataset.state).toBe('ready');
    expect(root.dataset.presentation).toBe('sticky');
    expect(root.getAttribute('aria-busy')).toBe('false');
    expect(root.hasAttribute('aria-disabled')).toBe(false);
    expect(root.querySelector('[role="status"], [role="alert"]')).toBeNull();
    expect(root.querySelectorAll('button')).toHaveLength(1);
  });

  it('maps controlled states, optional content, attributes, and presentation exactly once', async () => {
    const renderState = (state: 'loading' | 'disabled' | 'error') => ResponsiveActionBar({
      summary: 'Checkout summary',
      status: state === 'error' ? 'Please fix the form.' : 'Saving changes',
      state,
      presentation: 'inline',
      compactControl: q.button({ type: 'button', children: 'Details' }),
      primaryAction: q.button({ type: 'button', disabled: state !== 'error', children: 'Continue' }),
      attributes: {
        class: 'checkout-action-bar',
        data: { owner: 'checkout' },
        aria: { describedby: 'checkout-help' },
      },
    });

    render(renderState('loading'), document.body);
    let root = document.querySelector<HTMLElement>('.gluon-responsive-action-bar')!;
    expect(root.classList.contains('checkout-action-bar')).toBe(true);
    expect(root.classList.contains('is-inline')).toBe(true);
    expect(root.dataset.owner).toBe('checkout');
    expect(root.getAttribute('aria-describedby')).toBe('checkout-help');
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.hasAttribute('aria-disabled')).toBe(false);
    expect(root.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    expect(root.querySelectorAll('button')).toHaveLength(2);

    render(renderState('disabled'), document.body);
    root = document.querySelector<HTMLElement>('.gluon-responsive-action-bar')!;
    expect(root.getAttribute('aria-busy')).toBe('false');
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelector('[role="status"]')?.getAttribute('aria-atomic')).toBe('true');

    render(renderState('error'), document.body);
    root = document.querySelector<HTMLElement>('.gluon-responsive-action-bar')!;
    expect(root.getAttribute('aria-busy')).toBe('false');
    expect(root.hasAttribute('aria-disabled')).toBe(false);
    expect(root.querySelector('[role="alert"]')?.getAttribute('aria-live')).toBe('assertive');
    expect(root.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1);
    expect((await axe.run(root)).violations).toEqual([]);
  });

  it('fails closed for invalid state and presentation values', () => {
    const primaryAction = q.button({ type: 'button', children: 'Continue' });
    expect(() => ResponsiveActionBar({
      summary: 'Invalid state',
      primaryAction,
      state: 'queued' as never,
    })).toThrow('ResponsiveActionBar state must be ready, loading, disabled, or error; received queued.');
    expect(() => ResponsiveActionBar({
      summary: 'Invalid presentation',
      primaryAction,
      presentation: 'fixed' as never,
    })).toThrow('ResponsiveActionBar presentation must be sticky or inline; received fixed.');
  });
});
