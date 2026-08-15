import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { navigationMenuStyleDependency } from './navigation-menu-styles.js';

export type NavigationMenuAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLElement>['aria']>, 'label' | 'labelledby'>;
};
export type NavigationMenuItemAttributes = Omit<QuarkProps<HTMLLIElement>, 'children'>;
export type NavigationMenuLinkAttributes = Omit<QuarkProps<HTMLAnchorElement>, 'children' | 'href' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLAnchorElement>['aria']>, 'current' | 'disabled' | 'describedby'>;
};
export type NavigationMenuTriggerAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'type' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'controls' | 'expanded' | 'disabled' | 'haspopup'>;
};

export interface NavigationMenuItem {
  readonly id: string;
  readonly label: TemplateValue;
  readonly accessibleLabel?: string;
  readonly href?: string;
  /** Optional caller-rendered native link, useful for application link adapters. */
  readonly link?: TemplateValue;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly unavailable?: boolean;
  readonly unavailableReason?: string;
  readonly children?: readonly NavigationMenuItem[];
  readonly attributes?: NavigationMenuItemAttributes;
  readonly linkAttributes?: NavigationMenuLinkAttributes;
  readonly triggerAttributes?: NavigationMenuTriggerAttributes;
}

export type NavigationMenuOpenChangeEvent = KeyboardEvent | MouseEvent;
export type NavigationMenuProps = {
  readonly label: string;
  readonly items: readonly NavigationMenuItem[];
  readonly open?: readonly string[];
  readonly onOpenChange?: (open: readonly string[], event: NavigationMenuOpenChangeEvent) => void;
  readonly attributes?: NavigationMenuAttributes;
};

interface NavigationMenuController {
  readonly rootRef: (element: HTMLElement | undefined) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly toggle: (id: string, event: MouseEvent | KeyboardEvent) => void;
  readonly close: (event: MouseEvent | KeyboardEvent, restoreFocus: boolean) => void;
}

function renderNavigationMenu({ label, items, open = [], onOpenChange, attributes = {} }: NavigationMenuProps): TemplateResult {
  const controller = createNavigationMenuController(open, onOpenChange);
  const { aria, ...nativeAttributes } = attributes;
  return q.nav({
    ...nativeAttributes,
    class: [{ gluon: true, molecule: true, 'gluon-navigation-menu': true }, attributes.class],
    aria: { ...aria, label },
    ref: (element) => {
      controller.rootRef(element);
      assignRef(attributes.ref, element);
    },
    onKeydown: controller.onKeydown,
    children: q.ul({
      class: 'gluon-navigation-menu-list',
      children: items.map((item) => renderItem(item, open, controller)),
    }),
  });
}

