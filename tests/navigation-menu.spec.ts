import { afterEach, describe, expect, it } from 'vitest';
import { NavigationMenu, navigationMenuStyles } from '@gluonjs/molecules';
import { getStyleSheetText, render, unmount } from '../src/index.js';

const items = [
  {
    id: 'shop',
    label: 'Shop',
    href: '/shop',
    active: true,
    children: [
      { id: 'all', label: 'All objects', href: '/shop' },
      { id: 'new', label: 'New arrivals', href: '/shop?sort=new' },
      { id: 'nested', label: 'More', children: [{ id: 'details', label: 'Details', href: '/details' }] },
    ],
  },
  { id: 'journal', label: 'Journal', href: '#journal' },
] as const;

afterEach(() => {
  unmount(document.body);
  document.body.replaceChildren();
});

describe('NavigationMenu', () => {
  it('renders native hierarchical links, controlled disclosure state, active state, and unavailable reasons', () => {
    render(NavigationMenu({
      label: 'Primary navigation',
      items: [...items, { id: 'soon', label: 'Soon', unavailable: true, unavailableReason: 'Launching later.' }],
      open: ['shop'],
    }), document.body);

    const nav = document.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Primary navigation');
    expect(nav.querySelectorAll(':scope > ul > li')).toHaveLength(3);
    expect(nav.querySelector('a[href="/shop"]')?.getAttribute('aria-current')).toBe('page');
    expect(nav.querySelector('#shop-panel')?.hidden).toBe(false);
    expect(nav.querySelector('button[aria-controls="shop-panel"]')?.getAttribute('aria-expanded')).toBe('true');
    const unavailable = nav.querySelector('[aria-describedby="soon-unavailable"]');
    expect(unavailable?.getAttribute('aria-disabled')).toBe('true');
    expect(unavailable?.getAttribute('href')).toBeNull();
    expect(nav.querySelector('#soon-unavailable')?.textContent).toBe('Launching later.');
    expect(document.adoptedStyleSheets).toContain(navigationMenuStyles);
  });

  it('proposes controlled close state for trigger, Escape, and outside dismissal with focus return', () => {
    const proposed: string[][] = [];
    render(NavigationMenu({
      label: 'Primary navigation',
      items,
      open: ['shop'],
      onOpenChange: (next) => proposed.push([...next]),
    }), document.body);
    const trigger = document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="shop"]')!;
    trigger.focus();
    trigger.click();
    expect(proposed).toEqual([[]]);
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(proposed).toEqual([[], []]);
    expect(document.activeElement).toBe(trigger);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(proposed).toHaveLength(3);
  });

  it('traverses sibling items in document direction and supports nested Escape return', () => {
    render(NavigationMenu({
      label: 'Primary navigation',
      items,
      open: ['shop', 'nested'],
      attributes: { dir: 'rtl' },
    }), document.body);
    const shop = document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="shop"]')!;
    const nested = document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="nested"]')!;
    nested.focus();
    nested.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(shop);
    expect(getStyleSheetText(navigationMenuStyles)).toContain('prefers-reduced-motion');
    expect(getStyleSheetText(navigationMenuStyles)).toContain('forced-colors');
  });
});
