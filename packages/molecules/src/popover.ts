import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { popoverStyleDependency } from './popover-styles.js';

export type PopoverPlacement = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';
export type PopoverAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };
export type PopoverAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'role' | 'aria' | 'hidden' | 'tabIndex' | 'ref' | 'onKeydown'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'labelledby' | 'expanded' | 'controls' | 'haspopup'>;
  readonly ref?: QuarkProps<HTMLDivElement>['ref'];
};
export type PopoverTriggerAttributes = Omit<QuarkProps<HTMLButtonElement>, 'children' | 'disabled'>;

export type PopoverProps = PopoverAccessibleName & {
  readonly id: string;
  readonly trigger: (attributes: PopoverTriggerAttributes) => TemplateValue;
  readonly children: TemplateValue;
  readonly open?: boolean;
  readonly placement?: PopoverPlacement;
  readonly onOpenChange?: (open: boolean, event: Event) => void;
  readonly attributes?: PopoverAttributes;
};

/** Public type namespace companion for the request-free Popover renderer. */
export type Popover = PopoverProps;

interface PopoverController {
  readonly rootRef: QuarkRef<HTMLDivElement>;
  readonly triggerRef: QuarkRef<HTMLButtonElement>;
  readonly onOutsidePointer: (event: PointerEvent) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly toggle: (event: Event) => void;
}

function renderPopover({
  id,
  label,
  labelledBy,
  trigger,
  children,
  open = false,
  placement = 'block-end',
  onOpenChange,
  attributes = {},
}: PopoverProps): TemplateResult {
  assertDomId('Popover.id', id);
  if (label !== undefined && !label.trim()) throw new TypeError('Popover.label must be non-empty.');
  if (labelledBy !== undefined) assertDomId('Popover.labelledBy', labelledBy);
  if (!placements.has(placement)) throw new TypeError(`Unsupported Popover placement: ${placement}.`);
  const controller = createController(open, onOpenChange);
  const contentId = `${id}-content`;
  const triggerId = `${id}-trigger`;
  const { aria, ...nativeAttributes } = attributes;
  return q.div({
    ...nativeAttributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-popover': true, [`is-${placement}`]: true }, attributes.class],
    data: { ...attributes.data, placement, open: open || undefined },
    ref: (element) => {
      assignRef(controller.rootRef, element);
      assignRef(attributes.ref, element);
    },
    onPointerDown: controller.onOutsidePointer,
    children: [
      trigger({
        ...attributesForTrigger(controller, open, contentId, triggerId),
      }),
      q.div({
        id: contentId,
        role: 'dialog',
        hidden: !open,
        tabIndex: -1,
        aria: { ...aria, label, labelledby: labelledBy },
        class: 'gluon-popover-content',
        data: { open: open || undefined, placement },
        onKeydown: controller.onKeydown,
        children,
      }),
    ],
  });
}

function createController(open: boolean, onOpenChange: PopoverProps['onOpenChange']): PopoverController {
  let root: HTMLDivElement | undefined;
  let trigger: HTMLButtonElement | undefined;
  let returnFocus: HTMLElement | undefined;
  const disconnect = (): void => {
    root?.ownerDocument.removeEventListener('pointerdown', outsidePointer, true);
    root = undefined;
    trigger = undefined;
    returnFocus = undefined;
  };
  const close = (event: Event, restoreFocus: boolean): void => {
    if (!open) return;
    onOpenChange?.(false, event);
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    returnFocus = undefined;
  };
  const outsidePointer = (event: PointerEvent): void => {
    if (!root || !open || event.target instanceof Node && root.contains(event.target)) return;
    close(event, false);
  };
  return {
    rootRef(element) {
      if (element === root) return;
      disconnect();
      root = element;
      if (root && open) root.ownerDocument.addEventListener('pointerdown', outsidePointer, true);
    },
    triggerRef(element) {
      trigger = element;
      if (element && open && !returnFocus) returnFocus = element;
    },
    onOutsidePointer(event) {
      if (event.target === event.currentTarget && open) close(event, false);
    },
    onKeydown(event) {
      if (event.key !== 'Escape' || !open) return;
      event.preventDefault();
      event.stopPropagation();
      close(event, true);
    },
    toggle(event) {
      if (!open && trigger) returnFocus = trigger;
      onOpenChange?.(!open, event);
    },
  };
}

function attributesForTrigger(controller: PopoverController, open: boolean, contentId: string, triggerId: string): PopoverTriggerAttributes {
  return {
    id: triggerId,
    type: 'button',
    aria: { controls: contentId, expanded: open, haspopup: 'dialog' },
    ref: controller.triggerRef,
    onClick: controller.toggle,
    onKeydown: controller.onKeydown,
  };
}

function assignRef<ElementType extends Element>(ref: QuarkRef<ElementType> | undefined, element: ElementType | undefined): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}

function assertDomId(name: string, value: string): void {
  if (!value.trim() || /\s/u.test(value)) throw new TypeError(`${name} must be a non-empty DOM id without whitespace.`);
}

const placements = new Set<PopoverPlacement>(['block-start', 'block-end', 'inline-start', 'inline-end']);

export const Popover = defineMolecule(renderPopover, 'Popover', [popoverStyleDependency]);
