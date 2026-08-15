import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { menuToolbarStyleDependency } from './menu-toolbar-styles.js';
import { callListener, connectDismissal, enabledMenuItems, isDisabled, itemDomId, menuDomId, menuItemSelector, moveFocus, runTypeahead, safeId, scheduleFocus, setRoving, type TypeaheadState } from './menu-interactions.js';

type MenuEvent = MouseEvent | KeyboardEvent;
type Orientation = 'horizontal' | 'vertical';
type MenuNativeAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role'>;
type MenubarAttributes = Omit<QuarkProps<HTMLUListElement>, 'children' | 'role'>;
type MenuTriggerAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'type' | 'role'>;
type MenuItemAttributes<ElementType extends HTMLElement> = Omit<QuarkProps<ElementType>, 'children' | 'role' | 'tabIndex'>;

interface MenuItemBase {
  readonly id: string;
  readonly label: TemplateValue;
  readonly textValue?: string;
  readonly disabled?: boolean;
  readonly submenu?: readonly MenuItem[];
  /** Controlled submenu state. Required by applications that expose a submenu. */
  readonly expanded?: boolean;
}

export interface MenuActionItem extends MenuItemBase {
  readonly kind?: 'item';
  readonly href?: string;
  readonly target?: string;
  readonly attributes?: MenuItemAttributes<HTMLButtonElement | HTMLAnchorElement>;
  readonly onSelect?: (event: MenuEvent) => void;
}

export interface MenuCheckboxItem extends MenuItemBase {
  readonly kind: 'checkbox';
  readonly checked: boolean;
  readonly attributes?: MenuItemAttributes<HTMLButtonElement>;
}

export interface MenuRadioItem extends MenuItemBase {
  readonly kind: 'radio';
  /** Stable application-owned radio group key. */
  readonly group: string;
  readonly checked: boolean;
  readonly attributes?: MenuItemAttributes<HTMLButtonElement>;
}

export interface MenuSeparatorItem {
  readonly id: string;
  readonly kind: 'separator';
}

export type MenuItem = MenuActionItem | MenuCheckboxItem | MenuRadioItem | MenuSeparatorItem;
export type MenuItemKind = MenuItem['kind'];

export interface MenuCheckedChange {
  readonly id: string;
  readonly kind: 'checkbox' | 'radio';
  readonly group?: string;
  readonly checked: boolean;
}

interface MenuCallbacks {
  readonly onCheckedChange?: (change: MenuCheckedChange, event: MenuEvent) => void;
  readonly onSubmenuOpenChange?: (id: string, open: boolean, event: MenuEvent) => void;
}

export interface DropdownMenuProps extends MenuCallbacks {
  /** Stable, instance-unique ID used for every ARIA relationship. */
  readonly id: string;
  readonly label: string;
  readonly trigger: TemplateValue;
  readonly items: readonly MenuItem[];
  /** Authoritative controlled open state. */
  readonly open: boolean;
  readonly onOpenChange: (open: boolean, event: Event) => void;
  readonly attributes?: MenuNativeAttributes;
  readonly triggerAttributes?: MenuTriggerAttributes;
}

/** @deprecated Use DropdownMenuProps. */
export type MenuProps = DropdownMenuProps;
export type MenuAttributes = MenuNativeAttributes;

export interface ContextMenuProps extends MenuCallbacks {
  readonly id: string;
  readonly label: string;
  readonly children: TemplateValue;
  readonly items: readonly MenuItem[];
  readonly open: boolean;
  readonly onOpenChange: (open: boolean, event: Event) => void;
  readonly attributes?: MenuNativeAttributes;
  readonly targetAttributes?: MenuNativeAttributes;
}

export interface MenubarProps extends MenuCallbacks {
  readonly id: string;
  readonly label: string;
  readonly items: readonly MenuItem[];
  readonly orientation?: Orientation;
  readonly attributes?: MenubarAttributes;
}

interface RenderMenuOptions extends MenuCallbacks {
  readonly instanceId: string;
  readonly items: readonly MenuItem[];
  readonly path?: readonly string[];
  readonly hidden: boolean;
  readonly labelledBy?: string;
  readonly label?: string;
  readonly closeRoot?: (event: MenuEvent) => void;
}

function assignRef<ElementType extends Element>(ref: QuarkRef<ElementType> | undefined, element: ElementType | undefined): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}

