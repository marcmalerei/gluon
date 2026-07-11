import {
  createApp,
  html,
  type FunctionalComponent,
  type GluonApp,
  type GluonAppPlugin,
  type InjectionKey,
  type TemplateResult,
} from '@gluonjs/core';
import { nextTick, reactive } from '@gluonjs/reactivity';
import {
  createMemoryHistory,
  createRouter,
  createRouterPlugin,
  type RouteNamedMap,
  type RouteRecordRaw,
  type Router,
} from '@gluonjs/router';
import {
  createTestingStoreManager,
  type StoreManager,
  type TestingStoreManagerOptions,
} from '@gluonjs/store';

export interface TestProvider<Value = unknown> {
  readonly key: InjectionKey<Value>;
  readonly value: Value;
}

export function testProvider<Value>(
  key: InjectionKey<Value>,
  value: Value,
): TestProvider<Value> {
  return { key, value };
}

export interface TestPluginUse {
  readonly plugin: GluonAppPlugin<unknown>;
  readonly options?: unknown;
}

export function testPlugin<Options>(
  plugin: GluonAppPlugin<Options>,
  options: Options,
): TestPluginUse {
  return { plugin: plugin as unknown as GluonAppPlugin<unknown>, options };
}

export interface BaseMountOptions {
  readonly attachTo?: Element;
  readonly container?: Element;
  readonly name?: string;
  readonly plugins?: readonly (GluonAppPlugin<void> | TestPluginUse)[];
  readonly providers?: readonly TestProvider[];
  readonly setup?: (app: GluonApp) => void;
}

export interface ComponentMountOptions<Props extends object> extends BaseMountOptions {
  readonly props: Props;
}

export interface ElementMountOptions<ElementType extends HTMLElement> extends BaseMountOptions {
  readonly attributes?: Readonly<Record<string, string | boolean | null | undefined>>;
  readonly events?: Readonly<Record<string, (event: Event) => void>>;
  readonly properties?: Partial<ElementType>;
  readonly slots?: Readonly<Record<string, Node | string | readonly (Node | string)[]>>;
}

export interface FixtureEventRecord {
  readonly name: string;
  readonly event: Event;
}

export interface TestFixture {
  readonly id: number;
  readonly name: string;
  readonly app: GluonApp;
  readonly container: Element;
  readonly active: boolean;
  cleanup(): void;
  own(cleanup: () => void | PromiseLike<void>, label?: string): void;
  query<ElementType extends Element = Element>(selector: string): ElementType | null;
  get<ElementType extends Element = Element>(selector: string): ElementType;
  text(): string;
}

export interface ComponentFixture<Props extends object> extends TestFixture {
  readonly props: Props;
  setProps(patch: Partial<Props>): Promise<void>;
}

export interface ElementFixture<ElementType extends HTMLElement> extends TestFixture {
  readonly element: ElementType;
  emitted(name?: string): readonly FixtureEventRecord[];
}

interface OwnedCleanup {
  readonly label: string;
  readonly cleanup: () => void | PromiseLike<void>;
}

interface FixtureInternals {
  readonly id: number;
  readonly name: string;
  readonly app: GluonApp;
  readonly container: Element;
  readonly removeContainer: boolean;
  readonly resources: OwnedCleanup[];
  active: boolean;
}

let fixtureSequence = 0;
const activeFixtures = new Map<number, FixtureInternals>();

export function mountComponent<Props extends object>(
  component: FunctionalComponent<Props>,
  options: ComponentMountOptions<Props>,
): ComponentFixture<Props> {
  const props = reactive({ ...options.props }) as Props;
  const fixture = createFixture(
    () => html`${component(props)}`,
    options,
  );
  return Object.assign(fixture, {
    props,
    async setProps(patch: Partial<Props>) {
      Object.assign(props, patch);
      await flushUpdates();
    },
  });
}

export function renderFixture(
  render: () => TemplateResult,
  options: BaseMountOptions = {},
): TestFixture {
  return createFixture(render, options);
}

