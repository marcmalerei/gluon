import {
  getActiveApplicationContext,
  registerApplicationRoot,
  unregisterApplicationRoot,
  type ApplicationContext,
  type FunctionalComponent,
} from './application-context.js';
import {
  directive,
  html,
  nothing,
  repeat,
  render,
  suspendRender,
  unmount,
  type Key,
  type PartController,
  type TemplateValue,
} from './runtime.js';

export interface AsyncLoadContext {
  readonly signal: AbortSignal;
  readonly attempt: number;
}

export type AsyncSource<Value> =
  | PromiseLike<Value>
  | ((context: AsyncLoadContext) => PromiseLike<Value>);

export interface SuspenseProps<Value> {
  readonly source: AsyncSource<Value>;
  readonly sourceKey?: Key;
  readonly fallback: TemplateValue;
  readonly children: (value: Value) => TemplateValue;
  readonly error?: (error: unknown, retry: () => void) => TemplateValue;
  readonly delay?: number;
  readonly timeout?: number;
}

export type BuiltinServerContract =
  | {
      readonly kind: 'suspense';
      resolve(): Promise<TemplateValue>;
    }
  | {
      readonly kind: 'teleport';
      readonly content: TemplateValue;
      readonly target: Element | string;
    }
  | {
      readonly kind: 'keep-alive' | 'transition' | 'transition-group';
      readonly content: TemplateValue;
    };

const builtinServerContracts = new WeakMap<object, BuiltinServerContract>();

/** Returns the DOM-free server behavior for a built-in directive value. */
export function getBuiltinServerContract(value: unknown): BuiltinServerContract | undefined {
  return typeof value === 'object' && value !== null
    ? builtinServerContracts.get(value)
    : undefined;
}

export class AsyncTimeoutError extends Error {
  constructor(readonly timeout: number) {
    super(`Async boundary timed out after ${timeout} ms.`);
    this.name = 'AsyncTimeoutError';
  }
}

interface AsyncBoundaryState {
  generation: number;
  attempt: number;
  controller?: AbortController;
  delayTimer?: ReturnType<typeof setTimeout>;
  timeoutTimer?: ReturnType<typeof setTimeout>;
  props: SuspenseProps<unknown>;
  sourceKey?: Key;
}

const asyncBoundaries = new WeakMap<PartController, AsyncBoundaryState>();

const suspenseDirective = directive<readonly [SuspenseProps<unknown>]>(
  {
    mount(part, [props]) {
      const state: AsyncBoundaryState = {
        generation: 0,
        attempt: 0,
        props,
        sourceKey: props.sourceKey,
      };
      asyncBoundaries.set(part, state);
      startAsyncBoundary(part, state);
    },
    update(part, [props]) {
      const state = asyncBoundaries.get(part);
      if (!state) return;
      if (props.sourceKey !== undefined && Object.is(props.sourceKey, state.sourceKey)) {
        state.props = props;
        return;
      }
      cancelAsyncBoundary(state);
      state.props = props;
      state.sourceKey = props.sourceKey;
      startAsyncBoundary(part, state);
    },
    cleanup() {
      // update() decides whether a logical source continues; disconnect aborts.
    },
    disconnect(part) {
      const state = asyncBoundaries.get(part);
      if (state) cancelAsyncBoundary(state);
      asyncBoundaries.delete(part);
    },
  },
);

/** Renders one explicit fallback while an abortable asynchronous source settles. */
export function Suspense<Value>(props: SuspenseProps<Value>): TemplateValue {
  validateDelay(props.delay, 'delay');
  validateDelay(props.timeout, 'timeout');
  const value = suspenseDirective(props as SuspenseProps<unknown>);
  builtinServerContracts.set(value, {
    kind: 'suspense',
    resolve: () => resolveSuspenseForServer(props),
  });
  return value;
}