function renderMenu(options: RenderMenuOptions): TemplateResult {
  const path = options.path ?? [];
  const id = menuDomId(options.instanceId, path);
  const typeahead: TypeaheadState = { buffer: '', at: 0 };
  return q.ul({
    id,
    role: 'menu',
    hidden: options.hidden,
    class: 'gluon-menu-surface',
    part: path.length ? 'submenu' : 'menu',
    data: { level: path.length, state: options.hidden ? 'closed' : 'open' },
    aria: { label: options.label, labelledby: options.labelledBy },
    ref: (menu) => { if (menu) queueMicrotask(() => setRoving(menu)); },
    onFocusIn: (event) => {
      const menu = event.currentTarget as HTMLElement;
      const item = (event.target as Element).closest<HTMLElement>(menuItemSelector);
      if (item && item.closest('[role="menu"]') === menu && !isDisabled(item)) setRoving(menu, item);
    },
    onKeydown: (event) => handleMenuKeydown(event, options, typeahead),
    children: renderMenuItems(options, path),
  });
}

function renderMenuItems(options: RenderMenuOptions, path: readonly string[]): TemplateValue {
  const firstEnabled = options.items.find((item) => item.kind !== 'separator' && !item.disabled);
  return options.items.map((item) => {
    const itemPath = [...path, item.id];
    if (item.kind === 'separator') return q.li({ role: 'separator', id: itemDomId(options.instanceId, itemPath), class: 'gluon-menu-separator', part: 'separator' });
    const hasSubmenu = Boolean(item.submenu?.length);
    const itemId = itemDomId(options.instanceId, itemPath);
    const childMenuId = hasSubmenu ? menuDomId(options.instanceId, itemPath) : undefined;
    const role = item.kind === 'checkbox' ? 'menuitemcheckbox' : item.kind === 'radio' ? 'menuitemradio' : 'menuitem';
    const checked = item.kind === 'checkbox' || item.kind === 'radio' ? item.checked : undefined;
    const { onClick: attributeClick, ...attributes } = item.attributes ?? {};
    const common = {
      ...attributes,
      id: itemId,
      role,
      tabIndex: item === firstEnabled ? 0 : -1,
      class: [{ 'gluon-menu-item': true, 'has-submenu': hasSubmenu }, item.attributes?.class],
      part: 'item',
      data: { ...item.attributes?.data, value: item.id, kind: item.kind ?? 'item', textValue: item.textValue, radioGroup: item.kind === 'radio' ? item.group : undefined, state: hasSubmenu ? item.expanded ? 'open' : 'closed' : checked ? 'checked' : undefined },
      aria: { ...item.attributes?.aria, disabled: item.disabled, checked: checked === undefined ? undefined : String(checked), haspopup: hasSubmenu ? 'menu' : undefined, expanded: hasSubmenu ? String(Boolean(item.expanded)) : undefined, controls: childMenuId },
      onClick: (event: MouseEvent) => {
        callListener(attributeClick, event);
        if (event.defaultPrevented || item.disabled) { event.preventDefault(); return; }
        if (hasSubmenu) { options.onSubmenuOpenChange?.(item.id, !item.expanded, event); scheduleFocus((event.currentTarget as HTMLElement).parentElement ?? undefined, '[role="menu"]'); return; }
        if (item.kind === 'checkbox') options.onCheckedChange?.({ id: item.id, kind: 'checkbox', checked: !item.checked }, event);
        else if (item.kind === 'radio') options.onCheckedChange?.({ id: item.id, kind: 'radio', group: item.group, checked: true }, event);
        else item.onSelect?.(event);
        if (!((item.kind === undefined || item.kind === 'item') && item.href)) options.closeRoot?.(event);
      },
    };
    const control = (item.kind === undefined || item.kind === 'item') && item.href
      ? q.a({ ...(common as unknown as QuarkProps<HTMLAnchorElement>), href: item.href, target: item.target, children: item.label })
      : q.button({ ...(common as unknown as QuarkProps<HTMLButtonElement>), type: 'button', children: item.label });
    return q.li({ role: 'none', class: 'gluon-menu-entry', children: [
      control,
      hasSubmenu ? renderMenu({ ...options, items: item.submenu!, path: itemPath, hidden: !item.expanded, labelledBy: itemId, label: undefined }) : nothing,
    ] });
  });
}