export function mountElement<ElementType extends HTMLElement>(
  tagName: string,
  options: ElementMountOptions<ElementType> = {},
): ElementFixture<ElementType> {
  if (!tagName.includes('-')) throw new TypeError('Custom Element test tags must contain a hyphen.');
  const element = document.createElement(tagName) as ElementType;
  applyElementAttributes(element, options.attributes ?? {});
  Object.assign(element, options.properties ?? {});
  appendSlots(element, options.slots ?? {});
  const records: FixtureEventRecord[] = [];
  const listenerCleanups: Array<() => void> = [];
  for (const [name, listener] of Object.entries(options.events ?? {})) {
    const tracked = (event: Event) => {
      records.push(Object.freeze({ name, event }));
      listener(event);
    };
    element.addEventListener(name, tracked);
    listenerCleanups.push(() => element.removeEventListener(name, tracked));
  }

  const fixture = createFixture(() => html`${element}`, options);
  for (const cleanup of listenerCleanups) fixture.own(cleanup, 'element event listener');
  return Object.assign(fixture, {
    element,
    emitted(name?: string) {
      return Object.freeze(name ? records.filter((record) => record.name === name) : [...records]);
    },
  });
}

function createFixture(
  render: () => TemplateResult,
  options: BaseMountOptions,
): TestFixture {
  const id = ++fixtureSequence;
  const name = options.name?.trim() || `fixture-${id}`;
  const suppliedContainer = options.container;
  const container = suppliedContainer ?? document.createElement('div');
  const previousFixtureAttribute = container.getAttribute('data-gluon-test-fixture');
  container.setAttribute('data-gluon-test-fixture', String(id));
  if (!suppliedContainer) (options.attachTo ?? document.body).append(container);

  const app = createApp(render);
  applyAppOptions(app, options);
  const resources: OwnedCleanup[] = [];
  const internals: FixtureInternals = {
    id,
    name,
    app,
    container,
    removeContainer: !suppliedContainer,
    resources,
    active: true,
  };
  activeFixtures.set(id, internals);

  try {
    app.mount(container);
  } catch (error) {
    activeFixtures.delete(id);
    if (!suppliedContainer) container.remove();
    else if (previousFixtureAttribute === null) container.removeAttribute('data-gluon-test-fixture');
    else container.setAttribute('data-gluon-test-fixture', previousFixtureAttribute);
    throw error;
  }

  const fixture: TestFixture = {
    id,
    name,
    app,
    container,
    get active() { return internals.active; },
    cleanup: () => cleanupFixture(internals),
    own(cleanup, label = 'owned resource') {
      if (!internals.active) throw new Error(`Cannot register ${label} on cleaned fixture "${name}".`);
      resources.push({ cleanup, label });
    },
    query: (selector) => container.querySelector(selector),
    get<ElementType extends Element = Element>(selector: string): ElementType {
      const element = container.querySelector(selector);
      if (!element) throw new Error(`Fixture "${name}" did not contain selector "${selector}".`);
      return element as ElementType;
    },
    text: () => container.textContent ?? '',
  };
  return fixture;
}

function cleanupFixture(fixture: FixtureInternals): void {
  if (!fixture.active) return;
  fixture.active = false;
  const errors: string[] = [];
  try {
    fixture.app.unmount();
  } catch (error) {
    errors.push(`application: ${formatError(error)}`);
  }
  for (let index = fixture.resources.length - 1; index >= 0; index -= 1) {
    const resource = fixture.resources[index]!;
    try {
      const result = resource.cleanup();
      if (isPromiseLike(result)) {
        void Promise.resolve(result).catch(() => undefined);
        errors.push(`${resource.label}: asynchronous cleanup requires cleanupFixtures()`);
      }
    } catch (error) {
      errors.push(`${resource.label}: ${formatError(error)}`);
    }
  }
  fixture.resources.length = 0;
  if (fixture.container.childNodes.length > 0) {
    errors.push('renderer-owned DOM remained after application unmount');
  }
  fixture.container.removeAttribute('data-gluon-test-fixture');
  if (fixture.removeContainer) fixture.container.remove();
  activeFixtures.delete(fixture.id);
  if (errors.length > 0) throw new Error(formatCleanupFailure(fixture.name, errors));
}

export async function cleanupFixtures(): Promise<void> {
  const errors: string[] = [];
  for (const fixture of [...activeFixtures.values()].reverse()) {
    fixture.active = false;
    try {
      fixture.app.unmount();
    } catch (error) {
      errors.push(`${fixture.name} application: ${formatError(error)}`);
    }
    for (let index = fixture.resources.length - 1; index >= 0; index -= 1) {
      const resource = fixture.resources[index]!;
      try {
        await resource.cleanup();
      } catch (error) {
        errors.push(`${fixture.name} ${resource.label}: ${formatError(error)}`);
      }
    }
    fixture.resources.length = 0;
    if (fixture.container.childNodes.length > 0) {
      errors.push(`${fixture.name}: renderer-owned DOM remained after application unmount`);
    }
    fixture.container.removeAttribute('data-gluon-test-fixture');
    if (fixture.removeContainer) fixture.container.remove();
    activeFixtures.delete(fixture.id);
  }
  if (errors.length > 0) throw new Error(formatCleanupFailure('fixtures', errors));
}

