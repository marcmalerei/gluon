import {
  defineOrganism,
  nothing,
  type TemplateResult,
  type TemplateValue,
} from "@gluonjs/core";
import { q, type QuarkProps, type QuarkRef } from "@gluonjs/quarks";
import { confirmationDialogStyleDependency } from "./confirmation-dialog-styles.js";

export type ConfirmationDialogAttributes = Omit<
  QuarkProps<HTMLDialogElement>,
  "children" | "open" | ".open" | "?open"
>;
export type ConfirmationDialogInitialFocus = string | HTMLElement;
type ConfirmationDialogEventListener<EventType extends Event> =
  | ((event: EventType) => unknown)
  | { handleEvent(event: EventType): void }
  | null
  | undefined;

export interface ConfirmationDialogControllerOptions {
  readonly initialFocus?: ConfirmationDialogInitialFocus;
}

export interface ConfirmationDialogController {
  readonly open: boolean;
  readonly ref: QuarkRef<HTMLDialogElement>;
  show(returnFocus?: HTMLElement | null): void;
  close(returnValue?: string): void;
}

export function createConfirmationDialogController(
  options: ConfirmationDialogControllerOptions = {},
): ConfirmationDialogController {
  let dialog: HTMLDialogElement | undefined;
  let returnFocus: HTMLElement | null | undefined;
  let refRevision = 0;

  const restoreFocus = (): void => {
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = undefined;
  };
  const handleClose = (): void => {
    const revision = refRevision;
    queueMicrotask(() => {
      if (refRevision === revision) restoreFocus();
    });
  };
  const detach = (): void => dialog?.removeEventListener("close", handleClose);
  const focusInitial = (openingDialog: HTMLDialogElement): void => {
    if (options.initialFocus === undefined) return;
    queueMicrotask(() => {
      const target =
        typeof options.initialFocus === "string"
          ? openingDialog.querySelector<HTMLElement>(options.initialFocus)
          : options.initialFocus;
      if (
        openingDialog.open &&
        target?.isConnected &&
        !target.matches(':disabled, [inert], [aria-disabled="true"]')
      ) {
        target.focus();
      }
    });
  };
  const controller: ConfirmationDialogController = {
    get open() {
      return dialog?.open ?? false;
    },
    ref(element) {
      const revision = ++refRevision;
      if (element) {
        if (element === dialog) return;
        const reopen = dialog?.open ?? false;
        detach();
        dialog = element;
        dialog.addEventListener("close", handleClose);
        if (reopen) {
          queueMicrotask(() => {
            if (!element.isConnected || element.open) return;
            element.showModal();
            focusInitial(element);
          });
        }
        return;
      }
      const previous = dialog;
      queueMicrotask(() => {
        if (refRevision !== revision || dialog !== previous) return;
        detach();
        dialog = undefined;
        restoreFocus();
      });
    },
    show(nextReturnFocus) {
      if (!dialog?.isConnected || dialog.open) return;
      const activeElement = dialog.ownerDocument.activeElement;
      returnFocus =
        nextReturnFocus === undefined
          ? activeElement instanceof HTMLElement
            ? activeElement
            : null
          : nextReturnFocus;
      dialog.showModal();
      focusInitial(dialog);
    },
    close(returnValue) {
      if (!dialog?.open) return;
      dialog.close(returnValue);
      restoreFocus();
    },
  };
  return Object.freeze(controller);
}

export interface ConfirmationDialogProps {
  readonly id: string;
  readonly title: TemplateValue;
  readonly description?: TemplateValue;
  readonly leading?: TemplateValue;
  readonly safeAction?: TemplateValue;
  readonly primaryAction: TemplateValue;
  readonly status?: TemplateValue;
  /** Controlled SSR/Storybook state. Omit when the controller owns lifecycle. */
  readonly open?: boolean;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
  readonly dismissOnBackdrop?: boolean;
  readonly controller?: ConfirmationDialogController;
  readonly attributes?: ConfirmationDialogAttributes;
}

