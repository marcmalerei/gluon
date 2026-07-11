import {
  disposeGluonApplicationForServer,
  getBuiltinServerContract,
  getTemplateValueServerContract,
  isTemplateResult,
  nothing,
  repeat,
  renderGluonApplicationForServer,
  renderGluonElementForServer,
  TemplateResult,
  type GluonApp,
  type GluonElementClass,
  type TemplateValue,
} from '@gluonjs/core';
import { effectScope, type EffectScope } from '@gluonjs/reactivity';
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
  type Router,
  type RouterSnapshot,
} from '@gluonjs/router/memory';
import {
  createStoreManager,
  type StoreManager,
  type StoreSnapshot,
} from '@gluonjs/store';

const serverElementBrand = Symbol('gluon.ssr-element');
const urlAttributes = new Set([
  'action', 'cite', 'data', 'formaction', 'href', 'manifest', 'ping',
  'poster', 'src', 'srcdoc', 'srcset', 'xlink:href',
]);

export class SsrRenderError extends Error {
  constructor(
    readonly code: 'GLUON_SSR_INVALID_VALUE' | 'GLUON_SSR_UNSUPPORTED_DIRECTIVE',
    message: string,
  ) {
    super(message);
    this.name = 'SsrRenderError';
  }
}

export interface ServerElementOptions {
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: TemplateValue;
}

interface ServerElementValue {
  readonly [serverElementBrand]: true;
  readonly tagName: `${string}-${string}`;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly shadow: TemplateResult;
  readonly children: TemplateValue;
}

/** Uses the same registered GluonElement class without running connection hooks. */
export function renderElement<Constructor extends GluonElementClass>(
  constructor: Constructor,
  options: ServerElementOptions = {},
): TemplateValue {
  const properties = options.properties ?? {};
  const rendered = renderGluonElementForServer(constructor, properties);
  return Object.freeze({
    [serverElementBrand]: true as const,
    tagName: rendered.tagName,
    properties,
    shadow: rendered.template,
    children: options.children ?? nothing,
  }) as unknown as TemplateValue;
}

/** Resolves all current async boundaries and returns deterministic HTML. */
export async function renderToString(value: TemplateValue): Promise<string> {
  let html = '';
  for await (const chunk of renderToChunks(value)) html += chunk;
  return html;
}

/** Emits ordered hydration-marked serialization chunks. */
export async function* renderToChunks(value: TemplateValue): AsyncGenerator<string> {
  yield* serializeValue(value, { marker: 0 });
}

export type ProgressiveRenderChunk =
  | { readonly kind: 'shell'; readonly html: string }
  | { readonly kind: 'boundary'; readonly id: number; readonly html: string };

export interface ProgressiveRenderOptions {
  readonly signal?: AbortSignal;
}

/** Emits fallbacks in the shell and resolved async boundaries as ordered patch records. */
export async function* renderProgressively(
  value: TemplateValue,
  options: ProgressiveRenderOptions = {},
): AsyncGenerator<ProgressiveRenderChunk> {
  throwIfAborted(options.signal);
  const progressive: ProgressiveCoordinator = {
    boundary: 0,
    tasks: [],
    signal: options.signal,
  };
  const context: SerializationContext = { marker: 0, progressive };
  let shell = '';
  for await (const chunk of serializeValue(value, context)) shell += chunk;
  yield Object.freeze({ kind: 'shell', html: shell });

  while (progressive.tasks.length > 0) {
    throwIfAborted(options.signal);
    const settled = await Promise.race(progressive.tasks.map((task) => task.promise));
    const index = progressive.tasks.findIndex((task) => task.id === settled.id);
    if (index >= 0) progressive.tasks.splice(index, 1);
    if ('error' in settled) throw settled.error;
    let html = '';
    for await (const chunk of serializeValue(settled.value as TemplateValue, context)) html += chunk;
    yield Object.freeze({ kind: 'boundary', id: settled.id, html });
  }
}

export interface PreparedHydration {
  readonly value: TemplateValue;
  readonly html: string;
}

/** Resolves server async contracts once and returns the matching marker HTML and value tree. */
export async function prepareForHydration(value: TemplateValue): Promise<PreparedHydration> {
  const prepared = await resolveHydrationValue(value);
  return Object.freeze({ value: prepared, html: await renderToString(prepared) });
}

