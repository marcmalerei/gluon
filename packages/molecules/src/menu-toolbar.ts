import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { menuToolbarStyleDependency } from './menu-toolbar-styles.js';

export type MenuItemKind = 'item' | 'checkbox' | 'radio' | 'separator';
export interface MenuItem {
  readonly id: string;
  readonly label?: TemplateValue;
  readonly kind?: MenuItemKind;
  readonly disabled?: boolean;
  readonly checked?: boolean;
  readonly href?: string;
  readonly target?: string;
  readonly submenu?: readonly MenuItem[];
  readonly onSelect?: (event: MouseEvent | KeyboardEvent) => void;
}
export type MenuAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | 'aria'>;
export interface MenuProps {
  readonly label: string;
  readonly items: readonly MenuItem[];
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean, event?: Event) => void;
  readonly onCheckedChange?: (id: string, checked: boolean, event: Event) => void;
  readonly attributes?: MenuAttributes;
}
export interface ContextMenuProps extends MenuProps { readonly children: TemplateValue; }
export interface MenubarProps extends Omit<MenuProps, 'open' | 'onOpenChange'> { readonly orientation?: 'horizontal' | 'vertical'; }
export interface ToolbarProps {
  readonly label: string;
  readonly children: TemplateValue;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly attributes?: MenuAttributes;
}

const itemId = (id: string): string => `gluon-menu-item-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

function renderMenu({ label, items, open = false, onOpenChange, onCheckedChange, attributes = {} }: MenuProps, mode: 'dropdown' | 'menubar' = 'dropdown'): TemplateResult {
  const rootId = attributes.id ?? `gluon-menu-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const triggerId = `${rootId}-trigger`;
  const menuId = `${rootId}-content`;
  const trigger = q.button({ id: triggerId, type: 'button', class: 'gluon-menu-trigger', aria: { haspopup: 'menu', expanded: open, controls: menuId }, children: label,
    onClick: (event) => { const next = !root?.querySelector<HTMLElement>('[role="menu"]')?.hidden; setOpen(!next, event); } });
  let root: HTMLElement | undefined;
  const setOpen = (next: boolean, event?: Event): void => { const menu = root?.querySelector<HTMLElement>('[role="menu"]'); const button = root?.querySelector<HTMLButtonElement>('.gluon-menu-trigger'); if (menu) menu.hidden = !next; button?.setAttribute('aria-expanded', String(next)); onOpenChange?.(next, event); if (!next) button?.focus(); };
  const handleKeydown = (event: KeyboardEvent): void => {
    const menu = event.currentTarget as HTMLElement;
    const enabled = [...menu.querySelectorAll<HTMLElement>(':scope > [role="menuitem"]:not([aria-disabled="true"])')];
    const current = document.activeElement as HTMLElement;
    const index = enabled.indexOf(current);
    const rtl = getComputedStyle(menu).direction === 'rtl';
    const next = event.key === 'ArrowDown' || (mode === 'menubar' && ((event.key === 'ArrowRight' && !rtl) || (event.key === 'ArrowLeft' && rtl)));
    const previous = event.key === 'ArrowUp' || (mode === 'menubar' && ((event.key === 'ArrowLeft' && !rtl) || (event.key === 'ArrowRight' && rtl)));
    if (next || previous || event.key === 'Home' || event.key === 'End') { event.preventDefault(); const target = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(index + (next ? 1 : -1) + enabled.length) % enabled.length]; target?.focus(); return; }
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false, event); return; }
    if (event.key.length === 1 && /\S/.test(event.key)) { const match = enabled.find((element) => element.textContent?.trim().toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase())); match?.focus(); }
  };
  const renderItems = (list: readonly MenuItem[]): TemplateValue => list.map((item, index) => {
    if (item.kind === 'separator') return q.div({ role: 'separator', class: 'gluon-menu-separator', id: itemId(item.id) });
    const hasSubmenu = Boolean(item.submenu?.length);
    const itemProps = { id: itemId(item.id), class: { 'gluon-menu-item': true, 'has-submenu': hasSubmenu }, role: 'menuitem', tabIndex: index === 0 ? 0 : -1, aria: { disabled: item.disabled, checked: item.kind === 'checkbox' || item.kind === 'radio' ? item.checked : undefined, haspopup: hasSubmenu ? 'menu' : undefined }, data: { kind: item.kind ?? 'item', value: item.id }, onClick: (event: MouseEvent) => { if (item.disabled) return; if (hasSubmenu) { const submenu = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(':scope > [role="menu"]'); if (submenu) submenu.hidden = false; return; } if (item.kind === 'checkbox' || item.kind === 'radio') onCheckedChange?.(item.id, !item.checked, event); item.onSelect?.(event); if (!hasSubmenu) setOpen(false, event); }, onKeydown: (event: KeyboardEvent) => { if (event.key === 'ArrowRight' && hasSubmenu) { const submenu = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(':scope > [role="menu"]'); if (submenu) { submenu.hidden = false; submenu.querySelector<HTMLElement>('[role="menuitem"]')?.focus(); } } } };
    const content = item.href ? q.a({ ...itemProps, href: item.href, target: item.target, children: item.label }) : q.button({ ...itemProps, type: 'button', children: item.label });
    return q.li({ role: 'none', children: [content, hasSubmenu ? q.ul({ role: 'menu', hidden: true, children: renderItems(item.submenu!) }) : null] });
  });
  return q.div({ ...attributes, id: rootId, role: mode === 'menubar' ? 'menubar' : undefined, class: [{ gluon: true, molecule: true, 'gluon-menu': true, [`is-${mode}`]: true }, attributes.class], ref: (element) => { root = element; }, children: [trigger, q.ul({ id: menuId, role: 'menu', hidden: !open, aria: { labelledby: triggerId }, onKeydown: handleKeydown, children: renderItems(items) })] });
}

export const DropdownMenu = defineMolecule((props: MenuProps) => renderMenu(props), 'DropdownMenu', [menuToolbarStyleDependency]);
export const Menubar = defineMolecule((props: MenubarProps) => renderMenu(props, 'menubar'), 'Menubar', [menuToolbarStyleDependency]);
export const ContextMenu = defineMolecule(({ children, ...props }: ContextMenuProps) => q.div({ class: 'gluon-context-menu-target', onContextMenu: (event: MouseEvent) => { event.preventDefault(); props.onOpenChange?.(true, event); }, children: [children, renderMenu({ ...props, open: true })] }), 'ContextMenu', [menuToolbarStyleDependency]);
export const Toolbar = defineMolecule(({ label, children, orientation = 'horizontal', attributes = {} }: ToolbarProps) => q.div({ ...attributes, role: 'toolbar', class: [{ gluon: true, molecule: true, 'gluon-toolbar': true, [`is-${orientation}`]: true }, attributes.class], aria: { label, orientation }, children }), 'Toolbar', [menuToolbarStyleDependency]);
