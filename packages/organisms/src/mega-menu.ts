import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { megaMenuStyleDependency } from './mega-menu-styles.js';

export type MegaMenuAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria' | 'aria-label'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLElement>['aria']>, 'label'>;
};
export type MegaMenuTriggerAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'id' | 'type' | 'disabled' | 'aria' | 'aria-controls' | 'aria-expanded' | 'aria-haspopup'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLButtonElement>['aria']>, 'controls' | 'expanded' | 'haspopup'>;
};
export type MegaMenuLinkAttributes = Omit<QuarkProps<HTMLAnchorElement>, 'children' | 'href' | 'id' | 'aria' | 'aria-current' | 'aria-disabled'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLAnchorElement>['aria']>, 'current' | 'disabled'>;
};

export interface MegaMenuLink {
  readonly id: string;
  readonly label: TemplateValue;
  readonly href?: string;
  readonly description?: TemplateValue;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly attributes?: MegaMenuLinkAttributes;
}

export interface MegaMenuGroup {
  readonly id: string;
  readonly label: TemplateValue;
  readonly description?: TemplateValue;
  readonly links: readonly MegaMenuLink[];
}

export type MegaMenuOpenChangeEvent = KeyboardEvent | MouseEvent | PointerEvent;

export interface MegaMenuProps {
  readonly id: string;
  readonly label: string;
  readonly trigger: TemplateValue;
  readonly groups: readonly MegaMenuGroup[];
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean, event: MegaMenuOpenChangeEvent) => void;
  readonly triggerAttributes?: MegaMenuTriggerAttributes;
  readonly attributes?: MegaMenuAttributes;
}

interface MegaMenuController {
  readonly rootRef: (element: HTMLElement | undefined) => void;
  readonly onTriggerKeydown: (event: KeyboardEvent) => void;
  readonly onPanelKeydown: (event: KeyboardEvent) => void;
  readonly toggle: (event: MouseEvent) => void;
}

function renderMegaMenu({ id, label, trigger, groups, open = false, onOpenChange, triggerAttributes = {}, attributes = {} }: MegaMenuProps): TemplateResult {
  assertDomId('MegaMenu.id', id);
  assertNonEmpty('MegaMenu.label', label);
  validateGroups(groups);
  const controller = createMegaMenuController({ id, open, onOpenChange });
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;
  const { aria, onKeydown, ...nativeTriggerAttributes } = triggerAttributes;
  const panelDescriptionId = `${id}-description`;
  const description = groups.find((group) => group.description !== undefined)?.description;
  const { aria: rootAria, ...nativeAttributes } = attributes;
  return q.nav({
    ...nativeAttributes,
    id,
    data: { ...attributes.data, megaMenuRoot: id },
    class: [{ gluon: true, organism: true, 'gluon-mega-menu': true, 'is-open': open }, attributes.class],
    aria: { ...rootAria, label },
    ref: (element) => controller.rootRef(element),
    children: [
      q.button({
        ...nativeTriggerAttributes,
        id: triggerId,
        type: 'button',
        class: [{ 'gluon-mega-menu-trigger': true }, triggerAttributes.class],
        aria: { ...aria, controls: panelId, expanded: open, haspopup: 'true' },
        data: { megaMenuTrigger: 'true' },
        onClick: (event: MouseEvent) => controller.toggle(event),
        onKeydown: (event: KeyboardEvent) => {
          callListener(onKeydown, event);
          if (!event.defaultPrevented) controller.onTriggerKeydown(event);
        },
        children: [trigger, q.span({ class: 'gluon-mega-menu-chevron', aria: { hidden: true }, children: '⌄' })],
      }),
      q.div({
        id: panelId,
        hidden: !open,
        class: 'gluon-mega-menu-panel',
        aria: { labelledby: triggerId, describedby: description === undefined ? undefined : panelDescriptionId },
        onKeydown: controller.onPanelKeydown,
        children: [
          description === undefined ? nothing : q.p({ id: panelDescriptionId, class: 'gluon-mega-menu-description', children: description }),
          q.div({
            class: 'gluon-mega-menu-groups',
            children: groups.map((group) => q.section({
              class: 'gluon-mega-menu-group',
              children: [
                q.h2({ class: 'gluon-mega-menu-group-label', children: group.label }),
                q.ul({
                  class: 'gluon-mega-menu-links',
                  children: group.links.map((link) => renderLink(link)),
                }),
              ],
            })),
          }),
        ],
      }),
    ],
  });

  function renderLink(link: MegaMenuLink): TemplateResult {
    const descriptionId = link.description === undefined ? undefined : `${id}-link-${link.id}-description`;
    const { aria: linkAria, onClick, ...nativeLinkAttributes } = link.attributes ?? {};
    return q.li({
      class: [{ 'gluon-mega-menu-item': true, 'is-disabled': link.disabled }],
      children: [
        q.a({
          ...nativeLinkAttributes,
          id: `${id}-link-${link.id}`,
          href: link.disabled ? undefined : link.href,
          class: [{ 'gluon-mega-menu-link': true }, link.attributes?.class],
          aria: { ...linkAria, current: link.active ? 'page' : undefined, disabled: link.disabled ? 'true' : undefined, describedby: descriptionId },
          tabIndex: link.disabled ? -1 : link.attributes?.tabIndex,
          data: { ...link.attributes?.data, megaMenuLink: link.id },
          onClick: (event: MouseEvent) => {
            if (link.disabled) event.preventDefault();
            callListener(onClick, event);
          },
          children: [
            q.span({ class: 'gluon-mega-menu-link-label', children: link.label }),
            link.description === undefined ? nothing : q.span({ id: descriptionId, class: 'gluon-mega-menu-link-description', children: link.description }),
          ],
        }),
      ],
    });
  }
}

