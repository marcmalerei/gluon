import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { marketingHeaderStyleDependency } from './marketing-header-styles.js';

type MarketingHeaderAria = NonNullable<QuarkProps<HTMLElement>['aria']>;
type MarketingHeaderDivAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type MarketingHeaderAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: MarketingHeaderAria };
export type MarketingHeaderRegionAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & { readonly aria?: MarketingHeaderDivAria };
export type MarketingHeaderNavigationAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: MarketingHeaderAria };
export type MarketingHeaderTriggerAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'id' | 'type' | 'aria' | 'aria-controls' | 'aria-expanded'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'controls' | 'expanded' | 'label'>;
};
export type MarketingHeaderOpenChangeEvent = KeyboardEvent | MouseEvent | PointerEvent;

export interface MarketingHeaderProps {
  readonly id: string;
  readonly announcement?: TemplateValue;
  readonly brand: TemplateValue;
  readonly navigation?: TemplateValue;
  readonly actions?: TemplateValue;
  readonly mobileNavigation?: TemplateValue;
  readonly mobileOpen?: boolean;
  readonly mobileMenuLabel?: string;
  readonly onMobileOpenChange?: (open: boolean, event: MarketingHeaderOpenChangeEvent) => void;
  readonly attributes?: MarketingHeaderAttributes;
  readonly announcementAttributes?: MarketingHeaderRegionAttributes;
  readonly brandAttributes?: MarketingHeaderRegionAttributes;
  readonly navigationAttributes?: MarketingHeaderNavigationAttributes;
  readonly actionsAttributes?: MarketingHeaderRegionAttributes;
  readonly mobileNavigationAttributes?: MarketingHeaderNavigationAttributes;
  readonly triggerAttributes?: MarketingHeaderTriggerAttributes;
}

interface MarketingHeaderController {
  readonly rootRef: (element: HTMLElement | undefined) => void;
  readonly onPanelKeydown: (event: KeyboardEvent) => void;
  readonly toggle: (event: MouseEvent) => void;
}

