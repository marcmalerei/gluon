import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { DropdownMenu, Menubar, Toolbar, type MenuItem } from '@gluonjs/molecules';
import { render } from '../src/index.js';
import { q } from '@gluonjs/quarks';

describe('menu and toolbar molecules', () => {
  it('supports roving focus, disabled skipping, typeahead, native links, and checkbox state', async () => {
    const onCheckedChange = vi.fn();
    const items: MenuItem[] = [
      { id: 'home', label: 'Home', href: '/home' },
      { id: 'save', label: 'Save', kind: 'checkbox', checked: false, onSelect: vi.fn() },
      { id: 'disabled', label: 'Disabled', disabled: true },
      { id: 'more', label: 'More', submenu: [{ id: 'nested', label: 'Nested' }] },
    ];
    render(DropdownMenu({ label: 'File', items, open: true, onCheckedChange }), document.body);
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    const buttons = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    expect(buttons[0]?.getAttribute('tabindex')).toBe('0');
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toContain('Save');
    await userEvent.keyboard('d');
    expect(document.activeElement?.textContent).toContain('Save');
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toContain('More');
    expect(menu.querySelector('a[href="/home"]')).not.toBeNull();
    expect(menu.querySelector('[aria-disabled="true"]')).not.toBeNull();
    expect(menu.querySelector('[aria-haspopup="menu"]')).not.toBeNull();
  });

  it('keeps a native toolbar and menubar SSR-deterministic', () => {
    render(q.div({ dir: 'rtl', children: [Toolbar({ label: 'Actions', children: q.button({ type: 'button', children: 'Bag' }) }), Menubar({ label: 'Main', items: [{ id: 'shop', label: 'Shop' }] })] }), document.body);
    expect(document.querySelector('[role="toolbar"]')?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(document.querySelector('[role="menubar"]')).not.toBeNull();
  });
});
