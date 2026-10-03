import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { siteHeaderStyleDependency } from './site-header-styles.js';

type SiteHeaderAria = NonNullable<QuarkProps<HTMLElement>['aria']>;
type SiteHeaderDivAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type SiteHeaderAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: SiteHeaderAria };
export type SiteHeaderRegionAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & { readonly aria?: SiteHeaderDivAria };
export type SiteHeaderNavigationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: SiteHeaderAria };
export type SiteHeaderTriggerAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'id' | 'type' | 'aria' | 'aria-controls' | 'aria-expanded'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'controls' | 'expanded' | 'label'>;
};
export type SiteHeaderOpenChangeEvent = KeyboardEvent | MouseEvent | PointerEvent;

export interface SiteHeaderProps {
  readonly id: string;
  readonly brand: TemplateValue;
  readonly navigation?: TemplateValue;
  readonly actions?: TemplateValue;
  readonly mobileNavigation?: TemplateValue;
  readonly mobileOpen?: boolean;
  readonly mobileMenuLabel?: string;
  readonly onMobileOpenChange?: (open: boolean, event: SiteHeaderOpenChangeEvent) => void;
  readonly triggerAttributes?: SiteHeaderTriggerAttributes;
  readonly brandAttributes?: SiteHeaderRegionAttributes;
  readonly navigationAttributes?: SiteHeaderNavigationAttributes;
  readonly actionsAttributes?: SiteHeaderRegionAttributes;
  readonly mobileNavigationAttributes?: SiteHeaderNavigationAttributes;
  readonly attributes?: SiteHeaderAttributes;
}

interface SiteHeaderController {
  readonly rootRef: (element: HTMLElement | undefined) => void;
  readonly onPanelKeydown: (event: KeyboardEvent) => void;
  readonly toggle: (event: MouseEvent) => void;
}

function renderSiteHeader({
  id,
  brand,
  navigation,
  actions,
  mobileNavigation,
  mobileOpen = false,
  mobileMenuLabel = 'Open navigation',
  onMobileOpenChange,
  triggerAttributes = {},
  brandAttributes = {},
  navigationAttributes = {},
  actionsAttributes = {},
  mobileNavigationAttributes = {},
  attributes = {},
}: SiteHeaderProps): TemplateResult {
  assertDomId('SiteHeader.id', id);
  assertNonEmpty('SiteHeader.mobileMenuLabel', mobileMenuLabel);
  const hasMobileNavigation = hasContent(mobileNavigation);
  const controller = createSiteHeaderController({ id, mobileOpen, onMobileOpenChange });
  const triggerId = `${id}-mobile-trigger`;
  const panelId = `${id}-mobile-panel`;
  const { aria: triggerAria, onKeydown, ...nativeTriggerAttributes } = triggerAttributes;
  const { aria: rootAria, ...nativeAttributes } = attributes;
  return q.header({
    ...nativeAttributes,
    id,
    ref: controller.rootRef,
    data: { ...attributes.data, siteHeaderRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-site-header': true, 'is-mobile-open': mobileOpen }, attributes.class],
    aria: rootAria,
    children: [
      q.div({
        class: 'gluon-site-header-row',
        children: [
          q.div({ ...brandAttributes, class: [{ 'gluon-site-header-brand': true }, brandAttributes.class], children: brand }),
          hasContent(navigation) ? q.nav({ ...navigationAttributes, class: [{ 'gluon-site-header-navigation': true }, navigationAttributes.class], aria: { ...navigationAttributes.aria, label: navigationAttributes.aria?.label ?? 'Primary navigation' }, children: navigation }) : nothing,
          q.div({
            ...actionsAttributes,
            class: [{ 'gluon-site-header-actions': true }, actionsAttributes.class],
            children: [
              hasContent(actions) ? actions : nothing,
              !hasMobileNavigation ? nothing : q.button({
                ...nativeTriggerAttributes,
                id: triggerId,
                type: 'button',
                class: [{ 'gluon-site-header-mobile-trigger': true }, triggerAttributes.class],
                aria: { ...triggerAria, controls: panelId, expanded: mobileOpen, label: mobileMenuLabel },
                data: { ...triggerAttributes.data, siteHeaderMobileTrigger: id },
                onClick: (event: MouseEvent) => controller.toggle(event),
                onKeydown: (event: KeyboardEvent) => { callListener(onKeydown, event); },
                children: mobileOpen ? 'Close' : 'Menu',
              }),
            ],
          }),
        ],
      }),
      !hasMobileNavigation ? nothing : q.div({
        id: panelId,
        hidden: !mobileOpen,
        class: 'gluon-site-header-mobile-panel',
        aria: { labelledby: triggerId },
        onKeydown: controller.onPanelKeydown,
        children: [q.nav({ ...mobileNavigationAttributes, class: [{ 'gluon-site-header-mobile-navigation': true }, mobileNavigationAttributes.class], aria: { ...mobileNavigationAttributes.aria, label: mobileNavigationAttributes.aria?.label ?? mobileMenuLabel }, children: mobileNavigation })],
      }),
    ],
  });
}

function createSiteHeaderController({ id, mobileOpen, onMobileOpenChange }: Pick<SiteHeaderProps, 'id' | 'mobileOpen' | 'onMobileOpenChange'>): SiteHeaderController {
  let root: HTMLElement | undefined;
  const close = (event: SiteHeaderOpenChangeEvent, restoreFocus: boolean): void => {
    if (!mobileOpen) return;
    const ownerDocument = root?.ownerDocument;
    onMobileOpenChange?.(false, event);
    if (restoreFocus) setTimeout(() => latestRoot(root, id, ownerDocument)?.querySelector<HTMLButtonElement>('[data-site-header-mobile-trigger]')?.focus(), 0);
  };
  const onOutsidePointer = (event: PointerEvent): void => {
    if (root && event.target instanceof Node && !root.contains(event.target)) close(event, false);
  };
  const disconnect = (): void => { root?.ownerDocument.removeEventListener('pointerdown', onOutsidePointer, true); root = undefined; };
  return {
    rootRef(element) {
      if (element === root) return;
      disconnect();
      root = element;
      root?.ownerDocument.addEventListener('pointerdown', onOutsidePointer, true);
    },
    onPanelKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(event, true); }
    },
    toggle(event) {
      if (mobileOpen) close(event, false);
      else onMobileOpenChange?.(true, event);
    },
  };
}

function latestRoot(root: HTMLElement | undefined, id: string, ownerDocument = root?.ownerDocument): HTMLElement | undefined {
  const roots = [...(ownerDocument?.querySelectorAll<HTMLElement>('[data-site-header-root]') ?? [])].filter((candidate) => candidate.id === id);
  return roots.at(-1) ?? root;
}

function hasContent(value: TemplateValue | undefined): boolean { return value != null && value !== false && value !== nothing; }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }
function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void { if (typeof listener === 'function') listener(event); else listener?.handleEvent(event); }

export const SiteHeader = defineOrganism(renderSiteHeader, 'SiteHeader', [siteHeaderStyleDependency]);