async function resolveSuspenseForServer<Value>(props: SuspenseProps<Value>): Promise<TemplateValue> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const source = typeof props.source === 'function'
      ? props.source({ signal: controller.signal, attempt: 1 })
      : props.source;
    const result = props.timeout === undefined
      ? await source
      : await Promise.race([
          source,
          new Promise<Value>((_resolve, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new AsyncTimeoutError(props.timeout!));
            }, props.timeout);
          }),
        ]);
    return props.children(result);
  } catch (error) {
    return props.error?.(error, () => undefined) ?? props.fallback;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function startAsyncBoundary(
  part: PartController,
  state: AsyncBoundaryState,
): void {
  const props = state.props;
  state.generation += 1;
  state.attempt += 1;
  const generation = state.generation;
  const controller = new AbortController();
  state.controller = controller;
  const retry = () => {
    if (asyncBoundaries.get(part) !== state) return;
    cancelAsyncBoundary(state);
    startAsyncBoundary(part, state);
  };

  const delay = props.delay ?? 0;
  if (delay === 0) part.setValue(props.fallback);
  else {
    state.delayTimer = setTimeout(() => {
      if (isCurrentAsyncState(state, generation)) part.setValue(state.props.fallback);
    }, delay);
  }

  if (props.timeout !== undefined) {
    state.timeoutTimer = setTimeout(() => {
      if (!isCurrentAsyncState(state, generation)) return;
      controller.abort();
      clearAsyncTimers(state);
      part.setValue(renderAsyncError(state.props, new AsyncTimeoutError(props.timeout!), retry));
    }, props.timeout);
  }

  let source: PromiseLike<unknown>;
  try {
    source = typeof props.source === 'function'
      ? props.source({ signal: controller.signal, attempt: state.attempt })
      : props.source;
  } catch (error) {
    clearAsyncTimers(state);
    state.controller = undefined;
    part.setValue(renderAsyncError(state.props, error, retry));
    return;
  }

  void Promise.resolve(source).then(
    (value) => {
      if (!isCurrentAsyncState(state, generation)) return;
      clearAsyncTimers(state);
      state.controller = undefined;
      part.setValue(state.props.children(value));
    },
    (error: unknown) => {
      if (!isCurrentAsyncState(state, generation) || controller.signal.aborted) return;
      clearAsyncTimers(state);
      state.controller = undefined;
      part.setValue(renderAsyncError(state.props, error, retry));
    },
  );
}

function renderAsyncError(
  props: SuspenseProps<unknown>,
  error: unknown,
  retry: () => void,
): TemplateValue {
  return props.error?.(error, retry) ?? nothing;
}

function cancelAsyncBoundary(state: AsyncBoundaryState): void {
  state.generation += 1;
  state.controller?.abort();
  state.controller = undefined;
  clearAsyncTimers(state);
}

function clearAsyncTimers(state: AsyncBoundaryState): void {
  if (state.delayTimer !== undefined) clearTimeout(state.delayTimer);
  if (state.timeoutTimer !== undefined) clearTimeout(state.timeoutTimer);
  state.delayTimer = undefined;
  state.timeoutTimer = undefined;
}

function isCurrentAsyncState(state: AsyncBoundaryState, generation: number): boolean {
  return state.generation === generation && !state.controller?.signal.aborted;
}

export interface AsyncComponentOptions<Props> {
  readonly loader: (context: AsyncLoadContext) => PromiseLike<
    FunctionalComponent<Props> | { readonly default: FunctionalComponent<Props> }
  >;
  readonly loading: (props: Readonly<Props>) => TemplateValue;
  readonly error?: (
    error: unknown,
    retry: () => void,
    props: Readonly<Props>,
  ) => TemplateValue;
  readonly delay?: number;
  readonly timeout?: number;
}

export type AsyncComponent<Props> = FunctionalComponent<Props> & {
  preload(): Promise<void>;
  reset(): void;
  readonly resolved: boolean;
};

/** Defines a lazy functional component that can be preloaded by routers or servers. */
export function defineAsyncComponent<Props>(
  options: AsyncComponentOptions<Props>,
): AsyncComponent<Props> {
  validateDelay(options.delay, 'delay');
  validateDelay(options.timeout, 'timeout');
  let resolved: FunctionalComponent<Props> | undefined;
  let preloadPromise: Promise<void> | undefined;
  let generation = 0;
  const sourceKey = Symbol('gluon.async-component');

  const load = async (context: AsyncLoadContext): Promise<FunctionalComponent<Props>> => {
    if (resolved) return resolved;
    const loadGeneration = generation;
    const loaded = await options.loader(context);
    const component = typeof loaded === 'function' ? loaded : loaded.default;
    if (typeof component !== 'function') {
      throw new TypeError('An async component loader must resolve to a functional component.');
    }
    if (loadGeneration !== generation) {
      throw new Error('The async component was reset before its loader completed.');
    }
    resolved = component;
    return component;
  };

  const component = ((props: Readonly<Props>) => {
    if (resolved) return resolved(props);
    return Suspense({
      source: load,
      sourceKey,
      fallback: options.loading(props),
      children: (loaded) => loaded(props),
      error: options.error
        ? (error, retry) => options.error!(error, retry, props)
        : undefined,
      delay: options.delay,
      timeout: options.timeout,
    });
  }) as AsyncComponent<Props>;

  Object.defineProperties(component, {
    preload: {
      value: () => {
        if (resolved) return Promise.resolve();
        if (!preloadPromise) {
          const controller = new AbortController();
          preloadPromise = load({ signal: controller.signal, attempt: 1 })
            .then(() => undefined)
            .finally(() => { preloadPromise = undefined; });
        }
        return preloadPromise;
      },
    },
    reset: {
      value: () => {
        generation += 1;
        resolved = undefined;
        preloadPromise = undefined;
      },
    },
    resolved: { get: () => resolved !== undefined },
  });
  return component;
}

export interface TeleportProps {
  readonly to: Element | string;
  readonly children: TemplateValue;
  readonly disabled?: boolean;
}

interface TeleportState {
  readonly host: HTMLElement;
  readonly context?: ApplicationContext;
}

const teleports = new WeakMap<PartController, TeleportState>();

const teleportDirective = directive<readonly [TeleportProps]>(
  {
    mount(part, [props]) {
      const state = createOwnedHost('gluon-teleport');
      teleports.set(part, state);
      updateTeleport(part, props, state);
    },
    update(part, [props]) {
      const state = teleports.get(part);
      if (state) updateTeleport(part, props, state);
    },
    cleanup() {
      // The host survives argument updates and is released by disconnect().
    },
    disconnect(part) {
      const state = teleports.get(part);
      if (!state) return;
      releaseOwnedHost(state);
      teleports.delete(part);
    },
  },
);

/** Renders content in another DOM target while retaining application ownership. */
export function Teleport(props: TeleportProps): TemplateValue {
  if (props.disabled) return props.children;
  const value = teleportDirective(props);
  builtinServerContracts.set(value, {
    kind: 'teleport',
    content: props.children,
    target: props.to,
  });
  return value;
}

function updateTeleport(part: PartController, props: TeleportProps, state: TeleportState): void {
  const target = resolveTeleportTarget(props.to, state.host.ownerDocument);
  if (state.host.parentNode !== target) target.append(state.host);
  renderOwnedValue(state.host, props.children);
  part.setValue(nothing);
}

function resolveTeleportTarget(target: Element | string, document: Document): Element {
  if (typeof target !== 'string') return target;
  const resolved = document.querySelector(target);
  if (!resolved) throw new Error(`Teleport target "${target}" was not found.`);
  return resolved;
}

export interface KeepAliveProps {
  readonly cacheKey: Key;
  readonly children: TemplateValue;
  readonly max?: number;
  readonly onActivated?: (key: Key, host: HTMLElement) => void;
  readonly onDeactivated?: (key: Key, host: HTMLElement) => void;
  readonly onEvicted?: (key: Key) => void;
}

interface KeepAliveEntry extends TeleportState {
  readonly key: Key;
  used: number;
}

interface KeepAliveState {
  readonly entries: Map<Key, KeepAliveEntry>;
  active?: KeepAliveEntry;
  sequence: number;
  props: KeepAliveProps;
}

const keepAliveStates = new WeakMap<PartController, KeepAliveState>();

const keepAliveDirective = directive<readonly [KeepAliveProps]>(
  {
    mount(part, [props]) {
      validateKeepAliveMax(props.max);
      const state: KeepAliveState = { entries: new Map(), sequence: 0, props };
      keepAliveStates.set(part, state);
      updateKeepAlive(part, props, state);
    },
    update(part, [props]) {
      validateKeepAliveMax(props.max);
      const state = keepAliveStates.get(part);
      if (state) updateKeepAlive(part, props, state);
    },
    cleanup() {
      // Entries remain cached between updates and are released on disconnect.
    },
    disconnect(part) {
      const state = keepAliveStates.get(part);
      if (!state) return;
      if (state.active) state.props.onDeactivated?.(state.active.key, state.active.host);
      for (const entry of state.entries.values()) {
        releaseOwnedHost(entry);
        state.props.onEvicted?.(entry.key);
      }
      state.entries.clear();
      keepAliveStates.delete(part);
    },
  },
);

/** Caches rendered view hosts by key and suspends inactive renderer resources. */
export function KeepAlive(props: KeepAliveProps): TemplateValue {
  const value = keepAliveDirective(props);
  builtinServerContracts.set(value, { kind: 'keep-alive', content: props.children });
  return value;
}

function updateKeepAlive(
  part: PartController,
  props: KeepAliveProps,
  state: KeepAliveState,
): void {
  state.props = props;
  let entry = state.entries.get(props.cacheKey);
  if (!entry) {
    entry = { ...createOwnedHost('gluon-keep-alive'), key: props.cacheKey, used: 0 };
    state.entries.set(props.cacheKey, entry);
  }

  if (state.active && state.active !== entry) {
    suspendRender(state.active.host);
    props.onDeactivated?.(state.active.key, state.active.host);
  }

  entry.used = ++state.sequence;
  renderOwnedValue(entry.host, props.children);
  part.setValue(entry.host);
  if (state.active !== entry) props.onActivated?.(entry.key, entry.host);
  state.active = entry;
  evictKeepAliveEntries(state, props.max ?? Number.POSITIVE_INFINITY);
}

function evictKeepAliveEntries(state: KeepAliveState, max: number): void {
  while (state.entries.size > max) {
    const candidate = [...state.entries.values()]
      .filter((entry) => entry !== state.active)
      .sort((left, right) => left.used - right.used)[0];
    if (!candidate) return;
    state.entries.delete(candidate.key);
    releaseOwnedHost(candidate);
    state.props.onEvicted?.(candidate.key);
  }
}

function validateKeepAliveMax(max: number | undefined): void {
  if (max !== undefined && (!Number.isInteger(max) || max < 1)) {
    throw new TypeError('KeepAlive max must be a positive integer.');
  }
}

export interface TransitionOptions {
  readonly duration?: number;
  readonly easing?: string;
  readonly enter?: readonly Keyframe[];
  readonly leave?: readonly Keyframe[];
  readonly reducedMotion?: boolean | 'system';
}

export interface TransitionProps extends TransitionOptions {
  readonly children: TemplateValue;
  readonly transitionKey?: Key;
}

interface TransitionState extends TeleportState {
  generation: number;
  animations: Animation[];
  activeKey?: Key;
}

const transitionStates = new WeakMap<PartController, TransitionState>();
const defaultEnter: readonly Keyframe[] = [
  { opacity: 0, transform: 'translateY(4px)' },
  { opacity: 1, transform: 'translateY(0)' },
];
const defaultLeave: readonly Keyframe[] = [
  { opacity: 1, transform: 'translateY(0)' },
  { opacity: 0, transform: 'translateY(4px)' },
];

const transitionDirective = directive<readonly [TransitionProps]>(
  {
    mount(part, [props]) {
      validateTransitionOptions(props);
      const state: TransitionState = {
        ...createOwnedHost('gluon-transition'),
        generation: 0,
        animations: [],
        activeKey: props.transitionKey,
      };
      transitionStates.set(part, state);
      renderOwnedValue(state.host, props.children);
      part.setValue(state.host);
      if (!prefersReducedMotion(state.host, props.reducedMotion)) {
        void animateElements(state, elementsIn(state.host), props.enter ?? defaultEnter, props);
      }
    },
    update(part, [props]) {
      validateTransitionOptions(props);
      const state = transitionStates.get(part);
      if (state) void updateTransition(part, props, state);
    },
    cleanup(part) {
      const state = transitionStates.get(part);
      if (state) cancelAnimations(state);
    },
    disconnect(part) {
      const state = transitionStates.get(part);
      if (!state) return;
      cancelAnimations(state);
      releaseOwnedHost(state);
      transitionStates.delete(part);
    },
  },
);

/** Animates replacement of element or component content with cancellation. */
export function Transition(props: TransitionProps): TemplateValue {
  const value = transitionDirective(props);
  builtinServerContracts.set(value, { kind: 'transition', content: props.children });
  return value;
}

async function updateTransition(
  part: PartController,
  props: TransitionProps,
  state: TransitionState,
): Promise<void> {
  const generation = ++state.generation;
  cancelAnimations(state, false);
  if (props.transitionKey !== undefined && Object.is(props.transitionKey, state.activeKey)) {
    renderOwnedValue(state.host, props.children);
    part.setValue(state.host);
    return;
  }
  state.activeKey = props.transitionKey;
  if (prefersReducedMotion(state.host, props.reducedMotion)) {
    renderOwnedValue(state.host, props.children);
    part.setValue(state.host);
    return;
  }

  await animateElements(state, elementsIn(state.host), props.leave ?? defaultLeave, props);
  if (state.generation !== generation) return;
  renderOwnedValue(state.host, props.children);
  part.setValue(state.host);
  await animateElements(state, elementsIn(state.host), props.enter ?? defaultEnter, props);
}

export interface TransitionGroupProps<Item> extends TransitionOptions {
  readonly items: Iterable<Item>;
  readonly key: (item: Item, index: number) => Key;
  readonly children: (item: Item, index: number) => TemplateValue;
}

interface TransitionGroupArgs {
  readonly items: readonly unknown[];
  readonly keys: readonly Key[];
  readonly children: (item: unknown, index: number) => TemplateValue;
  readonly options: TransitionOptions;
}

interface TransitionGroupState extends TransitionState {
  readonly tokens: Map<Key, string>;
  tokenSequence: number;
  clones: HTMLElement[];
}

const transitionGroupStates = new WeakMap<PartController, TransitionGroupState>();
const transitionGroupHosts = new WeakMap<HTMLElement, TransitionGroupState>();

const transitionGroupDirective = directive<readonly [TransitionGroupArgs]>(
  {
    mount(part, [args]) {
      validateTransitionOptions(args.options);
      const state: TransitionGroupState = {
        ...createOwnedHost('gluon-transition-group'),
        generation: 0,
        animations: [],
        tokens: new Map(),
        tokenSequence: 0,
        clones: [],
      };
      transitionGroupStates.set(part, state);
      transitionGroupHosts.set(state.host, state);
      renderTransitionGroup(state, args);
      part.setValue(state.host);
      if (!prefersReducedMotion(state.host, args.options.reducedMotion)) {
        void animateElements(state, groupElements(state.host), args.options.enter ?? defaultEnter, args.options);
      }
    },
    update(part, [args]) {
      validateTransitionOptions(args.options);
      const state = transitionGroupStates.get(part);
      if (state) updateTransitionGroup(part, args, state);
    },
    cleanup(part) {
      const state = transitionGroupStates.get(part);
      if (state) cancelTransitionGroup(state);
    },
    disconnect(part) {
      const state = transitionGroupStates.get(part);
      if (!state) return;
      cancelTransitionGroup(state);
      releaseOwnedHost(state);
      transitionGroupStates.delete(part);
    },
  },
);

/** Animates keyed insertion, removal, and movement while repeat() retains identity. */
export function TransitionGroup<Item>(props: TransitionGroupProps<Item>): TemplateValue {
  const items = [...props.items];
  const keys = items.map(props.key);
  validateGroupKeys(keys);
  const args = {
    items,
    keys,
    children: props.children as (item: unknown, index: number) => TemplateValue,
    options: props,
  };
  const value = transitionGroupDirective(args);
  builtinServerContracts.set(value, {
    kind: 'transition-group',
    get content() {
      return repeat(items, (_item, index) => keys[index]!, props.children);
    },
  });
  return value;
}

function updateTransitionGroup(
  part: PartController,
  args: TransitionGroupArgs,
  state: TransitionGroupState,
): void {
  const reduced = prefersReducedMotion(state.host, args.options.reducedMotion);
  const before = groupRects(state.host);
  const retained = new Set(args.keys);
  if (!reduced) createLeavingClones(state, retained, args.options);
  renderTransitionGroup(state, args);
  part.setValue(state.host);
  if (reduced) return;

  const after = groupRects(state.host);
  for (const [key, element] of groupEntries(state.host)) {
    const previous = before.get(key);
    const current = after.get(key);
    if (!current) continue;
    if (!previous) {
      state.animations.push(playAnimation(element, args.options.enter ?? defaultEnter, args.options));
      continue;
    }
    const x = previous.left - current.left;
    const y = previous.top - current.top;
    if (x || y) {
      state.animations.push(playAnimation(element, [
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0, 0)' },
      ], args.options));
    }
  }
}

