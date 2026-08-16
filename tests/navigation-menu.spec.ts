import { afterEach, describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { NavigationMenu, navigationMenuStyles } from '@gluonjs/molecules';
import { createStyleManifest, prepareForHydration, renderStyleCarriers } from '@gluonjs/ssr';
import { hydrateTemplate } from '@gluonjs/ssr/hydration';
import { createComponentStyleSelection, getStyleSheetText, html, isTemplateResult, render, unmount } from '../src/index.js';

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
    expect(nav.querySelector<HTMLElement>('#primary-navigation-shop-panel')?.hidden).toBe(false);
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
    expect(() => NavigationMenu({ id: '', label: 'Invalid', items: [] })).toThrow(/non-empty/u);
    expect(() => NavigationMenu({ id: 'invalid-label', label: ' ', items: [] })).toThrow(/non-empty/u);
    expect(() => NavigationMenu({ id: 'invalid-item', label: 'Invalid', items: [{ id: 'two words', label: 'Invalid' }] })).toThrow(/must not contain whitespace/u);

    render(NavigationMenu({
      id: 'escaped-navigation',
      label: 'Escaped ids',
      items: [{ id: 'with_under+plus', label: 'Encoded', href: '#encoded' }],
    }), document.body);
    expect(document.querySelector('[data-navigation-menu-group="with_under+plus"]')).not.toBeNull();
  });

  it('preserves refs and native listeners while enforcing disabled and unavailable semantics', () => {
    const linkEvents: MouseEvent[] = [];
    const triggerEvents: MouseEvent[] = [];
    const proposed: string[][] = [];
    const rootRef = { value: undefined as HTMLElement | undefined };
    let intercepted = 0;
    render(NavigationMenu({
      id: 'state-navigation',
      label: 'State navigation',
      items: [
        {
          id: 'disabled-link',
          label: 'Disabled link',
          href: '/disabled',
          disabled: true,
          linkAttributes: { class: 'consumer-link', data: { consumer: 'link' }, tabIndex: 3, onClick: (event) => linkEvents.push(event) },
        },
        {
          id: 'unavailable-group',
          label: 'Unavailable group',
          accessibleLabel: 'Open unavailable group',
          href: '/unavailable',
          unavailable: true,
          unavailableReason: 'Not released.',
          triggerAttributes: { onClick: { handleEvent: (event) => triggerEvents.push(event) } },
          children: [{ id: 'unavailable-child', label: 'Child', href: '/child' }],
        },
        { id: 'plain-unavailable', label: 'Plain unavailable', unavailable: true, unavailableReason: 'Not released.' },
        { id: 'plain-disabled', label: 'Plain disabled', disabled: true },
        { id: 'disabled-group', label: 'Disabled group', disabled: true, children: [{ id: 'disabled-child', label: 'Child' }] },
        { id: 'active-link', label: 'Active link', href: '#active', active: true, linkAttributes: { onClick: { handleEvent: (event) => linkEvents.push(event) } } },
        { id: 'prevented-group', label: 'Prevented group', triggerAttributes: { onClick: (event) => event.preventDefault() }, children: [{ id: 'prevented-child', label: 'Child' }] },
      ],
      onOpenChange: (next) => proposed.push([...next]),
      attributes: {
        ref: rootRef,
        onKeydown: (event) => {
          intercepted += 1;
          event.preventDefault();
        },
      },
    }), document.body);

    expect(rootRef.value).toBe(document.querySelector('#state-navigation'));
    const disabledLink = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="disabled-link"]')!;
    expect(disabledLink.getAttribute('href')).toBeNull();
    expect(disabledLink.getAttribute('aria-disabled')).toBe('true');
    expect(disabledLink.tabIndex).toBe(-1);
    expect(disabledLink.classList).toContain('consumer-link');
    expect(disabledLink.dataset.consumer).toBe('link');
    expect(disabledLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(false);
    expect(linkEvents).toHaveLength(1);

    const unavailableLink = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="unavailable-group"]')!;
    expect(unavailableLink.getAttribute('aria-describedby')).toBe('state-navigation-unavailable-group-unavailable');
    expect(unavailableLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(false);
    const unavailableTrigger = document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="unavailable-group"]')!;
    expect(unavailableTrigger.getAttribute('aria-disabled')).toBe('true');
    expect(unavailableTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(false);
    expect(triggerEvents).toHaveLength(1);
    expect(proposed).toEqual([]);

    expect(document.querySelector('[data-navigation-menu-group="plain-unavailable"] > span')?.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('[data-navigation-menu-group="plain-disabled"] > span')?.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="disabled-group"]')?.disabled).toBe(true);
    const activeLink = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="active-link"]')!;
    expect(activeLink.getAttribute('aria-current')).toBe('page');
    expect(activeLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(true);
    expect(linkEvents).toHaveLength(2);
    expect(document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="prevented-group"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(false);
    expect(proposed).toEqual([]);

    unavailableTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(intercepted).toBe(1);
    expect(proposed).toEqual([]);
    unmount(document.body);
    expect(rootRef.value).toBeUndefined();
  });

  it('releases function refs and ignores stale, empty, inside, and detached event paths', async () => {
    const refs: Array<HTMLElement | undefined> = [];
    const proposed: string[][] = [];
    render(NavigationMenu({
      id: 'lifecycle-navigation',
      label: 'Lifecycle navigation',
      items,
      onOpenChange: (next) => proposed.push([...next]),
      attributes: { ref: (element) => refs.push(element) },
    }), document.body);
    const root = document.querySelector<HTMLElement>('#lifecycle-navigation')!;
    const trigger = root.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="shop"]')!;
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(proposed).toEqual([]);
    trigger.click();
    expect(proposed).toEqual([['shop']]);

    render(NavigationMenu({
      id: 'lifecycle-navigation',
      label: 'Lifecycle navigation',
      items,
      onOpenChange: (next) => proposed.push([...next]),
      attributes: { ref: (element) => refs.push(element) },
    }), document.body);
    const retainedTrigger = document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="shop"]')!;
    unmount(document.body);
    retainedTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    retainedTrigger.click();
    expect(refs.at(-1)).toBeUndefined();

    render(NavigationMenu({
      id: 'discarded-navigation',
      label: 'Discarded navigation',
      items,
      onOpenChange: () => unmount(document.body),
    }), document.body);
    document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="shop"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await Promise.resolve();
    expect(document.activeElement).toBe(document.body);
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

  it('opens a closed group upward and focuses its final available entry', async () => {
    let open: string[] = [];
    const view = () => NavigationMenu({
      id: 'upward-navigation',
      label: 'Upward navigation',
      items: [{
        id: 'group',
        label: 'Group',
        children: [
          { id: 'first', label: 'First', href: '#first' },
          { id: 'disabled', label: 'Disabled', href: '#disabled', disabled: true },
          { id: 'last', label: 'Last', href: '#last' },
        ],
      }],
      open,
      onOpenChange: (next) => {
        open = [...next];
        render(view(), document.body);
      },
    });
    render(view(), document.body);
    document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="group"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await Promise.resolve();
    expect(open).toEqual(['group']);
    expect(document.activeElement).toBe(document.querySelector<HTMLAnchorElement>('a[href="#last"]'));
  });

  it('implements sibling, boundary, hierarchy, and RTL keyboard traversal', () => {
    const proposed: string[][] = [];
    render(NavigationMenu({
      id: 'keyboard-navigation',
      label: 'Keyboard navigation',
      items,
      open: ['shop', 'nested'],
      onOpenChange: (next) => proposed.push([...next]),
    }), document.body);
    const shopLink = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="shop"]')!;
    const shopTrigger = document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="shop"]')!;
    const journal = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="journal"]')!;
    const all = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="all"]')!;
    const next = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="new"]')!;
    const nestedTrigger = document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="nested"]')!;
    const details = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="details"]')!;

    const press = (target: HTMLElement, key: string): void => {
      target.focus();
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    };
    press(journal, 'Home');
    expect(document.activeElement).toBe(shopLink);
    press(shopLink, 'End');
    expect(document.activeElement).toBe(journal);
    press(shopLink, 'ArrowDown');
    expect(document.activeElement).toBe(shopTrigger);
    press(shopLink, 'ArrowUp');
    expect(document.activeElement).toBe(journal);
    press(all, 'ArrowRight');
    expect(document.activeElement).toBe(next);
    press(details, 'ArrowLeft');
    expect(document.activeElement).toBe(nestedTrigger);
    expect(proposed.at(-1)).toEqual(['shop']);
    press(all, 'ArrowLeft');
    expect(document.activeElement).toBe(shopTrigger);
    expect(proposed.at(-1)).toEqual([]);
    press(all, 'PageDown');
    expect(document.activeElement).toBe(all);
    press(shopLink, 'ArrowLeft');
    expect(document.activeElement).toBe(journal);

    proposed.length = 0;
    shopTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(proposed).toEqual([]);

    unmount(document.body);
    render(NavigationMenu({
      id: 'rtl-keyboard-navigation',
      label: 'RTL keyboard navigation',
      items,
      open: ['shop'],
      attributes: { dir: 'rtl' },
    }), document.body);
    const rtlAll = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="all"]')!;
    const rtlNext = document.querySelector<HTMLAnchorElement>('[data-navigation-menu-item="new"]')!;
    press(rtlAll, 'ArrowLeft');
    expect(document.activeElement).toBe(rtlNext);
  });

  it('closes complete descendant chains without removing unrelated controlled entries', () => {
    const proposed: string[][] = [];
    render(NavigationMenu({
      id: 'descendant-navigation',
      label: 'Descendant navigation',
      items: [{
        id: 'parent',
        label: 'Parent',
        children: [{
          id: 'child',
          label: 'Child',
          children: [{ id: 'grandchild', label: 'Grandchild', href: '#grandchild' }],
        }],
      }, { id: 'unrelated', label: 'Unrelated', href: '#unrelated' }],
      open: ['parent', 'child', 'grandchild', 'unrelated'],
      onOpenChange: (next) => proposed.push([...next]),
    }), document.body);
    document.querySelector<HTMLButtonElement>('[data-navigation-menu-trigger="parent"]')!.click();
    expect(proposed).toEqual([['unrelated']]);
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
    if (!isTemplateResult(prepared.value)) throw new TypeError('NavigationMenu hydration must retain a template result.');
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
