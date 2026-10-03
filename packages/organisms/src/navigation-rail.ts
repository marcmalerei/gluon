import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { navigationRailStyleDependency } from './navigation-rail-styles.js';

type NavigationRailAria = NonNullable<QuarkProps<HTMLElement>['aria']>;
export type NavigationRailAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria' | 'aria-label'> & {
  readonly aria?: Omit<NavigationRailAria, 'label'>;
};
export type NavigationRailRegionAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & {
  readonly aria?: NonNullable<QuarkProps<HTMLDivElement>['aria']>;
};
export type NavigationRailNavigationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria' | 'aria-label'> & {
  readonly aria?: NavigationRailAria;
};
export type NavigationRailButtonAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'id' | 'type' | 'aria' | 'aria-controls' | 'aria-expanded'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'controls' | 'expanded' | 'label'>;
};
export type NavigationRailLinkAttributes = Omit<QuarkProps<HTMLAnchorElement>, 'children' | 'href' | 'id' | 'aria' | 'aria-current' | 'aria-disabled'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLAnchorElement>['aria']>, 'current' | 'disabled'>;
};
export type NavigationRailOpenChangeEvent = KeyboardEvent | MouseEvent | PointerEvent;

export interface NavigationRailItem {
  readonly id: string;
  readonly label: TemplateValue;
  readonly href?: string;
  readonly icon?: TemplateValue;
  readonly badge?: TemplateValue;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly attributes?: NavigationRailLinkAttributes;
}

export interface NavigationRailGroup {
  readonly id: string;
  readonly label?: TemplateValue;
  readonly items: readonly NavigationRailItem[];
}

export interface NavigationRailProps {
  readonly id: string;
  readonly label: string;
  readonly groups: readonly NavigationRailGroup[];
  readonly header?: TemplateValue;
  readonly footer?: TemplateValue;
  readonly collapsed?: boolean;
  readonly mobileOpen?: boolean;
  readonly collapseLabel?: string;
  readonly mobileMenuLabel?: string;
  readonly onCollapsedChange?: (collapsed: boolean, event: NavigationRailOpenChangeEvent) => void;
  readonly onMobileOpenChange?: (open: boolean, event: NavigationRailOpenChangeEvent) => void;
  readonly attributes?: NavigationRailAttributes;
  readonly headerAttributes?: NavigationRailRegionAttributes;
  readonly footerAttributes?: NavigationRailRegionAttributes;
  readonly navigationAttributes?: NavigationRailNavigationAttributes;
  readonly collapseButtonAttributes?: NavigationRailButtonAttributes;
  readonly mobileButtonAttributes?: NavigationRailButtonAttributes;
}

interface NavigationRailController {
  readonly rootRef: (element: HTMLElement | undefined) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly toggleMobile: (event: MouseEvent) => void;
  readonly toggleCollapsed: (event: MouseEvent) => void;
}