export interface SsrRequestContext<Data = undefined> {
  readonly url: string;
  readonly router: Router;
  readonly store: StoreManager;
  readonly scope: EffectScope;
  readonly data: Data;
}

export interface SsrRequestOptions<Data = undefined> {
  readonly url: string;
  readonly routes?: readonly RouteRecordRaw[] | ((store: StoreManager) => readonly RouteRecordRaw[]);
  readonly load?: (context: Omit<SsrRequestContext<Data>, 'data'>) => Promise<Data> | Data;
  readonly createApp: (context: SsrRequestContext<Data>) => GluonApp;
  readonly state?: Readonly<Record<string, unknown>>;
}

export interface SsrRequestResult {
  readonly html: string;
  readonly state: string;
  readonly stateScript: string;
  readonly router: RouterSnapshot;
  readonly store: StoreSnapshot;
}

/** Creates and disposes one application, Router, Store, and effect scope per call. */
export async function renderRequest<Data = undefined>(
  options: SsrRequestOptions<Data>,
): Promise<SsrRequestResult> {
  const scope = effectScope({ detached: true });
  const store = createStoreManager();
  let router: Router | undefined;
  let app: GluonApp | undefined;
  try {
    const routes = typeof options.routes === 'function'
      ? options.routes(store)
      : options.routes ?? [];
    router = createRouter({
      history: createMemoryHistory([options.url]),
      routes,
    });
    await router.isReady();
    const baseContext = { url: options.url, router, store, scope };
    const data = options.load
      ? await options.load(baseContext as Omit<SsrRequestContext<Data>, 'data'>)
      : undefined as Data;
    const context: SsrRequestContext<Data> = { ...baseContext, data };
    app = scope.run(() => options.createApp(context));
    if (!app) throw new Error('The request effect scope stopped before application creation.');
    const template = scope.run(() => renderGluonApplicationForServer(app!));
    if (!template) throw new Error('The request effect scope stopped before application rendering.');
    const html = await renderToString(template);
    const routerSnapshot = router.dehydrate();
    const storeSnapshot = store.dehydrate();
    const state = serializeSsrState({
      ...options.state,
      router: routerSnapshot,
      store: storeSnapshot,
      data,
    });
    return Object.freeze({
      html,
      state,
      stateScript: `<script type="application/json" data-gluon-state>${state}</script>`,
      router: routerSnapshot,
      store: storeSnapshot,
    });
  } finally {
    if (app) await disposeGluonApplicationForServer(app);
    router?.destroy();
    store.dispose();
    scope.stop();
  }
}

/** Serializes JSON-compatible request data safely inside an HTML script element. */
export function serializeSsrState(value: unknown): string {
  assertSerializableState(value, new WeakSet());
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError('SSR state must have a JSON representation.');
  return serialized
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

interface SerializationContext {
  marker: number;
  readonly progressive?: ProgressiveCoordinator;
}

interface ProgressiveCoordinator {
  boundary: number;
  readonly tasks: ProgressiveTask[];
  readonly signal?: AbortSignal;
}

interface ProgressiveTask {
  readonly id: number;
  readonly promise: Promise<{
    readonly id: number;
    readonly value?: TemplateValue;
    readonly error?: unknown;
  }>;
}

async function* serializeValue(value: unknown, context: SerializationContext): AsyncGenerator<string> {
  if (value == null || value === false || value === nothing) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' || value === true) {
    yield escapeText(String(value));
    return;
  }
  if (value instanceof URL) {
    yield escapeText(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      const marker = context.marker++;
      yield `<!--gluon:i:${marker}-->`;
      yield* serializeValue(child, context);
      yield `<!--gluon:/i:${marker}-->`;
    }
    return;
  }
  if (isTemplateResult(value)) {
    yield* serializeTemplate(value, context);
    return;
  }
  if (isServerElementValue(value)) {
    yield `<${value.tagName}${serializeSpread(value.properties)}>`;
    yield '<template shadowrootmode="open">';
    yield* serializeTemplate(value.shadow, context);
    yield '</template>';
    yield* serializeValue(value.children, context);
    yield `</${value.tagName}>`;
    return;
  }
  const builtin = getBuiltinServerContract(value);
  if (builtin) {
    if (builtin.kind === 'suspense' && context.progressive) {
      const id = context.progressive.boundary++;
      const promise = builtin.resolve(context.progressive.signal).then(
        (resolved) => ({ id, value: resolved as TemplateValue }),
        (error: unknown) => ({ id, error }),
      );
      context.progressive.tasks.push({ id, promise });
      yield `<!--gluon:async:${id}-->`;
      yield* serializeValue(builtin.fallback, context);
      yield `<!--gluon:/async:${id}-->`;
    } else if (builtin.kind === 'suspense') {
      yield* serializeValue(await builtin.resolve(), context);
    } else yield* serializeValue(builtin.content, context);
    return;
  }
  const contract = getTemplateValueServerContract(value);
  if (contract?.kind === 'repeat') {
    for (const item of contract.items) {
      const marker = context.marker++;
      yield `<!--gluon:k:${marker}-->`;
      yield* serializeValue(item.value, context);
      yield `<!--gluon:/k:${marker}-->`;
    }
    return;
  }
  if (contract?.kind === 'unsafe-html') {
    yield contract.markup;
    return;
  }
  if (contract?.kind === 'unsafe-url') {
    yield escapeText(contract.value);
    return;
  }
  if (contract?.kind === 'event') return;
  if (contract?.kind === 'directive') {
    throw new SsrRenderError(
      'GLUON_SSR_UNSUPPORTED_DIRECTIVE',
      'A browser-only directive has no server contract.',
    );
  }
  throw new SsrRenderError(
    'GLUON_SSR_INVALID_VALUE',
    `Cannot server-render ${Object.prototype.toString.call(value)}.`,
  );
}