function renderItem(item: NavigationMenuItem, open: readonly string[], controller: NavigationMenuController, parentId?: string): TemplateResult {
  const hasChildren = Boolean(item.children?.length);
  const panelId = `${item.id}-panel`;
  const isOpen = hasChildren && open.includes(item.id);
  const unavailable = item.unavailable === true;
  const unavailableReason = unavailable ? item.unavailableReason || 'This destination is currently unavailable.' : undefined;
  const groupAttributes = item.attributes ?? {};
  const nativeItemAttributes = groupAttributes;
  const link = item.link ?? (item.href === undefined ? undefined : q.a({
    ...item.linkAttributes,
    href: unavailable || item.disabled ? undefined : item.href,
    class: [{ 'gluon-navigation-menu-link': true }, item.linkAttributes?.class],
    aria: { ...item.linkAttributes?.aria, current: item.active ? 'page' : undefined, disabled: unavailable || item.disabled ? 'true' : undefined, describedby: unavailable ? `${item.id}-unavailable` : undefined },
    tabIndex: item.disabled ? -1 : item.linkAttributes?.tabIndex,
    data: { ...item.linkAttributes?.data, navigationMenuItem: item.id },
    onClick: (event: MouseEvent) => {
      if (unavailable || item.disabled) event.preventDefault();
    },
    children: item.label,
  }));
  const trigger = hasChildren ? q.button({
    ...item.triggerAttributes,
    type: 'button',
    class: [{ 'gluon-navigation-menu-trigger': true }, item.triggerAttributes?.class],
    aria: { ...item.triggerAttributes?.aria, expanded: isOpen, controls: panelId, haspopup: 'true', disabled: item.disabled ? 'true' : unavailable ? 'true' : undefined },
    disabled: item.disabled,
    data: { ...item.triggerAttributes?.data, navigationMenuTrigger: item.id },
    onClick: (event: MouseEvent) => {
      if (unavailable) {
        event.preventDefault();
        return;
      }
      controller.toggle(item.id, event);
    },
    children: [
      item.href === undefined ? item.label : q.span({ aria: { hidden: true }, children: item.accessibleLabel || 'More' }),
      q.span({ class: 'gluon-navigation-menu-chevron', aria: { hidden: true }, children: '⌄' }),
    ],
  }) : undefined;
  const content = hasChildren ? q.ul({
    id: panelId,
    hidden: !isOpen,
    class: 'gluon-navigation-menu-sublist',
    data: { navigationMenuParent: item.id },
    children: item.children!.map((child) => renderItem(child, open, controller, item.id)),
  }) : undefined;
  return q.li({
    ...nativeItemAttributes,
    class: [{ 'gluon-navigation-menu-item': true, 'gluon-navigation-menu-group': hasChildren }, groupAttributes.class],
    data: { ...groupAttributes.data, navigationMenuGroup: item.id, navigationMenuParent: parentId },
    children: [
      link,
      trigger,
      link === undefined && trigger === undefined ? q.span({ class: 'gluon-navigation-menu-link', aria: { disabled: unavailable || item.disabled ? 'true' : undefined, describedby: unavailable ? `${item.id}-unavailable` : undefined }, children: item.label }) : undefined,
      unavailable ? q.span({ id: `${item.id}-unavailable`, class: 'gluon-navigation-menu-unavailable', children: unavailableReason }) : undefined,
      content,
    ],
  });
}