function renderNavigationRail({
  id,
  label,
  groups,
  header,
  footer,
  collapsed = false,
  mobileOpen = false,
  collapseLabel = 'Collapse navigation',
  mobileMenuLabel = 'Open navigation',
  onCollapsedChange,
  onMobileOpenChange,
  attributes = {},
  headerAttributes = {},
  footerAttributes = {},
  navigationAttributes = {},
  collapseButtonAttributes = {},
  mobileButtonAttributes = {},
}: NavigationRailProps): TemplateResult {
  assertDomId('NavigationRail.id', id);
  assertNonEmpty('NavigationRail.label', label);
  assertNonEmpty('NavigationRail.collapseLabel', collapseLabel);
  assertNonEmpty('NavigationRail.mobileMenuLabel', mobileMenuLabel);
  validateGroups(groups);
  const controller = createNavigationRailController({ id, mobileOpen, collapsed, onMobileOpenChange, onCollapsedChange });
  const panelId = `${id}-panel`;
  const mobileButtonId = `${id}-mobile-button`;
  const collapseButtonId = `${id}-collapse-button`;
  const { aria: rootAria, ...nativeAttributes } = attributes;
  const { aria: collapseAria, onClick: collapseOnClick, ...nativeCollapseButtonAttributes } = collapseButtonAttributes;
  const { aria: mobileAria, onClick: mobileOnClick, ...nativeMobileButtonAttributes } = mobileButtonAttributes;
  const { aria: navigationAria, ...nativeNavigationAttributes } = navigationAttributes;
  return q.aside({
    ...nativeAttributes,
    id,
    ref: controller.rootRef,
    part: 'root',
    data: { ...attributes.data, navigationRailRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-navigation-rail': true, 'is-collapsed': collapsed, 'is-mobile-open': mobileOpen }, attributes.class],
    aria: { ...rootAria, label },
    onKeydown: controller.onKeydown,
    children: [
      q.div({
        ...headerAttributes,
        part: 'header',
        class: [{ 'gluon-navigation-rail-header': true }, headerAttributes.class],
        children: [
          hasContent(header) ? q.div({ class: 'gluon-navigation-rail-header-content', children: header }) : nothing,
          q.button({
            ...nativeMobileButtonAttributes,
            id: mobileButtonId,
            part: 'mobile-button',
            type: 'button',
            class: [{ 'gluon-navigation-rail-mobile-button': true }, mobileButtonAttributes.class],
            aria: { ...mobileAria, controls: panelId, expanded: mobileOpen ? 'true' : 'false', label: mobileMenuLabel },
            data: { ...mobileButtonAttributes.data, navigationRailMobileButton: id },
            onClick: (event: MouseEvent) => { callListener(mobileOnClick, event); if (!event.defaultPrevented) controller.toggleMobile(event); },
            children: mobileOpen ? 'Close' : 'Menu',
          }),
          q.button({
            ...nativeCollapseButtonAttributes,
            id: collapseButtonId,
            part: 'collapse-button',
            type: 'button',
            class: [{ 'gluon-navigation-rail-collapse-button': true }, collapseButtonAttributes.class],
            aria: { ...collapseAria, expanded: collapsed ? 'false' : 'true', label: collapseLabel },
            data: { ...collapseButtonAttributes.data, navigationRailCollapseButton: id },
            onClick: (event: MouseEvent) => { callListener(collapseOnClick, event); if (!event.defaultPrevented) controller.toggleCollapsed(event); },
            children: collapsed ? 'Expand' : 'Collapse',
          }),
        ],
      }),
      q.div({
        id: panelId,
        part: 'panel',
        class: 'gluon-navigation-rail-panel',
        aria: { labelledby: mobileButtonId },
        children: [
          q.nav({
            ...nativeNavigationAttributes,
            part: 'navigation',
            class: [{ 'gluon-navigation-rail-navigation': true }, navigationAttributes.class],
            aria: { ...navigationAria, label: navigationAria?.label ?? label },
            children: groups.map((group) => q.section({
              class: 'gluon-navigation-rail-group',
              part: 'group',
              data: { navigationRailGroup: group.id },
              children: [
                group.label === undefined ? nothing : q.h2({ class: 'gluon-navigation-rail-group-label', children: group.label }),
                q.ul({ class: 'gluon-navigation-rail-list', children: group.items.map((item) => renderItem(item)) }),
              ],
            })),
          }),
          hasContent(footer) ? q.div({ ...footerAttributes, part: 'footer', class: [{ 'gluon-navigation-rail-footer': true }, footerAttributes.class], children: footer }) : nothing,
        ],
      }),
    ],
  });

  function renderItem(item: NavigationRailItem): TemplateResult {
    const { aria: linkAria, onClick, ...nativeLinkAttributes } = item.attributes ?? {};
    const labelId = `${id}-item-${item.id}-label`;
    return q.li({
      class: [{ 'gluon-navigation-rail-item': true, 'is-active': item.active, 'is-disabled': item.disabled }],
      part: `item item-${item.id}`,
      children: [
        q.a({
          ...nativeLinkAttributes,
          id: `${id}-item-${item.id}`,
          part: 'link',
          href: item.disabled ? undefined : item.href,
          class: [{ 'gluon-navigation-rail-link': true }, item.attributes?.class],
          aria: { ...linkAria, current: item.active ? 'page' : undefined, disabled: item.disabled ? 'true' : undefined, labelledby: labelId },
          tabIndex: item.disabled ? -1 : item.attributes?.tabIndex,
          data: { ...item.attributes?.data, navigationRailItem: item.id },
          onClick: (event: MouseEvent) => { if (item.disabled) event.preventDefault(); callListener(onClick, event); },
          children: [
            item.icon === undefined ? nothing : q.span({ class: 'gluon-navigation-rail-icon', aria: { hidden: true }, children: item.icon }),
            q.span({ id: labelId, class: 'gluon-navigation-rail-label', children: item.label }),
            item.badge === undefined ? nothing : q.span({ class: 'gluon-navigation-rail-badge', children: item.badge }),
          ],
        }),
      ],
    });
  }
}

function createNavigationRailController({ id, mobileOpen, collapsed, onMobileOpenChange, onCollapsedChange }: Pick<NavigationRailProps, 'id' | 'mobileOpen' | 'collapsed' | 'onMobileOpenChange' | 'onCollapsedChange'>): NavigationRailController {
  let root: HTMLElement | undefined;
  const disconnect = (): void => { root?.ownerDocument.removeEventListener('pointerdown', onOutsidePointer, true); root = undefined; };
  const closeMobile = (event: NavigationRailOpenChangeEvent, restoreFocus: boolean): void => {
    if (!mobileOpen) return;
    const ownerDocument = root?.ownerDocument;
    onMobileOpenChange?.(false, event);
    if (restoreFocus) setTimeout(() => latestRoot(root, id, ownerDocument)?.querySelector<HTMLButtonElement>('[data-navigation-rail-mobile-button]')?.focus(), 0);
  };
  const onOutsidePointer = (event: PointerEvent): void => {
    if (root && mobileOpen && event.target instanceof Node && !root.contains(event.target)) closeMobile(event, false);
  };
  return {
    rootRef(element) { if (element === root) return; disconnect(); root = element; root?.ownerDocument.addEventListener('pointerdown', onOutsidePointer, true); },
    onKeydown(event) { if (event.key === 'Escape') { event.preventDefault(); closeMobile(event, true); } },
    toggleMobile(event) { if (mobileOpen) closeMobile(event, false); else onMobileOpenChange?.(true, event); },
    toggleCollapsed(event) { onCollapsedChange?.(!collapsed, event); },
  };
}

function latestRoot(root: HTMLElement | undefined, id: string, ownerDocument = root?.ownerDocument): HTMLElement | undefined {
  const roots = [...(ownerDocument?.querySelectorAll<HTMLElement>('[data-navigation-rail-root]') ?? [])].filter((candidate) => candidate.id === id);
  return roots.at(-1) ?? root;
}

function validateGroups(groups: readonly NavigationRailGroup[]): void {
  if (groups.length === 0) throw new TypeError('NavigationRail.groups must contain at least one group.');
  const seen = new Set<string>();
  for (const group of groups) {
    assertDomId(`NavigationRail group ${group.id}`, group.id);
    if (seen.has(group.id)) throw new TypeError(`NavigationRail ids must be unique: ${group.id}`);
    seen.add(group.id);
    if (group.items.length === 0) throw new TypeError(`NavigationRail group ${group.id} must contain at least one item.`);
    for (const item of group.items) {
      assertDomId(`NavigationRail item ${item.id}`, item.id);
      if (seen.has(item.id)) throw new TypeError(`NavigationRail ids must be unique: ${item.id}`);
      seen.add(item.id);
    }
  }
}

function hasContent(value: TemplateValue | undefined): boolean { return value != null && value !== false && value !== nothing; }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }
function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void { if (typeof listener === 'function') listener(event); else listener?.handleEvent(event); }

export const NavigationRail = defineOrganism(renderNavigationRail, 'NavigationRail', [navigationRailStyleDependency]);
