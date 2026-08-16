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

type ContentAttributes<ElementType extends HTMLElement> = Omit<
  QuarkProps<ElementType>,
  'children'
>;

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
  readonly attributes?: ContentAttributes<HTMLDivElement>;
}

export function Overlay({ children, onDismiss, attributes = {} }: OverlayProps): TemplateResult {
  const { onPointerDown: attributePointerDown, ...nativeAttributes } = attributes;
  const merged = mergeProps({
    class: { gluon: true, quark: true, 'gluon-overlay': true },
    data: { gluonOverlay: true },
    children,
  }, nativeAttributes);
  Object.assign(merged, {
    onPointerDown: (event: PointerEvent): void => {
      callEventListener(attributePointerDown, event);
      if (!event.defaultPrevented && event.target === event.currentTarget) onDismiss?.();
    },
  });
  return q.div(merged as QuarkProps<HTMLDivElement>);
}

interface DialogCommonProps {
  readonly children: TemplateValue;
  readonly modal?: boolean;
  readonly onDismiss?: () => void;
  readonly attributes?: Omit<ContentAttributes<HTMLDivElement>,
    | 'role'
    | '.role'
    | 'aria'
    | 'aria-label'
    | 'aria-labelledby'
    | 'aria-modal'
    | 'ariaLabel'
    | '.ariaLabel'
    | 'ariaLabelledBy'
    | '.ariaLabelledBy'
    | 'ariaModal'
    | '.ariaModal'
  > & {
    readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'labelledby' | 'modal'>;
  };
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
  readonly focusable?: boolean;
  readonly attributes?: Omit<ContentAttributes<HTMLDivElement>, 'id' | '.id' | 'popover' | '.popover'>;
}

export function Popover({ id, children, mode = 'auto', focusable = true, attributes = {} }: PopoverProps): TemplateResult {
  return q.div({ ...attributes, id, popover: mode, tabIndex: focusable ? attributes.tabIndex ?? -1 : undefined, children });
}

export type OverlayPlacement = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';

export type AnchoredOverlayTriggerAttributes = Pick<QuarkProps<HTMLElement>,
  | 'id' | 'aria' | 'data' | 'onClick' | 'onFocusIn' | 'onFocusOut'
  | 'onKeydown' | 'onPointerCancel' | 'onPointerDown' | 'onPointerEnter' | 'onPointerLeave'
> & { readonly ref: (element: HTMLElement | undefined) => void };

export type AnchoredOverlayHostAttributes = Omit<ContentAttributes<HTMLSpanElement>,
  'children' | 'id' | '.id' | 'ref' | 'onKeydown' | 'onPointerDown'>;

export type AnchoredOverlayContentAttributes = Omit<ContentAttributes<HTMLDivElement>,
  | 'children' | 'id' | '.id' | 'role' | '.role' | 'popover' | '.popover'
  | 'hidden' | '.hidden' | 'tabIndex' | '.tabIndex' | 'style' | 'ref'
  | 'onFocusIn' | 'onFocusOut' | 'onKeydown' | 'onPointerEnter' | 'onPointerLeave'
>;

interface AnchoredOverlayProps {
  readonly id: string;
  readonly trigger: (attributes: AnchoredOverlayTriggerAttributes) => TemplateValue;
  readonly content: TemplateValue;
  readonly placement?: OverlayPlacement;
  readonly delay?: number;
  readonly hostAttributes?: AnchoredOverlayHostAttributes;
  readonly contentAttributes?: AnchoredOverlayContentAttributes;
}

/**
 * A request-free, non-interactive description attached to a trigger. The
 * trigger is described, rather than labelled, and the popup is never a focus
 * destination. Pointer hover is intentionally paired with focus and touch.
 */
export type TooltipProps = AnchoredOverlayProps & { readonly label?: string };