function createNavigationMenuController(open: readonly string[], onOpenChange: NavigationMenuProps['onOpenChange']): NavigationMenuController {
  let root: HTMLElement | undefined;
  let returnTrigger: HTMLElement | undefined;
  const onOutsidePointer = (event: PointerEvent): void => {
    if (root && event.target instanceof Node && !root.contains(event.target)) close(event, false);
  };
  const disconnect = (): void => {
    root?.ownerDocument.removeEventListener('pointerdown', onOutsidePointer, true);
    root = undefined;
    returnTrigger = undefined;
  };
  const close = (event: MouseEvent | KeyboardEvent, restoreFocus: boolean): void => {
    if (open.length === 0) return;
    onOpenChange?.([], event);
    if (restoreFocus && returnTrigger?.isConnected) returnTrigger.focus();
    returnTrigger = undefined;
  };
  return {
    rootRef(element) {
      if (element === root) return;
      disconnect();
      root = element;
      root?.ownerDocument.addEventListener('pointerdown', onOutsidePointer, true);
    },
    onKeydown(event) {
      if (!root) return;
      const target = event.target instanceof HTMLElement
        ? targetInteractive(root, event.target)
        : undefined;
      if (!target) return;
      if (event.key === 'Escape') {
        const parent = target.closest<HTMLElement>('[data-navigation-menu-parent]');
        if (parent) {
          const parentId = parent.dataset.navigationMenuParent;
          const trigger = parentId === undefined ? undefined : root.querySelector<HTMLElement>(`[data-navigation-menu-trigger="${escapeSelector(parentId)}"]`);
          if (trigger && parentId !== undefined) {
            event.preventDefault();
            onOpenChange?.(open.filter((value) => value !== parentId && !isDescendant(root!, value, parentId)), event);
            trigger.focus();
            return;
          }
        }
        close(event, true);
        return;
      }
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && target.matches('.gluon-navigation-menu-trigger')) {
        const panel = target.parentElement?.querySelector<HTMLElement>(':scope > .gluon-navigation-menu-sublist');
        if (panel?.hidden) {
          event.preventDefault();
          const id = target.dataset.navigationMenuTrigger;
          if (id) {
            returnTrigger = target;
            onOpenChange?.([...open, id], event);
            queueMicrotask(() => {
              const nextPanel = root?.querySelector<HTMLElement>(`#${escapeSelector(`${id}-panel`)}`);
              const first = nextPanel?.querySelector<HTMLElement>(':scope > li > .gluon-navigation-menu-link, :scope > li > .gluon-navigation-menu-trigger');
              first?.focus();
            });
          }
          return;
        }
      }
      const items = [...(target.closest('ul')?.querySelectorAll<HTMLElement>(':scope > li > .gluon-navigation-menu-link, :scope > li > .gluon-navigation-menu-trigger') ?? [])]
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true');
      const index = items.indexOf(target);
      if (index < 0) return;
      let next: HTMLElement | undefined;
      if (event.key === 'Home') next = items[0];
      else if (event.key === 'End') next = items.at(-1);
      else if (event.key === 'ArrowDown') next = items[(index + 1) % items.length];
      else if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
      else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const rtl = root.ownerDocument.defaultView?.getComputedStyle(root).direction === 'rtl';
        const forward = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
        const parent = target.closest<HTMLElement>('[data-navigation-menu-parent]');
        if (parent && !forward) {
          const parentId = parent.dataset.navigationMenuParent;
          const trigger = parentId === undefined ? undefined : root.querySelector<HTMLElement>(`[data-navigation-menu-trigger="${escapeSelector(parentId)}"]`);
          if (trigger) {
            event.preventDefault();
            if (parentId !== undefined) onOpenChange?.(open.filter((value) => value !== parentId && !isDescendant(root!, value, parentId)), event);
            trigger.focus();
            return;
          }
        }
        next = items[(index + (forward ? 1 : -1) + items.length) % items.length];
      }
      if (!next) return;
      event.preventDefault();
      next.focus();
    },
    toggle(id, event) {
      if (!root) return;
      const trigger = root.querySelector<HTMLElement>(`[data-navigation-menu-trigger="${escapeSelector(id)}"]`);
      if (open.includes(id)) {
        returnTrigger = trigger ?? returnTrigger;
        onOpenChange?.(open.filter((value) => value !== id && !isDescendant(root!, value, id)), event);
      } else {
        returnTrigger = trigger ?? returnTrigger;
        onOpenChange?.([...open, id], event);
      }
    },
    close: (event, restoreFocus) => close(event, restoreFocus),
  };
}

function isDescendant(root: HTMLElement, candidate: string, ancestor: string): boolean {
  const group = root.querySelector<HTMLElement>(`[data-navigation-menu-group="${escapeSelector(candidate)}"]`);
  let parent = group?.dataset.navigationMenuParent;
  while (parent !== undefined) {
    if (parent === ancestor) return true;
    const parentGroup = root.querySelector<HTMLElement>(`[data-navigation-menu-group="${escapeSelector(parent)}"]`);
    parent = parentGroup?.dataset.navigationMenuParent;
  }
  return false;
}

function targetInteractive(root: HTMLElement, target: HTMLElement): HTMLElement | undefined {
  const element = target.closest<HTMLElement>('.gluon-navigation-menu-link, .gluon-navigation-menu-trigger');
  return element && root.contains(element) ? element : undefined;
}

function escapeSelector(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function assignRef(ref: QuarkRef<HTMLElement> | undefined, element: HTMLElement | undefined): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}

export const NavigationMenu = defineMolecule(renderNavigationMenu, 'NavigationMenu', [navigationMenuStyleDependency]);