async function* serializeTemplate(
  result: TemplateResult,
  context: SerializationContext,
): AsyncGenerator<string> {
  const state = { inTag: false, quote: '' };
  let skipQuote = '';
  for (let index = 0; index < result.strings.length; index += 1) {
    const originalChunk = result.strings[index] ?? '';
    updateMarkupState(state, originalChunk);
    const chunk = skipQuote && originalChunk.startsWith(skipQuote)
      ? originalChunk.slice(1)
      : originalChunk;
    skipQuote = '';
    if (index >= result.values.length) {
      yield chunk;
      continue;
    }
    if (!state.inTag) {
      const marker = context.marker++;
      yield chunk;
      yield `<!--gluon:h:${marker}-->`;
      yield* serializeValue(result.values[index], context);
      yield `<!--gluon:/h:${marker}-->`;
      continue;
    }
    const match = originalChunk.match(/(?:^|[\s<])([^\s"'<>/=]+)=\s*(["']?)$/);
    if (!match?.[1]) {
      throw new SsrRenderError(
        'GLUON_SSR_INVALID_VALUE',
        `Unsupported server expression ${index} inside a tag.`,
      );
    }
    const name = match[1];
    const nameOffset = chunk.lastIndexOf(name);
    const prefix = chunk.slice(0, nameOffset);
    const marker = context.marker++;
    yield /\s$/.test(prefix) ? prefix.slice(0, -1) : prefix;
    yield serializeBinding(name, result.values[index]);
    yield ` data-gluon-h-${marker}=""`;
    skipQuote = match[2] ?? '';
  }
}

async function resolveHydrationValue(value: TemplateValue): Promise<TemplateValue> {
  if (Array.isArray(value)) {
    return Promise.all(value.map((child) => resolveHydrationValue(child)));
  }
  if (isTemplateResult(value)) {
    const values = await Promise.all(value.values.map((child) => resolveHydrationValue(child)));
    return new TemplateResult(value.strings, values, value.type);
  }
  const builtin = getBuiltinServerContract(value);
  if (builtin) {
    return resolveHydrationValue(
      builtin.kind === 'suspense' ? await builtin.resolve() : builtin.content,
    );
  }
  const contract = getTemplateValueServerContract(value);
  if (contract?.kind === 'repeat') {
    const items = await Promise.all(contract.items.map(async (item) => ({
      key: item.key,
      value: await resolveHydrationValue(item.value),
    })));
    return repeat(items, (item) => item.key, (item) => item.value as TemplateValue);
  }
  return value;
}

function serializeBinding(name: string, value: unknown): string {
  if (name === '...') return serializeSpread(value);
  if (name.startsWith('@')) return '';
  if (name.startsWith('?')) return value ? ` ${safeAttributeName(name.slice(1))}` : '';
  const attribute = name.startsWith('.') ? name.slice(1) : name;
  if (value == null || value === false || value === nothing || typeof value === 'function') return '';
  const contract = getTemplateValueServerContract(value);
  if (contract?.kind === 'event' || contract?.kind === 'directive') return '';
  if (contract?.kind === 'unsafe-html') {
    if (attribute.toLowerCase() !== 'srcdoc') {
      throw new TypeError('unsafeHTML() can only be used in child content or srcdoc.');
    }
    return ` ${safeAttributeName(attribute)}="${escapeAttribute(contract.markup)}"`;
  }
  if (name.startsWith('.') && typeof value === 'object' && contract?.kind !== 'unsafe-url') return '';
  const serialized = contract?.kind === 'unsafe-url' ? contract.value : String(value);
  assertSafeUrl(attribute, serialized, contract?.kind === 'unsafe-url');
  return ` ${safeAttributeName(attribute)}="${escapeAttribute(serialized)}"`;
}

function serializeSpread(value: unknown): string {
  if (!isRecord(value)) return '';
  let result = '';
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'ref' || key.startsWith('@') || /^on/i.test(key)) continue;
    if (key === 'data' || key === 'dataset' || key === 'aria') {
      if (isRecord(entry)) {
        const prefix = key === 'aria' ? 'aria-' : 'data-';
        for (const [name, nested] of Object.entries(entry)) {
          result += serializeBinding(`${prefix}${toKebabCase(name)}`, nested);
        }
      }
      continue;
    }
    if (key === 'class' || key === 'className') {
      result += serializeBinding('class', normalizeClass(entry));
      continue;
    }
    if (key === 'style') {
      result += serializeBinding('style', normalizeStyle(entry));
      continue;
    }
    result += serializeBinding(key, entry);
  }
  return result;
}

function normalizeClass(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(normalizeClass).filter(Boolean).join(' ');
  if (isRecord(value)) return Object.entries(value).filter(([, enabled]) => enabled).map(([name]) => name).join(' ');
  return value ? String(value) : '';
}

function normalizeStyle(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return '';
  return Object.entries(value)
    .filter(([, entry]) => entry != null && entry !== false)
    .map(([name, entry]) => `${toKebabCase(name)}:${String(entry)}`)
    .join(';');
}

function assertSafeUrl(name: string, value: string, explicitlyUnsafe: boolean): void {
  if (explicitlyUnsafe || !urlAttributes.has(name.toLowerCase())) return;
  const candidates = name.toLowerCase() === 'srcset'
    ? value.split(',')
    : name.toLowerCase() === 'ping'
      ? value.split(/\s+/)
      : [value];
  for (const candidate of candidates) {
    const normalized = candidate.trimStart().replace(/[\u0000-\u0020\u007f-\u009f]+/g, '').toLowerCase();
    if (/^(?:javascript|vbscript|data):/.test(normalized)) {
      throw new TypeError(`Blocked unsafe URL protocol in ${name}.`);
    }
  }
}

function assertSerializableState(value: unknown, seen: WeakSet<object>): void {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('SSR state cannot contain non-finite numbers.');
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`SSR state cannot contain ${typeof value} values.`);
  if (seen.has(value)) throw new TypeError('SSR state cannot contain circular references.');
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      for (const entry of value) assertSerializableState(entry, seen);
      return;
    }
    if (!isRecord(value)) throw new TypeError('SSR state can contain only plain objects and arrays.');
    for (const [key, entry] of Object.entries(value)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        throw new TypeError(`Unsafe SSR state key "${key}".`);
      }
      assertSerializableState(entry, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function isServerElementValue(value: unknown): value is ServerElementValue {
  return Boolean(value && typeof value === 'object' && serverElementBrand in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeAttributeName(name: string): string {
  if (!/^[A-Za-z_:][A-Za-z0-9_.:-]*$/.test(name) || /^on/i.test(name)) {
    throw new TypeError(`Unsafe SSR attribute name "${name}".`);
  }
  return name;
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function updateMarkupState(state: { inTag: boolean; quote: string }, chunk: string): void {
  for (const character of chunk) {
    if (!state.inTag) {
      if (character === '<') state.inTag = true;
      continue;
    }
    if (state.quote) {
      if (character === state.quote) state.quote = '';
      continue;
    }
    if (character === '"' || character === "'") state.quote = character;
    else if (character === '>') state.inTag = false;
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
}
