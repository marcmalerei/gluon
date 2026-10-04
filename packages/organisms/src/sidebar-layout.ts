import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { sidebarLayoutStyleDependency } from './sidebar-layout-styles.js';

type SidebarLayoutAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type SidebarLayoutAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & { readonly aria?: SidebarLayoutAria };
export type SidebarLayoutRegionAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };
export type SidebarLayoutNavigationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };
export type SidebarLayoutButtonAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'id' | 'type' | 'aria' | 'aria-controls' | 'aria-expanded'> & { readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'controls' | 'expanded' | 'label'> };
export type SidebarLayoutOpenChangeEvent = KeyboardEvent | MouseEvent | PointerEvent;

export interface SidebarLayoutProps {
  readonly id: string;
  readonly header?: TemplateValue;
  readonly sidebar?: TemplateValue;
  readonly main: TemplateValue;
  readonly footer?: TemplateValue;
  readonly sidebarLabel?: string;
  readonly mobileMenuLabel?: string;
  readonly mobileOpen?: boolean;
  readonly onMobileOpenChange?: (open: boolean, event: SidebarLayoutOpenChangeEvent) => void;
  readonly attributes?: SidebarLayoutAttributes;
  readonly headerAttributes?: SidebarLayoutRegionAttributes;
  readonly sidebarAttributes?: SidebarLayoutRegionAttributes;
  readonly navigationAttributes?: SidebarLayoutNavigationAttributes;
  readonly mainAttributes?: SidebarLayoutRegionAttributes;
  readonly footerAttributes?: SidebarLayoutRegionAttributes;
  readonly mobileButtonAttributes?: SidebarLayoutButtonAttributes;
}

interface SidebarLayoutController {
  readonly rootRef: (element: HTMLDivElement | undefined) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly toggleMobile: (event: MouseEvent) => void;
}

function renderSidebarLayout({
  id, header, sidebar, main, footer,
  sidebarLabel = 'Sidebar navigation', mobileMenuLabel = 'Open navigation', mobileOpen = false, onMobileOpenChange,
  attributes = {}, headerAttributes = {}, sidebarAttributes = {}, navigationAttributes = {}, mainAttributes = {}, footerAttributes = {}, mobileButtonAttributes = {},
}: SidebarLayoutProps): TemplateResult {
  assertDomId('SidebarLayout.id', id);
  assertNonEmpty('SidebarLayout.sidebarLabel', sidebarLabel);
  assertNonEmpty('SidebarLayout.mobileMenuLabel', mobileMenuLabel);
  const controller = createSidebarLayoutController({ id, mobileOpen, onMobileOpenChange });
  const panelId = `${id}-sidebar`;
  const mobileButtonId = `${id}-mobile-button`;
  const { aria: rootAria, ...rootNativeAttributes } = attributes;
  const { aria: sidebarAria, ...sidebarNativeAttributes } = sidebarAttributes;
  const { aria: navigationAria, ...navigationNativeAttributes } = navigationAttributes;
  const { aria: mobileAria, onClick: mobileOnClick, ...nativeMobileButtonAttributes } = mobileButtonAttributes;

  return q.div({
    ...rootNativeAttributes,
    id,
    ref: controller.rootRef,
    part: 'root',
    data: { ...attributes.data, sidebarLayoutRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-sidebar-layout': true, 'is-mobile-open': mobileOpen }, attributes.class],
    aria: rootAria,
    onKeydown: controller.onKeydown,
    children: [
      hasContent(header) ? q.header({ ...headerAttributes, part: 'header', class: [{ 'gluon-sidebar-layout-header': true }, headerAttributes.class], children: header }) : nothing,
      hasContent(sidebar) ? q.button({
        ...nativeMobileButtonAttributes,
        id: mobileButtonId,
        part: 'mobile-button',
        type: 'button',
        class: [{ 'gluon-sidebar-layout-mobile-button': true }, mobileButtonAttributes.class],
        aria: { ...mobileAria, controls: panelId, expanded: mobileOpen ? 'true' : 'false', label: mobileMenuLabel },
        data: { ...mobileButtonAttributes.data, sidebarLayoutMobileButton: id },
        onClick: (event: MouseEvent) => { callListener(mobileOnClick, event); if (!event.defaultPrevented) controller.toggleMobile(event); },
        children: mobileOpen ? 'Close' : 'Menu',
      }) : nothing,
      q.div({ part: 'layout', class: 'gluon-sidebar-layout-layout', children: [
        hasContent(sidebar) ? q.aside({
          ...sidebarNativeAttributes,
          id: panelId,
          part: 'sidebar',
          class: [{ 'gluon-sidebar-layout-sidebar': true }, sidebarAttributes.class],
          aria: sidebarAria,
          children: q.nav({ ...navigationNativeAttributes, part: 'navigation', class: 'gluon-sidebar-layout-navigation', aria: { ...navigationAria, label: navigationAria?.label ?? sidebarLabel }, children: sidebar }),
        }) : nothing,
        q.main({ ...mainAttributes, part: 'main', class: [{ 'gluon-sidebar-layout-main': true }, mainAttributes.class], children: main }),
      ] }),
      hasContent(footer) ? q.footer({ ...footerAttributes, part: 'footer', class: [{ 'gluon-sidebar-layout-footer': true }, footerAttributes.class], children: footer }) : nothing,
    ],
  });
}

function createSidebarLayoutController({ id, mobileOpen, onMobileOpenChange }: Pick<SidebarLayoutProps, 'id' | 'mobileOpen' | 'onMobileOpenChange'>): SidebarLayoutController {
  let root: HTMLDivElement | undefined;
  const disconnect = (): void => { root?.ownerDocument.removeEventListener('pointerdown', onOutsidePointer, true); root = undefined; };
  const close = (event: SidebarLayoutOpenChangeEvent, restoreFocus: boolean): void => {
    if (!mobileOpen) return;
    const ownerDocument = root?.ownerDocument;
    onMobileOpenChange?.(false, event);
    if (restoreFocus) setTimeout(() => latestRoot(root, id, ownerDocument)?.querySelector<HTMLButtonElement>('[data-sidebar-layout-mobile-button]')?.focus(), 0);
  };
  const onOutsidePointer = (event: PointerEvent): void => { if (root && mobileOpen && event.target instanceof Node && !root.contains(event.target)) close(event, false); };
  return {
    rootRef(element) { if (element === root) return; disconnect(); root = element; root?.ownerDocument.addEventListener('pointerdown', onOutsidePointer, true); },
    onKeydown(event) { if (event.key === 'Escape') { event.preventDefault(); close(event, true); } },
    toggleMobile(event) { if (mobileOpen) close(event, false); else onMobileOpenChange?.(true, event); },
  };
}

function latestRoot(root: HTMLDivElement | undefined, id: string, ownerDocument = root?.ownerDocument): HTMLDivElement | undefined {
  return [...(ownerDocument?.querySelectorAll<HTMLDivElement>('[data-sidebar-layout-root]') ?? [])].filter((candidate) => candidate.id === id).at(-1) ?? root;
}
function hasContent(value: TemplateValue | undefined): boolean { return value != null && value !== false && value !== nothing; }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }
function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void { if (typeof listener === 'function') listener(event); else listener?.handleEvent(event); }

export const SidebarLayout = defineOrganism(renderSidebarLayout, 'SidebarLayout', [sidebarLayoutStyleDependency]);
