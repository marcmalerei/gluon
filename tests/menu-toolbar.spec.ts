import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import axe from 'axe-core';
import { ContextMenu, DropdownMenu, Menubar, Toolbar, type MenuItem } from '@gluonjs/molecules';
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
  });
});

describe('ContextMenu, Menubar, and Toolbar', () => {
  it('opens a context menu without a trigger and restores target focus on Escape', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    let open = false;
    const view = () => ContextMenu({ id: 'card-context', label: 'Card actions', open, children: 'Order card', items: [{ id: 'duplicate', label: 'Duplicate' }], onOpenChange: (next) => { open = next; render(view(), host); } });
    render(view(), host);
    expect(host.querySelector('.gluon-menu-trigger')).toBeNull();
    const target = host.querySelector<HTMLElement>('.gluon-context-menu-target')!;
    target.focus();
    await userEvent.keyboard('{Shift>}{F10}{/Shift}');
    await settle();
    expect(open).toBe(true);
    expect(document.activeElement?.textContent).toBe('Duplicate');
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(open).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('.gluon-context-menu-target'));
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
  });

  it('keeps one enabled native toolbar control tabbable and preserves activation', async () => {
    const activated = vi.fn();
    const host = document.createElement('div');
    host.dir = 'rtl';
    document.body.append(host);
    render(Toolbar({ id: 'editor-toolbar', label: 'Editor', items: [
      { id: 'bold', label: 'Bold', onActivate: activated },
      { id: 'disabled', label: 'Disabled', disabled: true },
      { id: 'help', kind: 'link', label: 'Help', href: '/help' },
    ] }), host);
    const toolbar = host.querySelector<HTMLElement>('[role="toolbar"]')!;
    const controls = toolbar.querySelectorAll<HTMLElement>('[data-gluon-toolbar-item]');
    expect(toolbar.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(controls[0]?.tagName).toBe('BUTTON');
    expect(controls[2]?.tagName).toBe('A');
    controls[0]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(controls[2]);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(controls[0]);
    controls[0]!.click();
    expect(activated).toHaveBeenCalledTimes(1);
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
});