function handleMenuKeydown(event: KeyboardEvent, options: RenderMenuOptions, typeahead: TypeaheadState): void {
  const menu = event.currentTarget as HTMLElement;
  const current = (event.target as Element).closest<HTMLElement>(menuItemSelector);
  if (!current || current.closest('[role="menu"]') !== menu || isDisabled(current)) return;
  const rtl = getComputedStyle(menu).direction === 'rtl';
  const openKey = rtl ? 'ArrowLeft' : 'ArrowRight';
  const closeKey = rtl ? 'ArrowRight' : 'ArrowLeft';
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    moveFocus(menu, current, event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : event.key === 'Home' ? 'first' : 'last');
  } else if (event.key === openKey && current.getAttribute('aria-haspopup') === 'menu') {
    event.preventDefault();
    options.onSubmenuOpenChange?.(current.dataset.value!, true, event);
    scheduleFocus(current.parentElement ?? undefined, '[role="menu"]');
  } else if ((event.key === closeKey || event.key === 'Escape') && menu.dataset.level !== '0') {
    event.preventDefault();
    const parent = menu.parentElement?.querySelector<HTMLElement>(`:scope > ${menuItemSelector}`);
    if (parent) {
      options.onSubmenuOpenChange?.(parent.dataset.value!, false, event);
      queueMicrotask(() => parent.focus());
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    options.closeRoot?.(event);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    current.click();
  } else if (event.key.length === 1 && /\S/.test(event.key)) {
    event.preventDefault();
    runTypeahead(menu, current, event.key, typeahead);
  }
}

function renderDropdownMenu(props: DropdownMenuProps): TemplateResult {
  let root: HTMLElement | undefined;
  const triggerId = `${safeId(props.id)}-trigger`;
  const close = (event: MenuEvent): void => {
    const ownerDocument = (event.currentTarget as Element | null)?.ownerDocument ?? root?.ownerDocument;
    props.onOpenChange(false, event);
    queueMicrotask(() => {
      const renderedRoot = ownerDocument?.getElementById(props.id);
      if (renderedRoot?.dataset.state === 'closed') ownerDocument?.getElementById(triggerId)?.focus();
    });
  };
  const requestOpen = (event: Event, edge: 'first' | 'last' = 'first'): void => {
    const ownerDocument = (event.currentTarget as Element | null)?.ownerDocument ?? root?.ownerDocument;
    props.onOpenChange(true, event);
    scheduleFocus(ownerDocument?.getElementById(props.id) ?? undefined, `#${menuDomId(props.id, [])}`, edge);
  };
  const { ref: attributeRef, ...attributes } = props.attributes ?? {};
  const { onClick, onKeydown, ...triggerAttributes } = props.triggerAttributes ?? {};
  return q.div({
    ...attributes,
    id: props.id,
    class: [{ gluon: true, molecule: true, 'gluon-menu': true, 'gluon-dropdown-menu': true }, props.attributes?.class],
    part: 'root',
    data: { ...props.attributes?.data, state: props.open ? 'open' : 'closed' },
    ref: (element) => { root = element; assignRef(attributeRef, element); if (element) connectDismissal(element, props.open, (event) => props.onOpenChange(false, event)); },
    children: [
      q.button({
        ...triggerAttributes,
        id: triggerId,
        type: 'button',
        class: ['gluon-menu-trigger', props.triggerAttributes?.class],
        part: 'trigger',
        aria: { ...props.triggerAttributes?.aria, label: props.label, haspopup: 'menu', expanded: String(props.open), controls: menuDomId(props.id, []) },
        onClick: (event) => { callListener(onClick, event); if (!event.defaultPrevented) props.open ? close(event) : requestOpen(event); },
        onKeydown: (event) => {
          callListener(onKeydown, event);
          if (event.defaultPrevented) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            requestOpen(event, event.key === 'ArrowUp' ? 'last' : 'first');
          } else if (event.key === 'Escape' && props.open) { event.preventDefault(); close(event); }
        },
        children: props.trigger,
      }),
      renderMenu({ instanceId: props.id, items: props.items, hidden: !props.open, labelledBy: triggerId, closeRoot: close, onCheckedChange: props.onCheckedChange, onSubmenuOpenChange: props.onSubmenuOpenChange }),
    ],
  });
}