export function activeFixtureNames(): readonly string[] {
  return Object.freeze([...activeFixtures.values()].map((fixture) => fixture.name));
}

export function assertNoFixtureLeaks(): void {
  const names = activeFixtureNames();
  if (names.length === 0) return;
  throw new Error(`Leaked Gluon test fixtures: ${names.join(', ')}. Each fixture owns its components, effects, directives, and listeners.`);
}

export interface AutoCleanupOptions {
  readonly assertBeforeCleanup?: boolean;
}

export function installAutoCleanup(
  afterEachHook: (cleanup: () => void | Promise<void>) => void,
  options: AutoCleanupOptions = {},
): void {
  afterEachHook(async () => {
    let leakError: unknown;
    if (options.assertBeforeCleanup) {
      try {
        assertNoFixtureLeaks();
      } catch (error) {
        leakError = error;
      }
    }
    await cleanupFixtures();
    if (leakError) throw leakError;
  });
}

export interface RouterFixture<Routes extends RouteNamedMap = RouteNamedMap> {
  readonly router: Router<Routes>;
  readonly plugin: GluonAppPlugin<void>;
  readonly ready: Promise<void>;
}

export interface RouterFixtureOptions<Routes extends RouteNamedMap = RouteNamedMap> {
  readonly initial?: string | readonly string[];
  readonly routes: readonly RouteRecordRaw[];
}

export function createRouterFixture<Routes extends RouteNamedMap = RouteNamedMap>(
  options: RouterFixtureOptions<Routes>,
): RouterFixture<Routes> {
  const initial = typeof options.initial === 'string'
    ? [options.initial]
    : options.initial ?? ['/'];
  const router = createRouter<Routes>({
    history: createMemoryHistory(initial),
    routes: options.routes,
  });
  return {
    router,
    plugin: createRouterPlugin(router as unknown as Router),
    ready: router.isReady(),
  };
}

export interface StoreFixture {
  readonly manager: StoreManager;
  readonly plugin: GluonAppPlugin<void>;
}

export function createStoreFixture(
  options: TestingStoreManagerOptions = {},
): StoreFixture {
  const manager = createTestingStoreManager(options);
  return {
    manager,
    plugin: () => () => manager.dispose(),
  };
}

export async function flushUpdates<Result = void>(
  callback?: () => Result,
): Promise<Result | undefined> {
  const result = callback?.();
  await Promise.resolve();
  await nextTick();
  return result;
}

export interface SettleOptions {
  readonly cycles?: number;
  readonly timers?: boolean;
}

export async function settle(options: SettleOptions = {}): Promise<void> {
  const cycles = options.cycles ?? 1;
  if (!Number.isInteger(cycles) || cycles < 1) {
    throw new TypeError('settle cycles must be a positive integer.');
  }
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    await flushUpdates();
    if (options.timers) await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function applyAppOptions(app: GluonApp, options: BaseMountOptions): void {
  for (const provider of options.providers ?? []) {
    app.provide(provider.key, provider.value);
  }
  for (const entry of options.plugins ?? []) {
    if (isPluginUse(entry)) app.use(entry.plugin, entry.options);
    else app.use(entry);
  }
  options.setup?.(app);
}

function isPluginUse(value: GluonAppPlugin<void> | TestPluginUse): value is TestPluginUse {
  return typeof value === 'object' && value !== null && 'plugin' in value;
}

function applyElementAttributes(
  element: HTMLElement,
  attributes: Readonly<Record<string, string | boolean | null | undefined>>,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value == null) element.removeAttribute(name);
    else element.setAttribute(name, value === true ? '' : value);
  }
}

function appendSlots(
  element: HTMLElement,
  slots: Readonly<Record<string, Node | string | readonly (Node | string)[]>>,
): void {
  for (const [name, content] of Object.entries(slots)) {
    for (const value of Array.isArray(content) ? content : [content]) {
      const node = typeof value === 'string' ? document.createTextNode(value) : value;
      if (name !== 'default') {
        if (node instanceof Element) node.slot = name;
        else {
          const wrapper = document.createElement('span');
          wrapper.slot = name;
          wrapper.append(node);
          element.append(wrapper);
          continue;
        }
      }
      element.append(node);
    }
  }
}

function formatCleanupFailure(name: string, errors: readonly string[]): string {
  return `Gluon test cleanup failed for ${name}:\n- ${errors.join('\n- ')}`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
    ? typeof (value as PromiseLike<unknown>).then === 'function'
    : false;
}