export function renderConfirmationDialog({
  id,
  title,
  description,
  leading,
  safeAction,
  primaryAction,
  status,
  open,
  busy = false,
  disabled = false,
  destructive = false,
  dismissOnBackdrop = false,
  controller,
  attributes = {},
}: ConfirmationDialogProps): TemplateResult {
  assertDomId("ConfirmationDialog.id", id);
  const titleId = `${id}-title`;
  const descriptionId =
    description === undefined ? undefined : `${id}-description`;
  const blocked = busy || disabled;
  const {
    ref: attributeRef,
    "@cancel": attributeCancel,
    onClick: attributeClick,
    ...nativeAttributes
  } = attributes;
  const ref: QuarkRef<HTMLDialogElement> = (element) => {
    assignRef(attributeRef, element);
    if (controller) assignRef(controller.ref, element);
    if (!element || open === undefined) return;
    queueMicrotask(() => {
      if (!element.isConnected) return;
      if (open) {
        if (element.matches(":modal")) return;
        if (controller) controller.show(null);
        else {
          element.removeAttribute("open");
          element.showModal();
        }
      } else if (element.open) {
        if (controller) controller.close();
        else element.close();
      }
    });
  };
  return q.dialog({
    ...nativeAttributes,
    id,
    ref,
    ...(controller ? {} : { open: open === true }),
    class: [
      { gluon: true, organism: true, "gluon-confirmation-dialog": true },
      attributes.class,
    ],
    data: {
      ...attributes.data,
      busy: busy || undefined,
      disabled: disabled || undefined,
      destructive: destructive || undefined,
    },
    aria: {
      ...attributes.aria,
      labelledby: titleId,
      describedby: descriptionId,
      busy: busy || undefined,
    },
    "@cancel": (event: Event) => {
      callListener(attributeCancel, event);
      if (blocked && !event.defaultPrevented) event.preventDefault();
    },
    onClick: (event: MouseEvent) => {
      callListener(attributeClick, event);
      if (
        event.defaultPrevented ||
        blocked ||
        !dismissOnBackdrop ||
        event.target !== event.currentTarget
      )
        return;
      if (controller) controller.close("backdrop");
      else (event.currentTarget as HTMLDialogElement).close("backdrop");
    },
    children: q.div({
      class: "gluon-confirmation-dialog-content",
      part: "content",
      children: [
        leading === undefined
          ? nothing
          : q.div({
              class: "gluon-confirmation-dialog-leading",
              part: "leading",
              children: leading,
            }),
        q.h2({
          id: titleId,
          class: "gluon-confirmation-dialog-title",
          part: "title",
          children: title,
        }),
        description === undefined
          ? nothing
          : q.p({
              id: descriptionId,
              class: "gluon-confirmation-dialog-description",
              part: "description",
              children: description,
            }),
        q.div({
          class: "gluon-confirmation-dialog-actions",
          part: "actions",
          ".inert": blocked,
          aria: { disabled: blocked || undefined },
          children: [
            safeAction === undefined
              ? nothing
              : q.div({
                  class: "gluon-confirmation-dialog-safe",
                  part: "safe-action",
                  children: safeAction,
                }),
            q.div({
              class: "gluon-confirmation-dialog-primary",
              part: "primary-action",
              children: primaryAction,
            }),
          ],
        }),
        status === undefined
          ? nothing
          : q.div({
              class: "gluon-confirmation-dialog-status",
              part: "status",
              role: "status",
              aria: { live: "polite", atomic: true },
              children: status,
            }),
      ],
    }),
  });
}

function assignRef(
  ref: QuarkRef<HTMLDialogElement> | undefined,
  element: HTMLDialogElement | undefined,
): void {
  if (typeof ref === "function") ref(element);
  else if (ref) ref.value = element;
}

function callListener<EventType extends Event>(
  listener: ConfirmationDialogEventListener<EventType>,
  event: EventType,
): void {
  if (typeof listener === "function") listener(event);
  else listener?.handleEvent(event);
}

function assertDomId(name: string, value: string): void {
  if (value.trim().length === 0)
    throw new TypeError(`${name} must be a non-empty string.`);
  if (/\s/u.test(value))
    throw new TypeError(`${name} must not contain whitespace.`);
}

export const ConfirmationDialog = defineOrganism(
  renderConfirmationDialog,
  "ConfirmationDialog",
  [confirmationDialogStyleDependency],
);
