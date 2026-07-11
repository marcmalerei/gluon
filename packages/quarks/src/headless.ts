import { mergeProps, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from './quark.js';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface FocusScopeOptions {
  readonly initialFocus?: string | HTMLElement | (() => HTMLElement | null);
  readonly returnFocus?: HTMLElement | null;
}

export interface FocusScope {
  readonly active: boolean;
  activate(): void;
  deactivate(): void;
  focusFirst(): void;
  handleKeydown(event: KeyboardEvent): void;
}

export function getFocusableElements(container: ParentNode): readonly HTMLElement[] {
  return Object.freeze([...container.querySelectorAll<HTMLElement>(focusableSelector)]
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true'));
}

export function createFocusScope(
  container: HTMLElement,
  options: FocusScopeOptions = {},
): FocusScope {
  let active = false;
  let returnFocus = options.returnFocus;
  const captureReturnFocus = options.returnFocus === undefined;

  const scope: FocusScope = {
    get active() { return active; },
    activate() {
      if (active) return;
      active = true;
      if (captureReturnFocus && returnFocus === undefined) returnFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      scope.focusFirst();
    },
    deactivate() {
      if (!active) return;
      active = false;
      if (returnFocus?.isConnected) returnFocus.focus();
    },
    focusFirst() {
      resolveInitialFocus(container, options.initialFocus)
        ?.focus();
    },
    handleKeydown(event) {
      if (!active || event.key !== 'Tab') return;
      const focusable = getFocusableElements(container);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        container.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!container.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    },
  };

  return Object.freeze(scope);
}

function resolveInitialFocus(
  container: HTMLElement,
  target: FocusScopeOptions['initialFocus'],
): HTMLElement | null {
  const fallback = (): HTMLElement => getFocusableElements(container)[0] ?? container;
  if (typeof target === 'string') return container.querySelector<HTMLElement>(target) ?? fallback();
  if (typeof target === 'function') return target() ?? fallback();
  return target ?? fallback();
}

export interface OverlayProps {
  readonly children: TemplateValue;
  readonly onDismiss?: () => void;
  readonly attributes?: QuarkProps<HTMLDivElement>;
}

export function Overlay({ children, onDismiss, attributes = {} }: OverlayProps): TemplateResult {
  const attributePointerDown = attributes.onPointerDown as EventListenerOrEventListenerObject | null | undefined;
  return q.div(mergeProps({
    class: { gluon: true, quark: true, 'gluon-overlay': true },
    data: { gluonOverlay: true },
    onPointerDown: ((event: PointerEvent) => {
      callEventListener(attributePointerDown, event);
      if (!event.defaultPrevented && event.target === event.currentTarget) onDismiss?.();
    }) as EventListener,
    children,
  }, attributes));
}

interface DialogCommonProps {
  readonly children: TemplateValue;
  readonly modal?: boolean;
  readonly onDismiss?: () => void;
  readonly attributes?: QuarkProps<HTMLDivElement>;
}

export type DialogProps = DialogCommonProps & (
  | { readonly label: string; readonly labelledBy?: string }
  | { readonly label?: undefined; readonly labelledBy: string }
);

export function Dialog({
  children,
  label,
  labelledBy,
  modal = true,
  onDismiss,
  attributes = {},
}: DialogProps): TemplateResult {
  if (!label && !labelledBy) {
    throw new TypeError('Dialog requires label or labelledBy for an accessible name.');
  }
  const attributeKeydown = attributes.onKeydown as EventListenerOrEventListenerObject | null | undefined;
  return q.div({
    ...attributes,
    role: 'dialog',
    tabIndex: attributes.tabIndex ?? -1,
    aria: { ...attributes.aria, label, labelledby: labelledBy, modal },
    onKeydown: ((event: KeyboardEvent) => {
      callEventListener(attributeKeydown, event);
      if (event.defaultPrevented || event.key !== 'Escape' || !onDismiss) return;
      event.preventDefault();
      onDismiss();
    }) as EventListener,
    children,
  });
}

export interface PopoverProps {
  readonly id: string;
  readonly children: TemplateValue;
  readonly mode?: 'auto' | 'manual';
  readonly attributes?: QuarkProps<HTMLDivElement>;
}

export function Popover({ id, children, mode = 'auto', attributes = {} }: PopoverProps): TemplateResult {
  return q.div({ ...attributes, id, popover: mode, tabIndex: attributes.tabIndex ?? -1, children });
}

export interface ListboxOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface ListboxProps {
  readonly id: string;
  readonly label: string;
  readonly value?: string;
  readonly options: readonly ListboxOption[];
  readonly onChange?: (value: string) => void;
  readonly attributes?: QuarkProps<HTMLDivElement>;
}

export function Listbox({
  id,
  label,
  value,
  options,
  onChange,
  attributes = {},
}: ListboxProps): TemplateResult {
  const selected = options.find((option) => option.value === value && !option.disabled)
    ?? options.find((option) => !option.disabled);
  const select = (option: ListboxOption): void => {
    if (!option.disabled) onChange?.(option.value);
  };
  const attributeKeydown = attributes.onKeydown as EventListenerOrEventListenerObject | null | undefined;
  return q.div({
    ...attributes,
    id,
    role: 'listbox',
    tabIndex: attributes.tabIndex ?? 0,
    aria: {
      ...attributes.aria,
      label,
      activedescendant: selected ? `${id}-option-${encodeURIComponent(selected.value)}` : undefined,
    },
    onKeydown: ((event: KeyboardEvent) => {
      callEventListener(attributeKeydown, event);
      if (event.defaultPrevented) return;
      const enabled = options.filter((option) => !option.disabled);
      if (enabled.length === 0) return;
      const current = Math.max(0, enabled.findIndex((option) => option.value === selected?.value));
      const target = event.key === 'ArrowDown'
        ? enabled[(current + 1) % enabled.length]
        : event.key === 'ArrowUp'
          ? enabled[(current - 1 + enabled.length) % enabled.length]
          : event.key === 'Home'
            ? enabled[0]
            : event.key === 'End'
              ? enabled[enabled.length - 1]
              : undefined;
      if (!target) return;
      event.preventDefault();
      select(target);
    }) as EventListener,
    children: options.map((option) => q.div({
      id: `${id}-option-${encodeURIComponent(option.value)}`,
      role: 'option',
      aria: { selected: option.value === selected?.value, disabled: option.disabled || undefined },
      onClick: (() => select(option)) as EventListener,
      children: option.label,
    })),
  });
}

export interface FieldProps {
  readonly label: string;
  readonly children: TemplateValue;
  readonly helper?: TemplateValue;
  readonly error?: TemplateValue;
  readonly attributes?: QuarkProps<HTMLLabelElement>;
}

export function Field({ label, children, helper, error, attributes = {} }: FieldProps): TemplateResult {
  return q.label(mergeProps({
    class: { gluon: true, quark: true, 'gluon-field': true },
    children: [
      q.span({ data: { fieldLabel: true }, children: label }),
      children,
      error
        ? q.span({ role: 'alert', data: { fieldError: true }, children: error })
        : helper
          ? q.span({ data: { fieldHelper: true }, children: helper })
          : nothing,
    ],
  }, attributes));
}

function callEventListener(
  listener: EventListenerOrEventListenerObject | null | undefined,
  event: Event,
): void {
  if (typeof listener === 'function') listener.call(event.currentTarget, event);
  else listener?.handleEvent(event);
}