/**
 * A richer, optionally interactive explanation attached to a trigger. Unlike
 * Tooltip, its content is a dialog-like focus destination and remains open
 * while either trigger or content owns focus/pointer interaction.
 */
export type HoverCardProps = AnchoredOverlayProps & {
  readonly label: string;
};

const placements = new Set<OverlayPlacement>(['block-start', 'block-end', 'inline-start', 'inline-end']);
const overlayStacks = new WeakMap<Document, AnchoredOverlayController[]>();
const overlayOwners = new WeakMap<Document, Map<string, AnchoredOverlayController>>();

function overlayStack(document: Document): AnchoredOverlayController[] {
  const existing = overlayStacks.get(document);
  if (existing) return existing;
  const stack: AnchoredOverlayController[] = [];
  overlayStacks.set(document, stack);
  return stack;
}

class AnchoredOverlayController {
  readonly #id: string;
  readonly #contentId: string;
  readonly #placement: OverlayPlacement;
  readonly #delay: number;
  readonly #interactive: boolean;
  #host?: HTMLElement;
  #trigger?: HTMLElement;
  #content?: HTMLElement;
  #open = false;
  #pointerInside = false;
  #timer?: ReturnType<typeof setTimeout>;
  #listeners?: AbortController;
  #resizeObserver?: ResizeObserver;
  #removalObserver?: MutationObserver;
  #positionFrame?: number;
  #suppressClick = false;
  #pointerPress = false;

  constructor(id: string, placement: OverlayPlacement, delay: number, interactive: boolean) {
    this.#id = id;
    this.#contentId = `${id}-content`;
    this.#placement = placement;
    this.#delay = delay;
    this.#interactive = interactive;
  }

