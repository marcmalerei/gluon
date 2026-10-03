import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { dashboardShellStyleDependency } from './dashboard-shell-styles.js';

type DashboardShellAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type DashboardShellAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & { readonly aria?: DashboardShellAria };
export type DashboardShellRegionAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };
export type DashboardShellNavigationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };
export type DashboardShellButtonAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'id' | 'type' | 'aria' | 'aria-controls' | 'aria-expanded'> & { readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'controls' | 'expanded' | 'label'> };
export type DashboardShellOpenChangeEvent = KeyboardEvent | MouseEvent | PointerEvent;

export interface DashboardShellProps {
  readonly id: string;
  readonly header?: TemplateValue;
  readonly sidebar?: TemplateValue;
  readonly main: TemplateValue;
  readonly utility?: TemplateValue;
  readonly footer?: TemplateValue;
  readonly sidebarLabel?: string;
  readonly utilityLabel?: string;
  readonly mobileMenuLabel?: string;
  readonly mobileOpen?: boolean;
  readonly onMobileOpenChange?: (open: boolean, event: DashboardShellOpenChangeEvent) => void;
  readonly attributes?: DashboardShellAttributes;
  readonly headerAttributes?: DashboardShellRegionAttributes;
  readonly sidebarAttributes?: DashboardShellRegionAttributes;
  readonly navigationAttributes?: DashboardShellNavigationAttributes;
  readonly mainAttributes?: DashboardShellRegionAttributes;
  readonly utilityAttributes?: DashboardShellRegionAttributes;
  readonly footerAttributes?: DashboardShellRegionAttributes;
  readonly mobileButtonAttributes?: DashboardShellButtonAttributes;
}

interface DashboardShellController {
  readonly rootRef: (element: HTMLDivElement | undefined) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly toggleMobile: (event: MouseEvent) => void;
}