function renderTransitionGroup(state: TransitionGroupState, args: TransitionGroupArgs): void {
  const entries = args.items.map((item, index) => ({ item, key: args.keys[index]!, index }));
  renderOwnedValue(state.host, repeat(
    entries,
    (entry) => entry.key,
    (entry) => {
      let token = state.tokens.get(entry.key);
      if (!token) {
        token = String(++state.tokenSequence);
        state.tokens.set(entry.key, token);
      }
      return html`<gluon-transition-item data-gluon-transition-key=${token} style="display: contents">${args.children(entry.item, entry.index)}</gluon-transition-item>`;
    },
  ));
  const current = new Set(args.keys);
  for (const key of state.tokens.keys()) if (!current.has(key)) state.tokens.delete(key);
}

function createLeavingClones(
  state: TransitionGroupState,
  retained: ReadonlySet<Key>,
  options: TransitionOptions,
): void {
  for (const [key, element] of groupEntries(state.host)) {
    if (retained.has(key)) continue;
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });
    state.host.ownerDocument.body.append(clone);
    state.clones.push(clone);
    const animation = playAnimation(clone, options.leave ?? defaultLeave, options);
    state.animations.push(animation);
    void animation.finished.catch(() => undefined).finally(() => {
      clone.remove();
      const index = state.clones.indexOf(clone);
      if (index >= 0) state.clones.splice(index, 1);
    });
  }
}