function renderMarketingHeader({
  id, announcement, brand, navigation, actions, mobileNavigation,
  mobileOpen = false, mobileMenuLabel = 'Open menu', onMobileOpenChange,
  attributes = {}, announcementAttributes = {}, brandAttributes = {}, navigationAttributes = {},
  actionsAttributes = {}, mobileNavigationAttributes = {}, triggerAttributes = {},
}: MarketingHeaderProps): TemplateResult {
  assertDomId('MarketingHeader.id', id);
  assertNonEmpty('MarketingHeader.mobileMenuLabel', mobileMenuLabel);
  const hasMobileNavigation = hasContent(mobileNavigation);
  const controller = createMarketingHeaderController({ id, mobileOpen, onMobileOpenChange });
  const triggerId = `${id}-mobile-trigger`;
  const panelId = `${id}-mobile-panel`;
  const { aria: rootAria, ...nativeAttributes } = attributes;
  const { aria: triggerAria, onKeydown, ...nativeTriggerAttributes } = triggerAttributes;
  return q.header({
    ...nativeAttributes,
    id,
    ref: controller.rootRef,
    data: { ...attributes.data, marketingHeaderRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-marketing-header': true, 'is-mobile-open': mobileOpen }, attributes.class],
    aria: rootAria,
    children: [
      hasContent(announcement) ? q.div({ ...announcementAttributes, part: 'announcement', class: [{ 'gluon-marketing-header-announcement': true }, announcementAttributes.class], children: announcement }) : nothing,
      q.div({
        part: 'row',
        class: 'gluon-marketing-header-row',
        children: [
          q.div({ ...brandAttributes, part: 'brand', class: [{ 'gluon-marketing-header-brand': true }, brandAttributes.class], children: brand }),
          hasContent(navigation) ? q.nav({ ...navigationAttributes, part: 'navigation', class: [{ 'gluon-marketing-header-navigation': true }, navigationAttributes.class], aria: { ...navigationAttributes.aria, label: navigationAttributes.aria?.label ?? 'Primary marketing navigation' }, children: navigation }) : nothing,
          q.div({
            ...actionsAttributes,
            part: 'actions',
            class: [{ 'gluon-marketing-header-actions': true }, actionsAttributes.class],
            children: [
              hasContent(actions) ? actions : nothing,
              !hasMobileNavigation ? nothing : q.button({
                ...nativeTriggerAttributes,
                id: triggerId,
                part: 'mobile-trigger',
                type: 'button',
                class: [{ 'gluon-marketing-header-mobile-trigger': true }, triggerAttributes.class],
                aria: { ...triggerAria, controls: panelId, expanded: mobileOpen, label: mobileMenuLabel },
                data: { ...triggerAttributes.data, marketingHeaderMobileTrigger: id },
                onClick: (event: MouseEvent) => controller.toggle(event),
                onKeydown: (event: KeyboardEvent) => callListener(onKeydown, event),
                children: mobileOpen ? 'Close' : 'Menu',
              }),
            ],
          }),
        ],
      }),
      !hasMobileNavigation ? nothing : q.div({
        id: panelId,
        part: 'mobile-panel',
        hidden: !mobileOpen,
        class: 'gluon-marketing-header-mobile-panel',
        aria: { labelledby: triggerId },
        onKeydown: controller.onPanelKeydown,
        children: q.nav({ ...mobileNavigationAttributes, part: 'mobile-navigation', class: [{ 'gluon-marketing-header-mobile-navigation': true }, mobileNavigationAttributes.class], aria: { ...mobileNavigationAttributes.aria, label: mobileNavigationAttributes.aria?.label ?? mobileMenuLabel }, children: mobileNavigation }),
      }),
    ],
  });
}

function createMarketingHeaderController({ id, mobileOpen, onMobileOpenChange }: Pick<MarketingHeaderProps, 'id' | 'mobileOpen' | 'onMobileOpenChange'>): MarketingHeaderController {
  let root: HTMLElement | undefined;
  const close = (event: MarketingHeaderOpenChangeEvent, restoreFocus: boolean): void => {
    if (!mobileOpen) return;
    const ownerDocument = root?.ownerDocument;
    onMobileOpenChange?.(false, event);
    if (restoreFocus) setTimeout(() => latestRoot(root, id, ownerDocument)?.querySelector<HTMLButtonElement>('[data-marketing-header-mobile-trigger]')?.focus(), 0);
  };
  const onOutsidePointer = (event: PointerEvent): void => { if (root && event.target instanceof Node && !root.contains(event.target)) close(event, false); };
  const disconnect = (): void => { root?.ownerDocument.removeEventListener('pointerdown', onOutsidePointer, true); root = undefined; };
  return {
    rootRef(element) { if (element === root) return; disconnect(); root = element; root?.ownerDocument.addEventListener('pointerdown', onOutsidePointer, true); },
    onPanelKeydown(event) { if (event.key === 'Escape') { event.preventDefault(); close(event, true); } },
    toggle(event) { if (mobileOpen) close(event, false); else onMobileOpenChange?.(true, event); },
  };
}

function latestRoot(root: HTMLElement | undefined, id: string, ownerDocument = root?.ownerDocument): HTMLElement | undefined {
  return [...(ownerDocument?.querySelectorAll<HTMLElement>('[data-marketing-header-root]') ?? [])].filter((candidate) => candidate.id === id).at(-1) ?? root;
}
function hasContent(value: TemplateValue | undefined): boolean { return value != null && value !== false && value !== nothing; }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }
function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void { if (typeof listener === 'function') listener(event); else listener?.handleEvent(event); }

export const MarketingHeader = defineOrganism(renderMarketingHeader, 'MarketingHeader', [marketingHeaderStyleDependency]);