function renderContextMenu(props: ContextMenuProps): TemplateResult {
  let root: HTMLElement | undefined;
  const targetId = `${safeId(props.id)}-target`;
  const close = (event: MenuEvent): void => {
    const ownerDocument = (event.currentTarget as Element | null)?.ownerDocument ?? root?.ownerDocument;
    props.onOpenChange(false, event);
    queueMicrotask(() => {
      const renderedRoot = ownerDocument?.getElementById(props.id);
      if (renderedRoot?.dataset.state === 'closed') ownerDocument?.getElementById(targetId)?.focus();
    });
  };
  const open = (event: MouseEvent | KeyboardEvent): void => {
    const ownerDocument = (event.currentTarget as Element | null)?.ownerDocument ?? root?.ownerDocument;
    const target = event.currentTarget as HTMLElement;
    const targetRect = target.getBoundingClientRect();
    const requestedX = event instanceof MouseEvent ? event.clientX : targetRect.left;
    const requestedY = event instanceof MouseEvent ? event.clientY : targetRect.bottom;
    props.onOpenChange(true, event);
    queueMicrotask(() => {
      const menu = ownerDocument?.getElementById(menuDomId(props.id, []));
      const renderedRoot = ownerDocument?.getElementById(props.id);
      const viewport = ownerDocument?.defaultView;
      if (!menu || !renderedRoot || !viewport) return;
      const gutter = 8;
      const x = Math.max(gutter, Math.min(requestedX, viewport.innerWidth - menu.offsetWidth - gutter));
      const y = Math.max(gutter, Math.min(requestedY, viewport.innerHeight - menu.offsetHeight - gutter));
      renderedRoot.style.setProperty('--gluon-context-menu-x', `${x}px`);
      renderedRoot.style.setProperty('--gluon-context-menu-y', `${y}px`);
    });
    scheduleFocus(ownerDocument?.getElementById(props.id) ?? undefined, `#${menuDomId(props.id, [])}`);
  };
  const { ref: attributeRef, ...attributes } = props.attributes ?? {};
  const { onContextMenu, onKeydown, ...targetAttributes } = props.targetAttributes ?? {};
  return q.div({
    ...attributes,
    id: props.id,
    class: [{ gluon: true, molecule: true, 'gluon-context-menu': true }, props.attributes?.class],
    part: 'root',
    data: { ...props.attributes?.data, state: props.open ? 'open' : 'closed' },
    ref: (element) => { root = element; assignRef(attributeRef, element); if (element) connectDismissal(element, props.open, (event) => props.onOpenChange(false, event)); },
    children: [
      q.div({
        ...targetAttributes,
        id: targetId,
        class: ['gluon-context-menu-target', props.targetAttributes?.class],
        part: 'target',
        tabIndex: props.targetAttributes?.tabIndex ?? 0,
        aria: { ...props.targetAttributes?.aria, haspopup: 'menu', expanded: String(props.open), controls: menuDomId(props.id, []) },
        onContextMenu: (event) => { callListener(onContextMenu, event); if (!event.defaultPrevented) { event.preventDefault(); open(event); } },
        onKeydown: (event) => {
          callListener(onKeydown, event);
          if (!event.defaultPrevented && (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) { event.preventDefault(); open(event); }
        },
        children: props.children,
      }),
      renderMenu({ instanceId: props.id, items: props.items, hidden: !props.open, label: props.label, closeRoot: close, onCheckedChange: props.onCheckedChange, onSubmenuOpenChange: props.onSubmenuOpenChange }),
    ],
  });
}

function renderMenubar(props: MenubarProps): TemplateResult {
  const orientation = props.orientation ?? 'horizontal';
  const typeahead: TypeaheadState = { buffer: '', at: 0 };
  const firstEnabled = props.items.find((item) => item.kind !== 'separator' && !item.disabled);
  let root: HTMLElement | undefined;
  const { ref: attributeRef, onFocusIn: attributeFocusIn, onKeydown: attributeKeydown, ...attributes } = props.attributes ?? {};
  const closeSubmenus = (event: MenuEvent): void => {
    for (const item of props.items) if (item.kind !== 'separator' && item.submenu?.length && item.expanded) props.onSubmenuOpenChange?.(item.id, false, event);
  };
  const topItems = props.items.map((item) => {
    if (item.kind === 'separator') return q.li({ id: itemDomId(props.id, [item.id]), role: 'separator', class: 'gluon-menu-separator', part: 'separator' });
    const hasSubmenu = Boolean(item.submenu?.length);
    const id = itemDomId(props.id, [item.id]);
    const role = item.kind === 'checkbox' ? 'menuitemcheckbox' : item.kind === 'radio' ? 'menuitemradio' : 'menuitem';
    const checked = item.kind === 'checkbox' || item.kind === 'radio' ? item.checked : undefined;
    const { onClick: attributeClick, ...itemAttributes } = item.attributes ?? {};
    const common = {
      ...itemAttributes,
      id, role, tabIndex: item === firstEnabled ? 0 : -1,
      class: ['gluon-menu-item', item.attributes?.class], part: 'item',
      data: { ...item.attributes?.data, value: item.id, textValue: item.textValue, radioGroup: item.kind === 'radio' ? item.group : undefined, state: item.disabled ? 'disabled' : hasSubmenu ? item.expanded ? 'open' : 'closed' : checked ? 'checked' : 'enabled' },
      aria: { ...item.attributes?.aria, disabled: item.disabled, checked: checked === undefined ? undefined : String(checked), haspopup: hasSubmenu ? 'menu' : undefined, expanded: hasSubmenu ? String(Boolean(item.expanded)) : undefined, controls: hasSubmenu ? menuDomId(props.id, [item.id]) : undefined },
      onClick: (event: MouseEvent) => {
        callListener(attributeClick, event);
        if (event.defaultPrevented || item.disabled) { event.preventDefault(); return; }
        if (hasSubmenu) props.onSubmenuOpenChange?.(item.id, !item.expanded, event);
        else if (item.kind === 'checkbox') props.onCheckedChange?.({ id: item.id, kind: 'checkbox', checked: !item.checked }, event);
        else if (item.kind === 'radio') props.onCheckedChange?.({ id: item.id, kind: 'radio', group: item.group, checked: true }, event);
        else item.onSelect?.(event);
      },
    };
    const control = (item.kind === undefined || item.kind === 'item') && item.href
      ? q.a({ ...(common as unknown as QuarkProps<HTMLAnchorElement>), href: item.href, target: item.target, children: item.label })
      : q.button({ ...(common as unknown as QuarkProps<HTMLButtonElement>), type: 'button', children: item.label });
    return q.li({ role: 'none', class: 'gluon-menu-entry', children: [control, hasSubmenu ? renderMenu({ instanceId: props.id, items: item.submenu!, path: [item.id], hidden: !item.expanded, labelledBy: id, closeRoot: closeSubmenus, onCheckedChange: props.onCheckedChange, onSubmenuOpenChange: props.onSubmenuOpenChange }) : nothing] });
  });
  return q.ul({
    ...attributes,
    id: props.id,
    role: 'menubar',
    class: [{ gluon: true, molecule: true, 'gluon-menubar': true, [`is-${orientation}`]: true }, props.attributes?.class],
    part: 'menubar',
    data: { ...props.attributes?.data, orientation },
    aria: { ...props.attributes?.aria, label: props.label, orientation },
    ref: (element) => { root = element; assignRef(attributeRef, element); if (element) queueMicrotask(() => setRoving(element)); },
    onFocusIn: (event) => { callListener(attributeFocusIn, event); if (event.defaultPrevented) return; const item = (event.target as Element).closest<HTMLElement>(menuItemSelector); if (root && item?.closest('[role="menubar"]') === root && !isDisabled(item)) setRoving(root, item); },
    onKeydown: (event) => {
      callListener(attributeKeydown, event);
      if (event.defaultPrevented) return;
      const menubar = event.currentTarget as HTMLElement;
      const current = (event.target as Element).closest<HTMLElement>(menuItemSelector);
      if (!current || current.closest('[role="menubar"]') !== menubar || isDisabled(current)) return;
      const rtl = getComputedStyle(menubar).direction === 'rtl';
      const previous = orientation === 'horizontal' ? (rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
      const next = orientation === 'horizontal' ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
      if (event.key === previous || event.key === next || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        moveFocus(menubar, current, event.key === previous ? -1 : event.key === next ? 1 : event.key === 'Home' ? 'first' : 'last');
      } else if ((orientation === 'horizontal' && event.key === 'ArrowDown' || orientation === 'vertical' && event.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) && current.getAttribute('aria-haspopup') === 'menu') {
        event.preventDefault();
        props.onSubmenuOpenChange?.(current.dataset.value!, true, event);
        scheduleFocus(current.parentElement ?? undefined, '[role="menu"]');
      } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); current.click(); }
      else if (event.key === 'Escape') { event.preventDefault(); closeSubmenus(event); current.focus(); }
      else if (event.key.length === 1 && /\S/.test(event.key)) { event.preventDefault(); runTypeahead(menubar, current, event.key, typeahead); }
    },
    children: topItems,
  });
}

export const DropdownMenu = defineMolecule(renderDropdownMenu, 'DropdownMenu', [menuToolbarStyleDependency]);
export const ContextMenu = defineMolecule(renderContextMenu, 'ContextMenu', [menuToolbarStyleDependency]);
export const Menubar = defineMolecule(renderMenubar, 'Menubar', [menuToolbarStyleDependency]);