function groupEntries(host: HTMLElement): Array<[Key, HTMLElement]> {
  const entries: Array<[Key, HTMLElement]> = [];
  for (const [key, token] of transitionGroupStatesForHost(host)?.tokens ?? []) {
    const wrapper = host.querySelector<HTMLElement>(`[data-gluon-transition-key="${token}"]`);
    const element = wrapper?.firstElementChild;
    if (element instanceof HTMLElement) entries.push([key, element]);
  }
  return entries;
}

function transitionGroupStatesForHost(host: HTMLElement): TransitionGroupState | undefined {
  return transitionGroupHosts.get(host);
}

function groupElements(host: HTMLElement): HTMLElement[] {
  return groupEntries(host).map(([, element]) => element);
}

function groupRects(host: HTMLElement): Map<Key, DOMRect> {
  return new Map(groupEntries(host).map(([key, element]) => [key, element.getBoundingClientRect()]));
}

function createOwnedHost(tagName: string): TeleportState {
  const host = document.createElement(tagName);
  host.style.display = 'contents';
  const context = getActiveApplicationContext();
  if (context) registerApplicationRoot(host, context);
  return { host, context };
}

function releaseOwnedHost(state: TeleportState): void {
  try {
    unmount(state.host);
  } finally {
    if (state.context) unregisterApplicationRoot(state.host, state.context);
    state.host.remove();
    if ('clones' in state) transitionGroupHosts.delete(state.host);
  }
}