function createMegaMenuController({ id, open, onOpenChange }: Pick<MegaMenuProps, 'id' | 'open' | 'onOpenChange'>): MegaMenuController {
  let root: HTMLElement | undefined;
  const disconnect = (): void => {
    root?.ownerDocument.removeEventListener('pointerdown', onOutsidePointer, true);
    root = undefined;
  };
  const close = (event: MegaMenuOpenChangeEvent, restoreFocus: boolean): void => {
    if (!open) return;
    const ownerDocument = root?.ownerDocument;
    onOpenChange?.(false, event);
    if (restoreFocus) {
      setTimeout(() => {
        const currentTrigger = latestRoot(root, id, ownerDocument)?.querySelector<HTMLButtonElement>('[data-mega-menu-trigger]');
        currentTrigger?.focus();
      }, 0);
    }
  };
  const focusLink = (direction: 1 | -1, ownerDocument = root?.ownerDocument): void => {
    setTimeout(() => {
      const targetRoot = latestRoot(root, id, ownerDocument);
      const links = enabledLinks(targetRoot);
      (direction === 1 ? links[0] : links.at(-1))?.focus();
    }, 0);
  };
  const onOutsidePointer = (event: PointerEvent): void => {
    if (root && event.target instanceof Node && !root.contains(event.target)) close(event, false);
  };
  return {
    rootRef(element) {
      if (element === root) return;
      disconnect();
      root = element;
      root?.ownerDocument.addEventListener('pointerdown', onOutsidePointer, true);
    },
    onTriggerKeydown(event) {
      const ownerDocument = root?.ownerDocument;
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpenChange?.(true, event);
        focusLink(1, ownerDocument);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        onOpenChange?.(true, event);
        focusLink(-1, ownerDocument);
      } else if (event.key === 'Escape' && open) {
        event.preventDefault();
        close(event, true);
      }
    },
    onPanelKeydown(event) {
      const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('.gluon-mega-menu-link') : undefined;
      if (event.key === 'Escape') {
        event.preventDefault();
        close(event, true);
        return;
      }
      if (!target) return;
      const links = enabledLinks(root);
      const index = links.indexOf(target);
      if (index < 0) return;
      let next: HTMLElement | undefined;
      if (event.key === 'Home') next = links[0];
      else if (event.key === 'End') next = links.at(-1);
      else if (event.key === 'ArrowDown') next = links[(index + 1) % links.length];
      else if (event.key === 'ArrowUp') next = links[(index - 1 + links.length) % links.length];
      if (next) {
        event.preventDefault();
        next.focus();
      }
    },
    toggle(event) {
      const ownerDocument = root?.ownerDocument;
      if (open) close(event, false);
      else {
        onOpenChange?.(true, event);
        focusLink(1, ownerDocument);
      }
    },
  };
}

function latestRoot(root: HTMLElement | undefined, id: string, ownerDocument = root?.ownerDocument): HTMLElement | undefined {
  const roots = [...(ownerDocument?.querySelectorAll<HTMLElement>('[data-mega-menu-root]') ?? [])].filter((candidate) => candidate.id === id);
  return roots.at(-1) ?? root;
}

function enabledLinks(root: HTMLElement | undefined): HTMLElement[] {
  return [...(root?.querySelectorAll<HTMLElement>('.gluon-mega-menu-link') ?? [])].filter((link) => !link.hasAttribute('aria-disabled') && !link.hasAttribute('disabled'));
}

function validateGroups(groups: readonly MegaMenuGroup[]): void {
  const seen = new Set<string>();
  for (const group of groups) {
    assertDomId(`MegaMenu group ${group.id}`, group.id);
    if (seen.has(group.id)) throw new TypeError(`MegaMenu ids must be unique: ${group.id}`);
    seen.add(group.id);
    for (const link of group.links) {
      assertDomId(`MegaMenu link ${link.id}`, link.id);
      if (seen.has(link.id)) throw new TypeError(`MegaMenu ids must be unique: ${link.id}`);
      seen.add(link.id);
    }
  }
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}

function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const MegaMenu = defineOrganism(renderMegaMenu, 'MegaMenu', [megaMenuStyleDependency]);
