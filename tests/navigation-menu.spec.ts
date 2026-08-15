import { afterEach, describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { NavigationMenu, navigationMenuStyles } from '@gluonjs/molecules';
import { createStyleManifest, prepareForHydration, renderStyleCarriers } from '@gluonjs/ssr';
import { hydrateTemplate } from '@gluonjs/ssr/hydration';
import { createComponentStyleSelection, getStyleSheetText, html, render, unmount } from '../src/index.js';

const items = [
  {
    id: 'shop',
    label: 'Shop',
    accessibleLabel: 'Open Shop navigation',
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
  it('renders native hierarchical links, controlled disclosure state, active state, and unavailable reasons', async () => {
    render(NavigationMenu({
      id: 'primary-navigation',
      label: 'Primary navigation',
      items: [...items, { id: 'soon', label: 'Soon', unavailable: true, unavailableReason: 'Launching later.' }],
      open: ['shop'],
    }), document.body);

    const nav = document.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Primary navigation');
    expect(nav.querySelectorAll(':scope > ul > li')).toHaveLength(3);
    expect(nav.querySelector('a[href="/shop"]')?.getAttribute('aria-current')).toBe('page');
    expect(nav.querySelector('#primary-navigation-shop-panel')?.hidden).toBe(false);
    expect(nav.querySelector('button[aria-controls="primary-navigation-shop-panel"]')?.getAttribute('aria-expanded')).toBe('true');
    const unavailable = nav.querySelector('[aria-describedby="primary-navigation-soon-unavailable"]');
    expect(unavailable?.getAttribute('aria-disabled')).toBe('true');
    expect(unavailable?.getAttribute('href')).toBeNull();
    expect(nav.querySelector('#primary-navigation-soon-unavailable')?.textContent).toBe('Launching later.');
    expect(document.adoptedStyleSheets).toContain(navigationMenuStyles);
    expect((await axe.run(nav)).violations).toEqual([]);
  });

  it('proposes controlled close state for trigger, Escape, and outside dismissal with focus return', () => {
    const proposed: string[][] = [];
    render(NavigationMenu({
      id: 'dismissible-navigation',
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
    unmount(document.body);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(proposed).toHaveLength(3);
  });

  it('namespaces derived ids per instance and rejects ambiguous item contracts', () => {
    render(html`${NavigationMenu({ id: 'first-navigation', label: 'First navigation', items })}${NavigationMenu({ id: 'second-navigation', label: 'Second navigation', items })}`, document.body);
    expect(document.querySelectorAll('#first-navigation-shop-panel')).toHaveLength(1);
    expect(document.querySelectorAll('#second-navigation-shop-panel')).toHaveLength(1);
    expect(new Set([...document.querySelectorAll('[id]')].map((element) => element.id)).size).toBe(document.querySelectorAll('[id]').length);
    expect(() => NavigationMenu({ id: 'invalid navigation', label: 'Invalid', items: [] })).toThrow(/must not contain whitespace/u);
    expect(() => NavigationMenu({ id: 'duplicate-navigation', label: 'Duplicate', items: [{ id: 'same', label: 'One' }, { id: 'same', label: 'Two' }] })).toThrow(/must be unique/u);
    expect(() => NavigationMenu({ id: 'unavailable-navigation', label: 'Unavailable', items: [{ id: 'soon', label: 'Soon', unavailable: true }] })).toThrow(/unavailableReason/u);
    expect(() => NavigationMenu({ id: 'linked-navigation', label: 'Linked', items: [{ id: 'shop', label: 'Shop', href: '/shop', children: [{ id: 'new', label: 'New' }] }] })).toThrow(/accessibleLabel/u);
  });

  it('opens a controlled group with directional focus after a retained rerender', async () => {
    let open: string[] = [];
    const view = () => NavigationMenu({
      id: 'controlled-navigation',
      label: 'Controlled navigation',
      items,
      open,
      onOpenChange: (next) => {
        open = [...next];
        render(view(), document.body);
      },
    });
    render(view(), document.body);
    document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="shop"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();
    expect(open).toEqual(['shop']);
    expect(document.activeElement).toBe(document.querySelector<HTMLAnchorElement>('#controlled-navigation-shop-panel > li > a[href="/shop"]'));
  });

  it('retains the exact hierarchy through hydration and replaces document listeners on rerender', async () => {
    const proposed: string[][] = [];
    const value = NavigationMenu({
      id: 'hydrated-navigation',
      label: 'Hydrated navigation',
      items,
      open: ['shop'],
      onOpenChange: (next) => proposed.push([...next]),
    });
    const prepared = await prepareForHydration(value);
    const host = document.createElement('section');
    const styleRoot = host.attachShadow({ mode: 'open' });
    const root = document.createElement('section');
    root.innerHTML = prepared.html;
    const manifest = createStyleManifest(createComponentStyleSelection(prepared.value));
    styleRoot.innerHTML = renderStyleCarriers(manifest);
    styleRoot.append(root);
    document.body.append(host);
    const nav = root.querySelector('nav');
    const result = await hydrateTemplate(prepared.value, root, { styleRoot, styles: manifest });
    expect(result.retained).toBe(true);
    expect(root.querySelector('nav')).toBe(nav);
    render(prepared.value, root);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(proposed).toEqual([[]]);
    unmount(root);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(proposed).toEqual([[]]);
  });

  it('traverses sibling items in document direction and supports nested Escape return', () => {
    render(NavigationMenu({
      id: 'rtl-navigation',
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