function renderOwnedValue(host: HTMLElement, value: TemplateValue): void {
  render(html`${value}`, host);
}

function elementsIn(host: HTMLElement): HTMLElement[] {
  return [...host.children].filter((node): node is HTMLElement => node instanceof HTMLElement);
}

async function animateElements(
  state: TransitionState,
  elements: readonly HTMLElement[],
  keyframes: readonly Keyframe[],
  options: TransitionOptions,
): Promise<void> {
  const animations = elements.map((element) => playAnimation(element, keyframes, options));
  state.animations.push(...animations);
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  state.animations = state.animations.filter((animation) => !animations.includes(animation));
}

function playAnimation(
  element: HTMLElement,
  keyframes: readonly Keyframe[],
  options: TransitionOptions,
): Animation {
  return element.animate([...keyframes], {
    duration: options.duration ?? 180,
    easing: options.easing ?? 'ease',
    fill: 'both',
  });
}

function cancelAnimations(state: TransitionState, increment = true): void {
  if (increment) state.generation += 1;
  for (const animation of state.animations) animation.cancel();
  state.animations.length = 0;
}

function cancelTransitionGroup(state: TransitionGroupState): void {
  cancelAnimations(state);
  for (const clone of state.clones) clone.remove();
  state.clones.length = 0;
}

function prefersReducedMotion(
  host: HTMLElement,
  preference: boolean | 'system' | undefined,
): boolean {
  if (typeof preference === 'boolean') return preference;
  return host.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function validateTransitionOptions(options: TransitionOptions): void {
  validateDelay(options.duration, 'duration');
}

function validateDelay(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new TypeError(`${name} must be a finite non-negative number.`);
  }
}

function validateGroupKeys(keys: readonly Key[]): void {
  const seen = new Set<Key>();
  for (const key of keys) {
    if ((typeof key !== 'string' && typeof key !== 'number' && typeof key !== 'symbol') || seen.has(key)) {
      throw new Error('TransitionGroup keys must be unique strings, numbers, or symbols.');
    }
    seen.add(key);
  }
}
