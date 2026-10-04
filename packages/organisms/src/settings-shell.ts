import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { settingsShellStyleDependency } from './settings-shell-styles.js';

type SettingsShellAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type SettingsShellAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & { readonly aria?: SettingsShellAria };
export type SettingsShellRegionAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };
export type SettingsShellNavigationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };
export type SettingsShellButtonAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'id' | 'type' | 'aria' | 'aria-controls' | 'aria-expanded'> & { readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'controls' | 'expanded' | 'label'> };
export type SettingsShellOpenChangeEvent = KeyboardEvent | MouseEvent | PointerEvent;

export interface SettingsShellProps {
  readonly id: string;
  readonly title?: TemplateValue;
  readonly navigation?: TemplateValue;
  readonly content: TemplateValue;
  readonly footer?: TemplateValue;
  readonly navigationLabel?: string;
  readonly mobileMenuLabel?: string;
  readonly mobileOpen?: boolean;
  readonly onMobileOpenChange?: (open: boolean, event: SettingsShellOpenChangeEvent) => void;
  readonly attributes?: SettingsShellAttributes;
  readonly titleAttributes?: SettingsShellRegionAttributes;
  readonly navigationAttributes?: SettingsShellRegionAttributes;
  readonly navigationListAttributes?: SettingsShellNavigationAttributes;
  readonly contentAttributes?: SettingsShellRegionAttributes;
  readonly footerAttributes?: SettingsShellRegionAttributes;
  readonly mobileButtonAttributes?: SettingsShellButtonAttributes;
}

interface SettingsShellController {
  readonly rootRef: (element: HTMLDivElement | undefined) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly toggleMobile: (event: MouseEvent) => void;
}

function renderSettingsShell({
  id, title, navigation, content, footer,
  navigationLabel = 'Settings navigation', mobileMenuLabel = 'Open settings navigation', mobileOpen = false, onMobileOpenChange,
  attributes = {}, titleAttributes = {}, navigationAttributes = {}, navigationListAttributes = {}, contentAttributes = {}, footerAttributes = {}, mobileButtonAttributes = {},
}: SettingsShellProps): TemplateResult {
  assertDomId('SettingsShell.id', id);
  assertNonEmpty('SettingsShell.navigationLabel', navigationLabel);
  assertNonEmpty('SettingsShell.mobileMenuLabel', mobileMenuLabel);
  const controller = createSettingsShellController({ id, mobileOpen, onMobileOpenChange });
  const panelId = `${id}-navigation`;
  const { aria: rootAria, ...rootNativeAttributes } = attributes;
  const { aria: navigationAria, ...navigationNativeAttributes } = navigationAttributes;
  const { aria: navigationListAria, ...navigationListNativeAttributes } = navigationListAttributes;
  const { aria: mobileAria, onClick: mobileOnClick, ...nativeMobileButtonAttributes } = mobileButtonAttributes;
  return q.div({
    ...rootNativeAttributes, id, ref: controller.rootRef, part: 'root', data: { ...attributes.data, settingsShellRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-settings-shell': true, 'is-mobile-open': mobileOpen }, attributes.class], aria: rootAria, onKeydown: controller.onKeydown,
    children: [
      hasContent(title) ? q.header({ ...titleAttributes, part: 'title', class: [{ 'gluon-settings-shell-title': true }, titleAttributes.class], children: title }) : nothing,
      hasContent(navigation) ? q.button({ ...nativeMobileButtonAttributes, id: `${id}-mobile-button`, part: 'mobile-button', type: 'button', class: [{ 'gluon-settings-shell-mobile-button': true }, mobileButtonAttributes.class], aria: { ...mobileAria, controls: panelId, expanded: mobileOpen ? 'true' : 'false', label: mobileMenuLabel }, data: { ...mobileButtonAttributes.data, settingsShellMobileButton: id }, onClick: (event: MouseEvent) => { callListener(mobileOnClick, event); if (!event.defaultPrevented) controller.toggleMobile(event); }, children: mobileOpen ? 'Close' : 'Menu' }) : nothing,
      q.div({ part: 'layout', class: 'gluon-settings-shell-layout', children: [
        hasContent(navigation) ? q.aside({ ...navigationNativeAttributes, id: panelId, part: 'navigation', class: [{ 'gluon-settings-shell-navigation': true }, navigationAttributes.class], aria: navigationAria, children: q.nav({ ...navigationListNativeAttributes, part: 'navigation-list', class: 'gluon-settings-shell-navigation-list', aria: { ...navigationListAria, label: navigationListAria?.label ?? navigationLabel }, children: navigation }) }) : nothing,
        q.main({ ...contentAttributes, part: 'content', class: [{ 'gluon-settings-shell-content': true }, contentAttributes.class], children: content }),
      ] }),
      hasContent(footer) ? q.footer({ ...footerAttributes, part: 'footer', class: [{ 'gluon-settings-shell-footer': true }, footerAttributes.class], children: footer }) : nothing,
    ],
  });
}

function createSettingsShellController({ id, mobileOpen, onMobileOpenChange }: Pick<SettingsShellProps, 'id' | 'mobileOpen' | 'onMobileOpenChange'>): SettingsShellController {
  let root: HTMLDivElement | undefined;
  const disconnect = (): void => { root?.ownerDocument.removeEventListener('pointerdown', onOutsidePointer, true); root = undefined; };
  const close = (event: SettingsShellOpenChangeEvent, restoreFocus: boolean): void => {
    if (!mobileOpen) return;
    const ownerDocument = root?.ownerDocument;
    onMobileOpenChange?.(false, event);
    if (restoreFocus) setTimeout(() => latestRoot(root, id, ownerDocument)?.querySelector<HTMLButtonElement>('[data-settings-shell-mobile-button]')?.focus(), 0);
  };
  const onOutsidePointer = (event: PointerEvent): void => { if (root && mobileOpen && event.target instanceof Node && !root.contains(event.target)) close(event, false); };
  return {
    rootRef(element) { if (element === root) return; disconnect(); root = element; root?.ownerDocument.addEventListener('pointerdown', onOutsidePointer, true); },
    onKeydown(event) { if (event.key === 'Escape') { event.preventDefault(); close(event, true); } },
    toggleMobile(event) { if (mobileOpen) close(event, false); else onMobileOpenChange?.(true, event); },
  };
}

function latestRoot(root: HTMLDivElement | undefined, id: string, ownerDocument = root?.ownerDocument): HTMLDivElement | undefined { return [...(ownerDocument?.querySelectorAll<HTMLDivElement>('[data-settings-shell-root]') ?? [])].filter((candidate) => candidate.id === id).at(-1) ?? root; }
function hasContent(value: TemplateValue | undefined): boolean { return value != null && value !== false && value !== nothing; }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }
function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void { if (typeof listener === 'function') listener(event); else listener?.handleEvent(event); }

export const SettingsShell = defineOrganism(renderSettingsShell, 'SettingsShell', [settingsShellStyleDependency]);
