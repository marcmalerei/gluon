import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import axe from 'axe-core';
import { ContextMenu, DropdownMenu, Menubar, Toolbar, type MenuItem } from '@gluonjs/molecules';
import { q } from '@gluonjs/quarks';
import { render } from '../src/index.js';

beforeEach(() => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

const settle = async (): Promise<void> => { await Promise.resolve(); await new Promise((resolve) => setTimeout(resolve, 0)); };

describe('DropdownMenu', () => {
  it('opens from every trigger key, focuses first/last, and maintains true roving focus', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    let open = false;
    const items: MenuItem[] = [
      { id: 'new', label: 'New order' },
      { id: 'disabled', label: 'Disabled order', disabled: true },
      { id: 'open', label: 'Open order' },
      { id: 'separator', kind: 'separator' },
      { id: 'archive', label: 'Archive' },
    ];
    const view = () => DropdownMenu({ id: 'file-menu', label: 'File menu', trigger: 'File', open, items, onOpenChange: (next) => { open = next; render(view(), host); } });
    render(view(), host);
    const trigger = host.querySelector<HTMLButtonElement>('.gluon-menu-trigger')!;
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await settle();
    expect(document.activeElement?.textContent).toBe('New order');
    expect(host.querySelectorAll(`${'[role="menuitem"]'}[tabindex="0"]`)).toHaveLength(1);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toBe('Open order');
    await userEvent.keyboard('{End}');
    expect(document.activeElement?.textContent).toBe('Archive');
    await userEvent.keyboard('{Home}');
    expect(document.activeElement?.textContent).toBe('New order');
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(open).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('.gluon-menu-trigger'));
    host.querySelector<HTMLButtonElement>('.gluon-menu-trigger')!.focus();
    await userEvent.keyboard('{ArrowUp}');
    await settle();
    expect(document.activeElement?.textContent).toBe('Archive');
    await userEvent.keyboard('{Escape}');
    await settle();
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(document.activeElement?.textContent).toBe('New order');
    await userEvent.keyboard('{Escape}');
    await settle();
    await userEvent.keyboard('{Space}');
    await settle();
    expect(document.activeElement?.textContent).toBe('New order');
  });

  it('requests controlled state once without mutating the authoritative closed render', async () => {
    const onOpenChange = vi.fn();
    render(DropdownMenu({ id: 'controlled-menu', label: 'Controlled', trigger: 'Open', open: false, items: [{ id: 'one', label: 'One' }], onOpenChange }), document.body);
    document.querySelector<HTMLButtonElement>('.gluon-menu-trigger')!.click();
    await settle();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(true);
    expect(document.querySelector<HTMLElement>('[role="menu"]')?.hidden).toBe(true);
    expect(document.querySelector('.gluon-menu-trigger')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('buffers typeahead, cycles repeated characters, and activates with Enter/Space', async () => {
    const selected = vi.fn();
    const items: MenuItem[] = [
      { id: 'apple', label: 'Apple', onSelect: selected },
      { id: 'apricot', label: 'Apricot', onSelect: selected },
      { id: 'banana', label: 'Banana', onSelect: selected },
      { id: 'blueberry', label: 'Blueberry', onSelect: selected },
    ];
    render(DropdownMenu({ id: 'fruit-menu', label: 'Fruit', trigger: 'Fruit', open: true, items, onOpenChange: vi.fn() }), document.body);
    const first = document.querySelector<HTMLElement>('[role="menuitem"]')!;
    first.focus();
    await userEvent.keyboard('b');
    expect(document.activeElement?.textContent).toBe('Banana');
    await userEvent.keyboard('b');
    expect(document.activeElement?.textContent).toBe('Blueberry');
    await new Promise((resolve) => setTimeout(resolve, 510));
    await userEvent.keyboard('ap');
    expect(document.activeElement?.textContent).toBe('Apple');
    await userEvent.keyboard('{Enter}');
    expect(selected).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Space}');
    expect(selected).toHaveBeenCalledTimes(2);
  });

  it('uses checkbox/radio roles and never toggles a selected radio false', async () => {
    const changes = vi.fn();
    render(DropdownMenu({
      id: 'view-menu', label: 'View', trigger: 'View', open: true, onOpenChange: vi.fn(), onCheckedChange: changes,
      items: [
        { id: 'details', kind: 'checkbox', label: 'Details', checked: false },
        { id: 'comfortable', kind: 'radio', group: 'density', label: 'Comfortable', checked: true },
        { id: 'compact', kind: 'radio', group: 'density', label: 'Compact', checked: false },
      ],
    }), document.body);
    const checkbox = document.querySelector<HTMLButtonElement>('[role="menuitemcheckbox"]')!;
    const radios = document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
    expect(radios[0]?.dataset.radioGroup).toBe('density');
    checkbox.click();
    radios[0]!.click();
    radios[1]!.click();
    expect(changes.mock.calls.map(([change]) => change)).toEqual([
      { id: 'details', kind: 'checkbox', checked: true },
      { id: 'comfortable', kind: 'radio', group: 'density', checked: true },
      { id: 'compact', kind: 'radio', group: 'density', checked: true },
    ]);
  });

  it('links nested submenus, opens/closes them in RTL, and returns focus to the parent', async () => {
    const host = document.createElement('div');
    host.dir = 'rtl';
    document.body.append(host);
    let expanded = false;
    const view = () => DropdownMenu({
      id: 'nested-menu', label: 'Nested', trigger: 'Actions', open: true, onOpenChange: vi.fn(),
      onSubmenuOpenChange: (_id, next) => { expanded = next; render(view(), host); },
      items: [{ id: 'share', label: 'Share', expanded, submenu: [{ id: 'email', label: 'Email' }] }],
    });
    render(view(), host);
    const parent = host.querySelector<HTMLElement>('[role="menuitem"]')!;
    parent.focus();
    expect(parent.getAttribute('aria-controls')).toBe('nested-menu-menu-share');
    await userEvent.keyboard('{ArrowLeft}');
    await settle();
    expect(expanded).toBe(true);
    expect(document.activeElement?.textContent).toBe('Email');
    await userEvent.keyboard('{ArrowRight}');
    await settle();
    expect(expanded).toBe(false);
    expect(document.activeElement?.textContent).toContain('Share');
    await userEvent.keyboard('{ArrowLeft}');
    await settle();
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(expanded).toBe(false);
    expect(document.activeElement?.textContent).toContain('Share');
  });
});

describe('ContextMenu, Menubar, and Toolbar', () => {
  it('opens a context menu for pointer and keyboard targets with exact dismissal ownership', async () => {
    const host = document.createElement('div');
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.append(host, outside);
    let open = false;
    const changes: boolean[] = [];
    const view = () => ContextMenu({ id: 'card-context', label: 'Card actions', open, children: q.span({ data: { nativeTargetContent: true }, children: 'Order card' }), items: [{ id: 'duplicate', label: 'Duplicate' }], onOpenChange: (next) => { changes.push(next); open = next; render(view(), host); } });
    render(view(), host);
    expect(host.querySelector('.gluon-menu-trigger')).toBeNull();
    const target = host.querySelector<HTMLElement>('.gluon-context-menu-target')!;
    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 12, clientY: 18 }));
    await settle();
    expect(open).toBe(true);
    expect(document.activeElement?.textContent).toBe('Duplicate');
    expect(host.querySelector('[data-native-target-content]')?.textContent).toBe('Order card');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const contextRoot = host.querySelector<HTMLElement>('.gluon-context-menu')!;
    const positionedMenu = host.querySelector<HTMLElement>('[role="menu"]')!;
    expect(Number.parseFloat(contextRoot.style.getPropertyValue('--gluon-context-menu-x'))).toBeGreaterThanOrEqual(8);
    expect(Number.parseFloat(contextRoot.style.getPropertyValue('--gluon-context-menu-x'))).toBeLessThanOrEqual(12);
    expect(positionedMenu.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    expect(positionedMenu.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    outside.focus();
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await settle();
    expect(open).toBe(false);
    expect(document.activeElement).toBe(outside);
    target.focus();
    await userEvent.keyboard('{Shift>}{F10}{/Shift}');
    await settle();
    expect(open).toBe(true);
    expect(document.activeElement?.textContent).toBe('Duplicate');
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(open).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('.gluon-context-menu-target'));
    expect(changes).toEqual([true, false, true, false]);
  });

  it('renders a direct APG menubar and honors horizontal RTL and submenu movement', async () => {
    const host = document.createElement('div');
    host.dir = 'rtl';
    document.body.append(host);
    let expanded = false;
    const view = () => Menubar({ id: 'main-menubar', label: 'Main', onSubmenuOpenChange: (_id, next) => { expanded = next; render(view(), host); }, items: [
      { id: 'file', label: 'File', expanded, submenu: [{ id: 'new', label: 'New' }] },
      { id: 'edit', label: 'Edit' },
      { id: 'help', label: 'Help', href: '/help' },
    ] });
    render(view(), host);
    const menubar = host.querySelector<HTMLElement>('[role="menubar"]')!;
    expect(menubar.querySelector('.gluon-menu-trigger')).toBeNull();
    const file = menubar.querySelector<HTMLElement>(':scope > li > [role="menuitem"]')!;
    file.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement?.textContent).toBe('Edit');
    await userEvent.keyboard('{Home}');
    expect(document.activeElement?.textContent).toContain('File');
    await userEvent.keyboard('{ArrowDown}');
    await settle();
    expect(document.activeElement?.textContent).toBe('New');
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(expanded).toBe(false);
    expect(document.activeElement?.textContent).toContain('File');
  });

  it('honors vertical menubar movement, disabled items, End, and typeahead', async () => {
    render(Menubar({ id: 'vertical-menubar', label: 'Tools', orientation: 'vertical', items: [
      { id: 'alpha', label: 'Alpha' },
      { id: 'disabled', label: 'Disabled', disabled: true },
      { id: 'beta', label: 'Beta' },
      { id: 'build', label: 'Build' },
    ] }), document.body);
    const menubar = document.querySelector<HTMLElement>('[role="menubar"]')!;
    const alpha = menubar.querySelector<HTMLElement>('[data-value="alpha"]')!;
    alpha.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toBe('Beta');
    await userEvent.keyboard('b');
    expect(document.activeElement?.textContent).toBe('Build');
    await userEvent.keyboard('{End}');
    expect(document.activeElement?.textContent).toBe('Build');
    expect(menubar.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });

  it('keeps one enabled native toolbar control tabbable and preserves activation', async () => {
    const activated = vi.fn();
    const host = document.createElement('div');
    host.dir = 'rtl';
    document.body.append(host);
    const rootKeydown = vi.fn();
    const toolbarRef: { value?: HTMLDivElement } = {};
    render(Toolbar({ id: 'editor-toolbar', label: 'Editor', attributes: { ref: toolbarRef, data: { owner: 'caller' }, aria: { describedby: 'toolbar-help' }, onKeydown: rootKeydown }, items: [
      { id: 'bold', label: 'Bold', attributes: { name: 'format', data: { callerItem: true } }, onActivate: activated },
      { id: 'disabled', label: 'Disabled', disabled: true },
      { id: 'help', kind: 'link', label: 'Help', href: '/help' },
      { id: 'disabled-link', kind: 'link', label: 'Disabled link', href: '/forbidden', disabled: true },
    ] }), host);
    const toolbar = host.querySelector<HTMLElement>('[role="toolbar"]')!;
    const controls = toolbar.querySelectorAll<HTMLElement>('[data-gluon-toolbar-item]');
    expect(toolbar.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(controls[0]?.tagName).toBe('BUTTON');
    expect(controls[2]?.tagName).toBe('A');
    expect(toolbar.dataset.owner).toBe('caller');
    expect(toolbarRef.value).toBe(toolbar);
    expect(toolbar.getAttribute('aria-describedby')).toBe('toolbar-help');
    expect(controls[0]?.dataset.callerItem).toBe('true');
    expect(controls[0]?.getAttribute('name')).toBe('format');
    controls[0]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(controls[2]);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(controls[0]);
    controls[0]!.click();
    expect(activated).toHaveBeenCalledTimes(1);
    const disabledClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    expect(controls[3]!.dispatchEvent(disabledClick)).toBe(false);
    expect(disabledClick.defaultPrevented).toBe(true);
    expect(rootKeydown).toHaveBeenCalled();
  });

  it('moves a vertical toolbar with native controls and skips disabled entries', async () => {
    render(Toolbar({ id: 'vertical-toolbar', label: 'Vertical actions', orientation: 'vertical', items: [
      { id: 'first', label: 'First' },
      { id: 'disabled', label: 'Disabled', disabled: true },
      { id: 'last', kind: 'link', label: 'Last', href: '#last' },
    ] }), document.body);
    const controls = document.querySelectorAll<HTMLElement>('[data-gluon-toolbar-item]');
    controls[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(controls[2]);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(controls[0]);
  });

  it('keeps duplicate labels collision-safe and passes automated WCAG checks', async () => {
    const firstHost = document.createElement('div');
    const secondHost = document.createElement('div');
    document.body.append(firstHost, secondHost);
    render(DropdownMenu({ id: 'first-actions', label: 'Actions', trigger: 'Actions', open: true, onOpenChange: vi.fn(), items: [{ id: 'open', label: 'Open' }] }), firstHost);
    render(DropdownMenu({ id: 'second-actions', label: 'Actions', trigger: 'Actions', open: false, onOpenChange: vi.fn(), items: [{ id: 'open', label: 'Open' }] }), secondHost);
    expect(document.querySelectorAll('#first-actions-menu')).toHaveLength(1);
    expect(document.querySelectorAll('#second-actions-menu')).toHaveLength(1);
    expect(document.querySelectorAll('[id="first-actions-item-open"]')).toHaveLength(1);
    const results = await axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    expect(results.violations).toEqual([]);
  });

  it('preserves the active roving item across controlled rerenders and aborts dismissal on teardown', async () => {
    const menuHost = document.createElement('div');
    const outside = document.createElement('button');
    document.body.append(menuHost, outside);
    const onOpenChange = vi.fn();
    render(DropdownMenu({
      id: 'teardown-menu',
      label: 'Actions',
      trigger: 'Actions',
      open: true,
      onOpenChange,
      items: [{ id: 'open', label: 'Open' }],
    }), menuHost);
    render(q.div({ children: 'removed' }), menuHost);
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(onOpenChange).not.toHaveBeenCalled();

    const toolbarHost = document.createElement('div');
    document.body.append(toolbarHost);
    const toolbarView = () => Toolbar({
      id: 'rerender-toolbar',
      label: 'Actions',
      items: [
        { id: 'first', label: 'First' },
        { id: 'current', label: 'Current' },
      ],
    });
    render(toolbarView(), toolbarHost);
    const current = toolbarHost.querySelector<HTMLElement>('[data-value="current"]')!;
    current.focus();
    render(toolbarView(), toolbarHost);
    await settle();
    expect(document.activeElement).toBe(current);
    expect(current.tabIndex).toBe(0);
    expect(toolbarHost.querySelectorAll('[data-gluon-toolbar-item][tabindex="0"]')).toHaveLength(1);

    const menubarHost = document.createElement('div');
    document.body.append(menubarHost);
    const menubarView = () => Menubar({
      id: 'rerender-menubar',
      label: 'Navigation',
      items: [{ id: 'first', label: 'First' }, { id: 'current', label: 'Current' }],
    });
    render(menubarView(), menubarHost);
    const currentMenuItem = menubarHost.querySelector<HTMLElement>('[data-value="current"]')!;
    currentMenuItem.focus();
    render(menubarView(), menubarHost);
    await settle();
    expect(document.activeElement).toBe(currentMenuItem);
    expect(currentMenuItem.tabIndex).toBe(0);
  });
});
