import {
  defineMolecule,
  nothing,
  repeat,
  type TemplateResult,
  type TemplateValue,
} from '@gluonjs/core';
import { shallowRef, type Ref } from '@gluonjs/reactivity';
import { q, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { toastStyleDependency } from './toast-styles.js';

const MAX_VISIBLE = 100;
const MAX_QUEUE = 1_000;
const MAX_DURATION = 86_400_000;
const MINIMUM_AT_DURATION = 5_000;
const safeDomId = /^[A-Za-z][A-Za-z0-9_-]*$/;

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';
export type ToastAnnouncement = 'polite' | 'assertive';
export type ToastPauseOwner = string;
export type ToastAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | 'aria' | 'id'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'live' | 'atomic'>;
};
export type ToastViewportAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label'>;
};

export interface ToastContent {
  readonly children: TemplateValue;
  readonly title?: TemplateValue;
  readonly tone?: ToastTone;
  readonly announcement?: ToastAnnouncement;
}

export interface ToastProps extends ToastContent {
  readonly id: string;
  readonly dismissAction?: TemplateValue;
  readonly attributes?: ToastAttributes;
}

/** Public type namespace companion for the request-free Toast renderer. */
export interface Toast extends ToastProps {}

export const Toast = defineMolecule(({
  id,
  children,
  title,
  tone = 'neutral',
  announcement = 'polite',
  dismissAction,
  attributes = {},
}: ToastProps): TemplateResult => {
  validateId(id);
  const { aria, ...native } = attributes;
  return q.div({
    ...native,
    id,
    aria,
    class: [
      { gluon: true, molecule: true, 'gluon-toast': true, [`is-${tone}`]: true },
      attributes.class,
    ],
    data: { ...attributes.data, tone, announcement },
    children: [
      q.div({
        class: 'gluon-toast-announcement',
        role: announcement === 'assertive' ? 'alert' : 'status',
        aria: { atomic: true },
        children: [
          title === undefined
            ? nothing
            : q.strong({ class: 'gluon-toast-title', children: title }),
          q.div({ class: 'gluon-toast-message', children }),
        ],
      }),
      dismissAction === undefined
        ? nothing
        : q.div({ class: 'gluon-toast-actions', children: dismissAction }),
    ],
  });
}, 'Toast', [toastStyleDependency]);

export interface ToastRequest extends ToastContent {
  readonly id?: string;
  readonly timeout?: number;
}

export interface ToastRecord extends ToastContent {
  readonly id: string;
  readonly timeout: number;
}

export interface ToastController {
  readonly active: boolean;
  readonly disposed: boolean;
  /** Visible records only. Reading this property never changes controller state. */
  readonly items: readonly ToastRecord[];
  activate(): void;
  deactivate(): void;
  add(request: ToastRequest): string;
  dismiss(id: string): void;
  clear(): void;
  pause(id: string, owner?: ToastPauseOwner): void;
  resume(id: string, owner?: ToastPauseOwner): void;
  dispose(): void;
}

export interface ToastControllerOptions {
  readonly maxVisible?: number;
  /** Maximum number waiting behind the visible records. */
  readonly maxQueue?: number;
  readonly timeout?: number;
  readonly minimumDuration?: number;
}

interface ToastTiming {
  readonly owners: Set<ToastPauseOwner>;
  handle: ReturnType<typeof setTimeout> | undefined;
  deadline: number;
  remaining: number;
}

const viewportRefCache = new WeakMap<ToastController, {
  readonly external: QuarkRef<HTMLDivElement> | undefined;
  readonly ref: QuarkRef<HTMLDivElement>;
}>();

