import { createFocusScope, Dialog, Overlay, q, type FocusScope, type FocusScopeOptions, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { sheetStyleDependency } from './sheet-styles.js';

export type SheetPlacement = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
export type SheetAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };
export type SheetAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'role' | 'aria' | 'hidden' | 'tabIndex' | 'ref' | 'onKeydown'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'labelledby' | 'modal'>;
  readonly ref?: QuarkProps<HTMLDivElement>['ref'];
};
export type SheetSectionAttributes = Omit<QuarkProps<HTMLElement>, 'children'>;

export type SheetProps = SheetAccessibleName & {
  readonly id: string;
  readonly title?: TemplateValue;
  readonly description?: TemplateValue;
  readonly children: TemplateValue;
  readonly footer?: TemplateValue;
  readonly closeAction?: TemplateValue;
  readonly open?: boolean;
  readonly placement?: SheetPlacement;
  readonly modal?: boolean;
  readonly dismissOnOverlay?: boolean;
  readonly onOpenChange?: (open: boolean, event: Event) => void;
  readonly initialFocus?: FocusScopeOptions['initialFocus'];
  readonly attributes?: SheetAttributes;
  readonly overlayAttributes?: Omit<QuarkProps<HTMLDivElement>, 'children'>;
  readonly headerAttributes?: SheetSectionAttributes;
  readonly contentAttributes?: Omit<QuarkProps<HTMLDivElement>, 'children'>;
  readonly footerAttributes?: SheetSectionAttributes;
};

/** Public type namespace companion for the request-free Sheet renderer. */
export type Sheet = SheetProps;

interface SheetController {
  readonly ref: QuarkRef<HTMLDivElement>;
  readonly activate: () => void;
  readonly deactivate: () => void;
  readonly handleKeydown: (event: KeyboardEvent) => void;
}

function renderSheet({
  id,
  label,
  labelledBy,
  title,
  description,
  children,
  footer,
  closeAction,
  open = false,
  placement = 'inline-end',
  modal = true,
  dismissOnOverlay = true,
  onOpenChange,
  initialFocus,
  attributes = {},
  overlayAttributes = {},
  headerAttributes = {},
  contentAttributes = {},
  footerAttributes = {},
}: SheetProps): TemplateResult {
  assertDomId('Sheet.id', id);
  if (label !== undefined && !label.trim()) throw new TypeError('Sheet.label must be non-empty.');
  if (labelledBy !== undefined) assertDomId('Sheet.labelledBy', labelledBy);
  const controller = createController(open, initialFocus);
  const titleId = `${id}-title`;
  const descriptionId = description === undefined ? undefined : `${id}-description`;
  const accessibleName = label !== undefined ? { label } : { labelledBy: labelledBy ?? titleId };
  const dismiss = (event: Event): void => onOpenChange?.(false, event);
  const { aria, ...nativeAttributes } = attributes;
  return Overlay({
    attributes: {
      ...overlayAttributes,
      hidden: !open,
      class: [{ gluon: true, molecule: true, 'gluon-sheet-overlay': true, [`is-${placement}`]: true }, overlayAttributes.class],
      data: { ...overlayAttributes.data, open: open || undefined, placement },
    },
    onDismiss: dismissOnOverlay ? () => dismiss(new Event('dismiss')) : undefined,
    children: Dialog({
      ...accessibleName,
      modal,
      onDismiss: () => dismiss(new Event('dismiss')),
      attributes: {
        ...nativeAttributes,
        id,
        hidden: !open,
        class: [{ gluon: true, molecule: true, 'gluon-sheet': true, [`is-${placement}`]: true }, attributes.class],
        data: { ...attributes.data, open: open || undefined, placement },
        aria: { ...aria, describedby: descriptionId },
        ref: (element) => {
          assignRef(controller.ref, element);
          assignRef(attributes.ref, element);
        },
        onKeydown: (event: KeyboardEvent) => {
          controller.handleKeydown(event);
        },
      },
      children: [
        title !== undefined || closeAction !== undefined ? q.header({
          ...headerAttributes,
          class: [{ 'gluon-sheet-header': true }, headerAttributes.class],
          children: [
            title === undefined ? nothing : q.h2({ id: titleId, class: 'gluon-sheet-title', children: title }),
            closeAction ?? nothing,
          ],
        }) : nothing,
        description === undefined ? nothing : q.p({ id: descriptionId, class: 'gluon-sheet-description', children: description }),
        q.div({ ...contentAttributes, class: [{ 'gluon-sheet-content': true }, contentAttributes.class], children }),
        footer === undefined ? nothing : q.footer({ ...footerAttributes, class: [{ 'gluon-sheet-footer': true }, footerAttributes.class], children: footer }),
      ],
    }),
  });
}

function createController(open: boolean, initialFocus: FocusScopeOptions['initialFocus']): SheetController {
  let element: HTMLDivElement | undefined;
  let scope: FocusScope | undefined;
  const controller: SheetController = {
    ref(next) {
      if (next === element) return;
      scope?.deactivate();
      scope = undefined;
      element = next;
      if (element && open) controller.activate();
    },
    activate() {
      if (!element || scope?.active) return;
      scope = createFocusScope(element, { initialFocus });
      queueMicrotask(() => scope?.activate());
    },
    deactivate() {
      scope?.deactivate();
      scope = undefined;
    },
    handleKeydown(event) {
      if (!event.defaultPrevented) scope?.handleKeydown(event);
    },
  };
  return controller;
}

function assignRef<ElementType extends Element>(ref: QuarkRef<ElementType> | undefined, element: ElementType | undefined): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}

function assertDomId(name: string, value: string): void {
  if (!value.trim() || /\s/u.test(value)) throw new TypeError(`${name} must be a non-empty DOM id without whitespace.`);
}

const placements = new Set<SheetPlacement>(['inline-start', 'inline-end', 'block-start', 'block-end']);

export const Sheet = defineMolecule(renderSheet, 'Sheet', [sheetStyleDependency]);