  readonly hostRef = (element: HTMLSpanElement | undefined): void => {
    if (!element) { this.destroy(); return; }
    const owners = overlayOwners.get(element.ownerDocument) ?? new Map<string, AnchoredOverlayController>();
    if (!overlayOwners.has(element.ownerDocument)) overlayOwners.set(element.ownerDocument, owners);
    const existing = owners.get(this.#id);
    if (existing && existing !== this) throw new TypeError(`Duplicate anchored overlay id: ${this.#id}.`);
    owners.set(this.#id, this);
    this.#host = element;
  };

  readonly triggerRef = (element: HTMLElement | undefined): void => { this.#trigger = element; };
  readonly contentRef = (element: HTMLDivElement | undefined): void => { this.#content = element; };

  get triggerAttributes(): AnchoredOverlayTriggerAttributes {
    return {
      id: `${this.#id}-trigger`,
      aria: this.#interactive
        ? { controls: this.#contentId, expanded: 'false', haspopup: 'dialog' }
        : { describedby: this.#contentId },
      data: { gluonOverlayTrigger: this.#id },
      ref: this.triggerRef,
      onPointerEnter: (event) => { if (event.pointerType === 'mouse') { this.#pointerInside = true; this.open(); } },
      onPointerLeave: (event) => { if (event.pointerType === 'mouse') { this.#pointerInside = false; this.#scheduleClose(); } },
      onPointerDown: (event) => {
        if (event.pointerType === 'touch') { this.#suppressClick = true; this.toggle(true); }
        else this.#pointerPress = true;
      },
      onPointerCancel: () => { this.#pointerPress = false; this.#suppressClick = false; },
      onClick: () => {
        this.#pointerPress = false;
        if (this.#suppressClick) this.#suppressClick = false;
        else this.toggle(true);
      },
      onFocusIn: () => { if (!this.#pointerPress) this.open(true); },
      onFocusOut: () => { this.#pointerPress = false; this.#scheduleClose(); },
      onKeydown: (event) => {
        if (event.key === 'Escape') { event.preventDefault(); this.close(false); return; }
        if (this.#interactive && (event.key === 'ArrowDown' || event.key === 'Enter')) {
          event.preventDefault();
          this.open(true);
          queueMicrotask(() => this.#focusContent());
        }
      },
    };
  }

  get contentEvents(): Pick<QuarkProps<HTMLDivElement>, 'onFocusIn' | 'onFocusOut' | 'onKeydown' | 'onPointerEnter' | 'onPointerLeave'> {
    return {
      onPointerEnter: (event) => { if (event.pointerType === 'mouse') { this.#pointerInside = true; this.#clearTimer(); } },
      onPointerLeave: (event) => { if (event.pointerType === 'mouse') { this.#pointerInside = false; this.#scheduleClose(); } },
      onFocusIn: () => { this.#clearTimer(); },
      onFocusOut: () => { this.#scheduleClose(); },
      onKeydown: (event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.close(true); } },
    };
  }

  toggle(immediate: boolean): void { if (this.#open) this.close(false); else this.open(immediate); }

  open(immediate = false): void {
    this.#clearTimer();
    const view = this.#host?.ownerDocument.defaultView;
    const reduced = view?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
    const wait = immediate || reduced ? 0 : this.#delay;
    if (wait === 0) this.#show();
    else this.#timer = setTimeout(() => this.#show(), wait);
  }

  close(restoreFocus: boolean): void {
    this.#clearTimer();
    if (!this.#open) return;
    this.#open = false;
    if (this.#interactive) this.#trigger?.setAttribute('aria-expanded', 'false');
    if (this.#content?.matches(':popover-open')) this.#content.hidePopover();
    this.#content?.toggleAttribute('hidden', true);
    this.#content?.removeAttribute('data-open');
    this.#listeners?.abort();
    this.#listeners = undefined;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = undefined;
    const view = this.#host?.ownerDocument.defaultView;
    if (view && this.#positionFrame !== undefined) view.cancelAnimationFrame(this.#positionFrame);
    this.#positionFrame = undefined;
    const stack = this.#host ? overlayStack(this.#host.ownerDocument) : [];
    const stackIndex = stack.lastIndexOf(this);
    if (stackIndex >= 0) stack.splice(stackIndex, 1);
    this.#removalObserver?.disconnect();
    this.#removalObserver = undefined;
    if (restoreFocus && this.#trigger?.isConnected) this.#trigger.focus();
  }

  destroy(): void {
    this.close(false);
    this.#clearTimer();
    const ownerDocument = this.#host?.ownerDocument;
    if (ownerDocument && overlayOwners.get(ownerDocument)?.get(this.#id) === this) overlayOwners.get(ownerDocument)?.delete(this.#id);
    this.#host = undefined;
    this.#trigger = undefined;
    this.#content = undefined;
  }

  #show(): void {
    const trigger = this.#trigger;
    const content = this.#content;
    const view = this.#host?.ownerDocument.defaultView;
    if (!trigger?.isConnected || !content?.isConnected || !view || this.#open) return;
    this.#open = true;
    if (this.#interactive) trigger.setAttribute('aria-expanded', 'true');
    content.hidden = false;
    if (!this.#interactive) content.style.pointerEvents = 'none';
    content.showPopover?.();
    content.toggleAttribute('data-open', true);
    this.#position();
    overlayStack(trigger.ownerDocument).push(this);
    this.#listeners = new view.AbortController();
    const options = { signal: this.#listeners.signal, capture: true };
    trigger.ownerDocument.addEventListener('pointerdown', this.#outside, options);
    trigger.ownerDocument.addEventListener('keydown', this.#documentKeydown, options);
    view.addEventListener('resize', this.#position, { signal: this.#listeners.signal });
    view.addEventListener('scroll', this.#position, options);
    if ('ResizeObserver' in view) {
      this.#resizeObserver = new view.ResizeObserver(this.#schedulePosition);
      this.#resizeObserver.observe(trigger);
      this.#resizeObserver.observe(content);
    }
    if ('MutationObserver' in view) {
      this.#removalObserver = new view.MutationObserver(() => { if (!this.#host?.isConnected) this.destroy(); });
      this.#removalObserver.observe(trigger.ownerDocument, { childList: true, subtree: true });
    }
  }

  readonly #outside = (event: PointerEvent): void => {
    if (!this.#host || overlayStack(this.#host.ownerDocument).at(-1) !== this) return;
    const target = event.target;
    const NodeConstructor = this.#host.ownerDocument.defaultView?.Node;
    if (NodeConstructor && target instanceof NodeConstructor && (this.#trigger?.contains(target) || this.#content?.contains(target))) return;
    this.close(false);
  };

  readonly #documentKeydown = (event: KeyboardEvent): void => {
    if (this.#host && overlayStack(this.#host.ownerDocument).at(-1) === this && event.key === 'Escape') { event.preventDefault(); this.close(true); }
  };

  readonly #position = (): void => {
    const trigger = this.#trigger;
    const content = this.#content;
    const view = this.#host?.ownerDocument.defaultView;
    if (!this.#open || !trigger || !content || !view) return;
    const anchor = trigger.getBoundingClientRect();
    const popup = content.getBoundingClientRect();
    const rtl = view.getComputedStyle(trigger).direction === 'rtl';
    const gap = 8;
    const edge = 8;
    const opposite: Record<OverlayPlacement, OverlayPlacement> = {
      'block-start': 'block-end', 'block-end': 'block-start',
      'inline-start': 'inline-end', 'inline-end': 'inline-start',
    };
    const coordinates = (candidate: OverlayPlacement): { x: number; y: number } => {
      if (candidate === 'block-start') return { x: rtl ? anchor.right - popup.width : anchor.left, y: anchor.top - popup.height - gap };
      if (candidate === 'block-end') return { x: rtl ? anchor.right - popup.width : anchor.left, y: anchor.bottom + gap };
      const logicalStart = rtl ? anchor.right + gap : anchor.left - popup.width - gap;
      const logicalEnd = rtl ? anchor.left - popup.width - gap : anchor.right + gap;
      return { x: candidate === 'inline-start' ? logicalStart : logicalEnd, y: anchor.top };
    };
    const fitsMainAxis = (candidate: OverlayPlacement, { x, y }: { x: number; y: number }): boolean => candidate.startsWith('block')
      ? y >= edge && y + popup.height <= view.innerHeight - edge
      : x >= edge && x + popup.width <= view.innerWidth - edge;
    const preferred = coordinates(this.#placement);
    const fallbackPlacement = opposite[this.#placement];
    const resolved = fitsMainAxis(this.#placement, preferred)
      ? this.#placement
      : fitsMainAxis(fallbackPlacement, coordinates(fallbackPlacement)) ? fallbackPlacement : this.#placement;
    const value = coordinates(resolved);
    const x = Math.min(Math.max(edge, value.x), Math.max(edge, view.innerWidth - popup.width - edge));
    const y = Math.min(Math.max(edge, value.y), Math.max(edge, view.innerHeight - popup.height - edge));
    Object.assign(content.style, { position: 'fixed', inset: 'auto', margin: '0', left: `${Math.round(x)}px`, top: `${Math.round(y)}px` });
    content.dataset.placement = resolved;
  };

  readonly #schedulePosition = (): void => {
    const view = this.#host?.ownerDocument.defaultView;
    if (!view || this.#positionFrame !== undefined) return;
    this.#positionFrame = view.requestAnimationFrame(() => {
      this.#positionFrame = undefined;
      this.#position();
    });
  };

  #focusContent(): void {
    if (!this.#interactive || !this.#content) return;
    (getFocusableElements(this.#content)[0] ?? this.#content).focus();
  }

  #scheduleClose(): void {
    this.#clearTimer();
    this.#timer = setTimeout(() => {
      const active = this.#host?.ownerDocument.activeElement ?? null;
      if (!this.#pointerInside && !this.#trigger?.contains(active) && !this.#content?.contains(active)) this.close(false);
    }, 80);
  }

  #clearTimer(): void { if (this.#timer) clearTimeout(this.#timer); this.#timer = undefined; }
}

function rejectOwnedAttributes(attributes: object | undefined, owned: readonly string[], name: string): void {
  if (!attributes) return;
  const conflict = owned.find((key) => Object.prototype.hasOwnProperty.call(attributes, key));
  if (conflict) throw new TypeError(`${name}.${conflict} is owned by the anchored overlay contract.`);
}

function validateAnchoredOverlay(props: AnchoredOverlayProps): void {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(props.id)) throw new TypeError('Anchored overlays require an HTML-safe id beginning with a letter.');
  if (!placements.has(props.placement ?? 'block-end')) throw new TypeError(`Unsupported anchored overlay placement: ${String(props.placement)}.`);
  if (!Number.isFinite(props.delay ?? 300) || (props.delay ?? 300) < 0) throw new RangeError('Anchored overlay delay must be a non-negative finite number.');
  rejectOwnedAttributes(props.hostAttributes, ['children', 'id', '.id', 'ref', 'onKeydown', 'onPointerDown'], 'hostAttributes');
  rejectOwnedAttributes(props.contentAttributes, ['children', 'id', '.id', 'role', '.role', 'popover', '.popover', 'hidden', '.hidden', 'tabIndex', '.tabIndex', 'style', 'ref', 'onFocusIn', 'onFocusOut', 'onKeydown', 'onPointerEnter', 'onPointerLeave'], 'contentAttributes');
}

function anchoredOverlay(props: AnchoredOverlayProps & { role: 'tooltip' | 'dialog'; label?: string; interactive: boolean }): TemplateResult {
  validateAnchoredOverlay(props);
  const placement = props.placement ?? 'block-end';
  const controller = new AnchoredOverlayController(props.id, placement, props.delay ?? 300, props.interactive);
  return q.span(mergeProps({
    class: { 'gluon-anchored-overlay': true },
    data: { placement },
    ref: controller.hostRef,
    children: [
      props.trigger(controller.triggerAttributes),
      Popover({
        id: `${props.id}-content`, mode: 'manual', focusable: props.interactive,
        attributes: mergeProps(props.contentAttributes ?? {}, {
          role: props.role,
          aria: props.label ? { label: props.label } : undefined,
          hidden: true,
          ref: controller.contentRef,
          ...controller.contentEvents,
        }) as QuarkProps<HTMLDivElement>,
        children: props.content,
      }),
    ],
  }, props.hostAttributes ?? {}) as QuarkProps<HTMLSpanElement>);
}

export function Tooltip(props: TooltipProps): TemplateResult { return anchoredOverlay({ ...props, role: 'tooltip', interactive: false }); }
export function HoverCard(props: HoverCardProps): TemplateResult { return anchoredOverlay({ ...props, role: 'dialog', interactive: true }); }

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
  readonly attributes?: Omit<ContentAttributes<HTMLDivElement>,
    | 'id'
    | '.id'
    | 'role'
    | '.role'
    | 'aria'
    | 'aria-label'
    | 'aria-activedescendant'
    | 'ariaLabel'
    | '.ariaLabel'
    | 'ariaActiveDescendantElement'
    | '.ariaActiveDescendantElement'
  > & {
    readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'activedescendant'>;
  };
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
  readonly attributes?: ContentAttributes<HTMLLabelElement>;
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
  }, attributes) as QuarkProps<HTMLLabelElement>);
}

function callEventListener<EventType extends Event>(
  listener: { handleEvent(event: EventType): void } | ((event: EventType) => unknown) | null | undefined,
  event: EventType,
): void {
  if (typeof listener === 'function') listener.call(event.currentTarget, event);
  else listener?.handleEvent(event);
}