export function createToastController(options: ToastControllerOptions = {}): ToastController {
  validateRecord(options, 'Toast controller options');
  const maxVisible = validateInteger('maxVisible', options.maxVisible ?? 3, 1, MAX_VISIBLE);
  const maxQueue = validateInteger('maxQueue', options.maxQueue ?? 20, 0, MAX_QUEUE);
  const timeout = validateDuration('timeout', options.timeout ?? 5_000, 1);
  const minimumDuration = validateDuration(
    'minimumDuration',
    options.minimumDuration ?? MINIMUM_AT_DURATION,
    MINIMUM_AT_DURATION,
  );
  const visible: Ref<readonly ToastRecord[]> = shallowRef([]);
  const timings = new Map<string, ToastTiming>();
  let records: ToastRecord[] = [];
  let active = false;
  let disposed = false;
  let sequence = 0;

  const clearTiming = (id: string): void => {
    const timing = timings.get(id);
    if (!timing) return;
    if (timing.handle !== undefined) clearTimeout(timing.handle);
    timing.handle = undefined;
    timing.owners.clear();
    timings.delete(id);
  };

  const schedule = (id: string, timing: ToastTiming): void => {
    timing.deadline = Date.now() + timing.remaining;
    timing.handle = setTimeout(() => {
      if (disposed || !active || timings.get(id) !== timing) return;
      timing.handle = undefined;
      controller.dismiss(id);
    }, timing.remaining);
  };

  const startTiming = (record: ToastRecord): void => {
    if (timings.has(record.id)) return;
    const timing: ToastTiming = {
      owners: new Set(),
      handle: undefined,
      deadline: 0,
      remaining: Math.max(record.timeout, minimumDuration),
    };
    timings.set(record.id, timing);
    schedule(record.id, timing);
  };

  const syncVisible = (): void => {
    if (!active || disposed) {
      if (visible.value.length > 0) visible.value = [];
      return;
    }
    const next = records.slice(0, maxVisible);
    const nextIds = new Set(next.map(({ id }) => id));
    for (const id of timings.keys()) {
      if (!nextIds.has(id)) clearTiming(id);
    }
    if (!sameRecords(visible.value, next)) visible.value = next;
    for (const record of next) startTiming(record);
  };

  const controller: ToastController = {
    get active() { return active; },
    get disposed() { return disposed; },
    get items() { return visible.value; },
    activate() {
      if (disposed || active) return;
      active = true;
      // Requests made before a browser viewport exists are intentionally stale.
      records = [];
      syncVisible();
    },
    deactivate() {
      if (disposed || !active) return;
      active = false;
      for (const id of [...timings.keys()]) clearTiming(id);
      records = [];
      if (visible.value.length > 0) visible.value = [];
    },
    add(request) {
      validateToastRequest(request);
      if (disposed) throw new Error('Toast controller has been disposed.');
      const id = request.id ?? nextGeneratedId(() => ++sequence, records);
      validateId(id);
      const record: ToastRecord = Object.freeze({
        id,
        children: request.children,
        ...(request.title === undefined ? {} : { title: request.title }),
        ...(request.tone === undefined ? {} : { tone: request.tone }),
        ...(request.announcement === undefined ? {} : { announcement: request.announcement }),
        timeout: request.timeout ?? timeout,
      });
      if (!active) return id;

      const existing = records.findIndex((item) => item.id === id);
      if (existing >= 0) {
        clearTiming(id);
        records.splice(existing, 1);
        records.unshift(record);
      } else {
        records.push(record);
      }
      const capacity = maxVisible + maxQueue;
      while (records.length > capacity) {
        const [removed] = records.splice(maxVisible, 1);
        if (removed) clearTiming(removed.id);
      }
      syncVisible();
      return id;
    },
    dismiss(id) {
      if (disposed) return;
      const index = records.findIndex((record) => record.id === id);
      if (index < 0) return;
      records.splice(index, 1);
      clearTiming(id);
      syncVisible();
    },
    clear() {
      if (disposed && records.length === 0 && timings.size === 0) return;
      for (const id of [...timings.keys()]) clearTiming(id);
      records = [];
      if (visible.value.length > 0) visible.value = [];
    },
    pause(id, owner = 'programmatic') {
      if (disposed) return;
      const timing = timings.get(id);
      if (!timing || timing.owners.has(owner)) return;
      timing.owners.add(owner);
      if (timing.owners.size !== 1 || timing.handle === undefined) return;
      timing.remaining = Math.max(0, timing.deadline - Date.now());
      clearTimeout(timing.handle);
      timing.handle = undefined;
    },
    resume(id, owner = 'programmatic') {
      if (disposed) return;
      const timing = timings.get(id);
      if (!timing || !timing.owners.delete(owner) || timing.owners.size > 0) return;
      if (timing.remaining <= 0) {
        controller.dismiss(id);
        return;
      }
      schedule(id, timing);
    },
    dispose() {
      if (disposed) return;
      for (const id of [...timings.keys()]) clearTiming(id);
      records = [];
      if (visible.value.length > 0) visible.value = [];
      active = false;
      disposed = true;
    },
  };
  return Object.freeze(controller);
}

export type ToastDismissLabel = string | ((record: ToastRecord) => string);

export interface ToastViewportProps {
  readonly controller: ToastController;
  readonly label?: string;
  readonly dismissLabel?: ToastDismissLabel;
  readonly attributes?: ToastViewportAttributes;
}

