import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import {
  Dialog,
  Overlay,
  createFocusScope,
  q,
  type DialogProps,
  type FocusScope,
  type FocusScopeOptions,
  type QuarkProps,
  type QuarkRef,
} from '@gluonjs/quarks';
import { dialogSurfaceStyleDependency } from './dialog-surface-styles.js';

export type DialogSurfacePlacement = 'center' | 'end' | 'full';
export type DialogSurfaceAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };
export type DialogSurfaceAttributes = NonNullable<DialogProps['attributes']>;
export type DialogSurfaceSectionAttributes = Omit<QuarkProps<HTMLElement>, 'children'>;

export interface DialogSurfaceController {
  readonly active: boolean;
  readonly ref: QuarkRef<HTMLDivElement>;
  activate(returnFocus?: HTMLElement | null): void;
  deactivate(): void;
  handleKeydown(event: KeyboardEvent): void;
}

export interface DialogSurfaceControllerOptions {
  readonly initialFocus?: FocusScopeOptions['initialFocus'];
}

const combinedRefCache = new WeakMap<DialogSurfaceController, {
  readonly external: QuarkRef<HTMLDivElement> | undefined;
  readonly ref: QuarkRef<HTMLDivElement>;
}>();

export function createDialogSurfaceController(
  options: DialogSurfaceControllerOptions = {},
): DialogSurfaceController {
  let container: HTMLDivElement | undefined;
  let scope: FocusScope | undefined;
  let activationRequested = false;
  let returnFocus: HTMLElement | null | undefined;
  let mountRevision = 0;

  const mountScope = (): void => {
    if (!container || !activationRequested) return;
    scope?.deactivate();
    scope = createFocusScope(container, { initialFocus: options.initialFocus, returnFocus });
    scope.activate();
  };
  const controller: DialogSurfaceController = {
    get active() { return scope?.active ?? false; },
    ref(element) {
      if (!element) {
        mountRevision += 1;
        scope?.deactivate();
        scope = undefined;
        container = undefined;
        return;
      }
      container = element;
      const revision = ++mountRevision;
      queueMicrotask(() => {
        if (revision === mountRevision) mountScope();
      });
    },
    activate(nextReturnFocus) {
      activationRequested = true;
      returnFocus = nextReturnFocus;
      mountScope();
    },
    deactivate() {
      activationRequested = false;
      scope?.deactivate();
      scope = undefined;
    },
    handleKeydown(event) {
      scope?.handleKeydown(event);
    },
  };
  return Object.freeze(controller);
}

export type DialogSurfaceProps = DialogSurfaceAccessibleName & {
  readonly id: string;
  readonly title?: TemplateValue;
  readonly description?: TemplateValue;
  readonly children: TemplateValue;
  readonly closeAction?: TemplateValue;
  readonly footer?: TemplateValue;
  readonly placement?: DialogSurfacePlacement;
  readonly modal?: boolean;
  readonly dismissOnOverlay?: boolean;
  readonly onDismiss?: () => void;
  readonly controller: DialogSurfaceController;
  readonly attributes?: DialogSurfaceAttributes;
  readonly overlayAttributes?: Omit<QuarkProps<HTMLDivElement>, 'children'>;
  readonly headerAttributes?: DialogSurfaceSectionAttributes;
  readonly contentAttributes?: Omit<QuarkProps<HTMLDivElement>, 'children'>;
  readonly footerAttributes?: DialogSurfaceSectionAttributes;
};

function renderDialogSurface({
  id,
  label,
  labelledBy,
  title,
  description,
  children,
  closeAction,
  footer,
  placement = 'center',
  modal = true,
  dismissOnOverlay = true,
  onDismiss,
  controller,
  attributes = {},
  overlayAttributes = {},
  headerAttributes = {},
  contentAttributes = {},
  footerAttributes = {},
}: DialogSurfaceProps): TemplateResult {
  const descriptionId = description === undefined ? undefined : `${id}-description`;
  const { aria, ref: attributeRef, onKeydown, ...nativeAttributes } = attributes;
  const accessibleName = label !== undefined ? { label } : { labelledBy: labelledBy! };
  const describedBy = [aria?.describedby, descriptionId].filter(Boolean).join(' ') || undefined;
  return Overlay({
    attributes: {
      ...overlayAttributes,
      class: [{ 'gluon-dialog-surface-overlay': true }, overlayAttributes.class],
    },
    onDismiss: dismissOnOverlay ? onDismiss : undefined,
    children: Dialog({
      ...accessibleName,
      modal,
      onDismiss,
      attributes: {
        ...nativeAttributes,
        id,
        class: [{ gluon: true, molecule: true, 'gluon-dialog-surface': true, [`is-${placement}`]: true }, attributes.class],
        data: { ...attributes.data, placement },
        aria: { ...aria, describedby: describedBy },
        ref: combineRefs(controller, attributeRef),
        onKeydown: (event: KeyboardEvent) => {
          if (typeof onKeydown === 'function') onKeydown(event);
          else onKeydown?.handleEvent(event);
          if (!event.defaultPrevented) controller.handleKeydown(event);
        },
      },
      children: [
        title !== undefined || closeAction !== undefined ? q.header({
          ...headerAttributes,
          class: [{ 'gluon-dialog-surface-header': true }, headerAttributes.class],
          children: [
            title === undefined ? nothing : q.h2({ id: labelledBy, class: 'gluon-dialog-surface-title', children: title }),
            closeAction ?? nothing,
          ],
        }) : nothing,
        description === undefined ? nothing : q.p({ id: descriptionId, class: 'gluon-dialog-surface-description', children: description }),
        q.div({ ...contentAttributes, class: [{ 'gluon-dialog-surface-content': true }, contentAttributes.class], children }),
        footer === undefined ? nothing : q.footer({
          ...footerAttributes,
          class: [{ 'gluon-dialog-surface-footer': true }, footerAttributes.class],
          children: footer,
        }),
      ],
    }),
  });
}

function assignRef<ElementType extends Element>(
  ref: QuarkRef<ElementType> | undefined,
  element: ElementType | undefined,
): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}

function combineRefs(
  controller: DialogSurfaceController,
  external: QuarkRef<HTMLDivElement> | undefined,
): QuarkRef<HTMLDivElement> {
  if (!external) return controller.ref;
  const cached = combinedRefCache.get(controller);
  if (cached?.external === external) return cached.ref;
  const ref: QuarkRef<HTMLDivElement> = (element) => {
    assignRef(external, element);
    assignRef(controller.ref, element);
  };
  combinedRefCache.set(controller, { external, ref });
  return ref;
}

export const DialogSurface = defineMolecule(renderDialogSurface, 'DialogSurface', [dialogSurfaceStyleDependency]);