function renderDashboardShell({
  id, header, sidebar, main, utility, footer,
  sidebarLabel = 'Dashboard navigation', utilityLabel = 'Dashboard tools', mobileMenuLabel = 'Open navigation',
  mobileOpen = false, onMobileOpenChange,
  attributes = {}, headerAttributes = {}, sidebarAttributes = {}, navigationAttributes = {}, mainAttributes = {}, utilityAttributes = {}, footerAttributes = {}, mobileButtonAttributes = {},
}: DashboardShellProps): TemplateResult {
  assertDomId('DashboardShell.id', id);
  assertNonEmpty('DashboardShell.sidebarLabel', sidebarLabel);
  assertNonEmpty('DashboardShell.utilityLabel', utilityLabel);
  assertNonEmpty('DashboardShell.mobileMenuLabel', mobileMenuLabel);
  const controller = createDashboardShellController({ id, mobileOpen, onMobileOpenChange });
  const panelId = `${id}-sidebar`;
  const mobileButtonId = `${id}-mobile-button`;
  const { aria: rootAria, ...rootNativeAttributes } = attributes;
  const { aria: sidebarAria, ...sidebarNativeAttributes } = sidebarAttributes;
  const { aria: navigationAria, ...navigationNativeAttributes } = navigationAttributes;
  const { aria: utilityAria, ...utilityNativeAttributes } = utilityAttributes;
  const { aria: mobileAria, onClick: mobileOnClick, ...nativeMobileButtonAttributes } = mobileButtonAttributes;

  return q.div({
    ...rootNativeAttributes, id, ref: controller.rootRef, part: 'root',
    data: { ...attributes.data, dashboardShellRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-dashboard-shell': true, 'is-mobile-open': mobileOpen }, attributes.class],
    aria: rootAria, onKeydown: controller.onKeydown,
    children: [
      hasContent(header) ? q.header({ ...headerAttributes, part: 'header', class: [{ 'gluon-dashboard-shell-header': true }, headerAttributes.class], children: header }) : nothing,
      hasContent(sidebar) ? q.button({
        ...nativeMobileButtonAttributes, id: mobileButtonId, part: 'mobile-button', type: 'button',
        class: [{ 'gluon-dashboard-shell-mobile-button': true }, mobileButtonAttributes.class],
        aria: { ...mobileAria, controls: panelId, expanded: mobileOpen ? 'true' : 'false', label: mobileMenuLabel },
        data: { ...mobileButtonAttributes.data, dashboardShellMobileButton: id },
        onClick: (event: MouseEvent) => { callListener(mobileOnClick, event); if (!event.defaultPrevented) controller.toggleMobile(event); },
        children: mobileOpen ? 'Close' : 'Menu',
      }) : nothing,
      q.div({ part: 'layout', class: 'gluon-dashboard-shell-layout', children: [
        hasContent(sidebar) ? q.aside({
          ...sidebarNativeAttributes, id: panelId, part: 'sidebar', class: [{ 'gluon-dashboard-shell-sidebar': true }, sidebarAttributes.class], aria: sidebarAria,
          children: q.nav({ ...navigationNativeAttributes, part: 'navigation', class: 'gluon-dashboard-shell-navigation', aria: { ...navigationAria, label: navigationAria?.label ?? sidebarLabel }, children: sidebar }),
        }) : nothing,
        q.main({ ...mainAttributes, part: 'main', class: [{ 'gluon-dashboard-shell-main': true }, mainAttributes.class], children: main }),
        hasContent(utility) ? q.aside({ ...utilityNativeAttributes, part: 'utility', class: [{ 'gluon-dashboard-shell-utility': true }, utilityAttributes.class], aria: { ...utilityAria, label: utilityAria?.label ?? utilityLabel }, children: utility }) : nothing,
      ] }),
      hasContent(footer) ? q.footer({ ...footerAttributes, part: 'footer', class: [{ 'gluon-dashboard-shell-footer': true }, footerAttributes.class], children: footer }) : nothing,
    ],
  });
}

function createDashboardShellController({ id, mobileOpen, onMobileOpenChange }: Pick<DashboardShellProps, 'id' | 'mobileOpen' | 'onMobileOpenChange'>): DashboardShellController {
  let root: HTMLDivElement | undefined;
  const disconnect = (): void => { root?.ownerDocument.removeEventListener('pointerdown', onOutsidePointer, true); root = undefined; };
  const close = (event: DashboardShellOpenChangeEvent, restoreFocus: boolean): void => {
    if (!mobileOpen) return;
    const ownerDocument = root?.ownerDocument;
    onMobileOpenChange?.(false, event);
    if (restoreFocus) setTimeout(() => latestRoot(root, id, ownerDocument)?.querySelector<HTMLButtonElement>('[data-dashboard-shell-mobile-button]')?.focus(), 0);
  };
  const onOutsidePointer = (event: PointerEvent): void => { if (root && mobileOpen && event.target instanceof Node && !root.contains(event.target)) close(event, false); };
  return {
    rootRef(element) { if (element === root) return; disconnect(); root = element; root?.ownerDocument.addEventListener('pointerdown', onOutsidePointer, true); },
    onKeydown(event) { if (event.key === 'Escape') { event.preventDefault(); close(event, true); } },
    toggleMobile(event) { if (mobileOpen) close(event, false); else onMobileOpenChange?.(true, event); },
  };
}

function latestRoot(root: HTMLDivElement | undefined, id: string, ownerDocument = root?.ownerDocument): HTMLDivElement | undefined {
  return [...(ownerDocument?.querySelectorAll<HTMLDivElement>('[data-dashboard-shell-root]') ?? [])].filter((candidate) => candidate.id === id).at(-1) ?? root;
}
function hasContent(value: TemplateValue | undefined): boolean { return value != null && value !== false && value !== nothing; }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }
function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void { if (typeof listener === 'function') listener(event); else listener?.handleEvent(event); }

export const DashboardShell = defineOrganism(renderDashboardShell, 'DashboardShell', [dashboardShellStyleDependency]);