/** Public type namespace companion for the ToastViewport renderer. */
export interface ToastViewport extends ToastViewportProps {}

export const ToastViewport = defineMolecule(({
  controller,
  label = 'Notifications',
  dismissLabel = 'Dismiss notification',
  attributes = {},
}: ToastViewportProps): TemplateResult => {
  validateAccessibleLabel('Toast viewport label', label);
  const { aria, ref: attributeRef, ...native } = attributes;
  const viewportRef = getViewportRef(controller, attributeRef);
  return q.div({
    ...native,
    class: [{ 'gluon-toast-viewport': true }, attributes.class],
    role: 'region',
    aria: { ...aria, label },
    ref: viewportRef,
    children: repeat(controller.items, ({ id }) => id, (item) => Toast({
      ...item,
      attributes: {
        onPointerEnter: () => controller.pause(item.id, 'pointer'),
        onPointerLeave: () => controller.resume(item.id, 'pointer'),
        onFocusIn: () => controller.pause(item.id, 'focus'),
        onFocusOut: (event) => {
          const next = event.relatedTarget;
          const current = event.currentTarget as HTMLDivElement;
          const NodeConstructor = current.ownerDocument.defaultView?.Node;
          if (NodeConstructor && next instanceof NodeConstructor && current.contains(next)) return;
          controller.resume(item.id, 'focus');
        },
      },
      dismissAction: q.button({
        type: 'button',
        class: 'gluon-toast-dismiss',
        aria: { label: resolveDismissLabel(dismissLabel, item) },
        onClick: () => controller.dismiss(item.id),
        children: '×',
      }),
    })),
  });
}, 'ToastViewport', [toastStyleDependency]);

function validateToastRequest(request: ToastRequest): void {
  validateRecord(request, 'Toast request');
  if (!('children' in request)) throw new TypeError('Toast request must define children.');
  if (request.id !== undefined) validateId(request.id);
  if (request.timeout !== undefined) validateDuration('item timeout', request.timeout, 1);
  if (request.tone !== undefined && !['neutral', 'success', 'warning', 'danger'].includes(request.tone)) {
    throw new TypeError('Toast tone must be neutral, success, warning, or danger.');
  }
  if (request.announcement !== undefined && request.announcement !== 'polite' && request.announcement !== 'assertive') {
    throw new TypeError('Toast announcement must be polite or assertive.');
  }
}

function validateRecord(value: unknown, name: string): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be a record.`);
  }
}

function validateInteger(name: string, value: number, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`Toast ${name} must be a safe integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function validateDuration(name: string, value: number, minimum: number): number {
  return validateInteger(name, value, minimum, MAX_DURATION);
}

function validateId(id: string): void {
  if (typeof id !== 'string' || !safeDomId.test(id)) {
    throw new TypeError('Toast id must be a non-empty safe DOM ID matching [A-Za-z][A-Za-z0-9_-]*.');
  }
}

function validateAccessibleLabel(name: string, value: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
}

function resolveDismissLabel(label: ToastDismissLabel, record: ToastRecord): string {
  const resolved = typeof label === 'function' ? label(record) : label;
  validateAccessibleLabel('Toast dismiss label', resolved);
  return resolved;
}

function nextGeneratedId(next: () => number, records: readonly ToastRecord[]): string {
  let id: string;
  do id = `gluon-toast-${next()}`;
  while (records.some((record) => record.id === id));
  return id;
}

function sameRecords(left: readonly ToastRecord[], right: readonly ToastRecord[]): boolean {
  return left.length === right.length && left.every((record, index) => record === right[index]);
}

function getViewportRef(
  controller: ToastController,
  external: QuarkRef<HTMLDivElement> | undefined,
): QuarkRef<HTMLDivElement> {
  const cached = viewportRefCache.get(controller);
  if (cached && cached.external === external) return cached.ref;
  let revision = 0;
  const ref: QuarkRef<HTMLDivElement> = (element) => {
    assignRef(external, element);
    const currentRevision = ++revision;
    if (!element) {
      controller.deactivate();
      return;
    }
    queueMicrotask(() => {
      if (currentRevision === revision) controller.activate();
    });
  };
  viewportRefCache.set(controller, { external, ref });
  return ref;
}

function assignRef<ElementType extends Element>(
  target: QuarkRef<ElementType> | undefined,
  element: ElementType | undefined,
): void {
  if (typeof target === 'function') target(element);
  else if (target) target.value = element;
}
