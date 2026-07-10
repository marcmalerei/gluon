import { shallowRef, type Ref } from '@gluonjs/reactivity';
import {
  createRouterMatcher,
  isLazyRouteComponent,
  type LazyRouteComponent,
  type MatcherResolution,
  type RouteComponent,
  type RouteComponentSource,
  type RouteMeta,
  type RouteParams,
  type RouteParamsRaw,
  type RouteRecordNormalized,
  type RouteRecordRaw,
  type RouterMatcher,
} from './matcher.js';
import {
  parseQuery,
  stringifyQuery,
  type LocationQuery,
  type LocationQueryRaw,
} from './query.js';
import type {
  HistoryLocation,
  HistoryNavigation,
  HistoryState,
  RouterHistory,
  ScrollPosition,
} from './history.js';

export interface NamedRouteDefinition<Params extends RouteParamsRaw = RouteParamsRaw> {
  readonly params: Params;
}

export type RouteNamedMap = Record<string, NamedRouteDefinition>;

export interface RouteLocationPath {
  readonly path: string;
  readonly query?: LocationQueryRaw;
  readonly hash?: string;
  readonly state?: HistoryState;
}

type NamedRouteLocation<Routes extends RouteNamedMap> = {
  [Name in keyof Routes & string]: {
    readonly name: Name;
    readonly params: Routes[Name]['params'];
    readonly query?: LocationQueryRaw;
    readonly hash?: string;
    readonly state?: HistoryState;
  };
}[keyof Routes & string];

export type RouteLocationRaw<
  Routes extends RouteNamedMap = RouteNamedMap,
> = string | RouteLocationPath | NamedRouteLocation<Routes>;

export interface RouteLocationNormalized {
  readonly name?: string;
  readonly path: string;
  readonly fullPath: string;
  readonly href: string;
  readonly query: LocationQuery;
  readonly hash: string;
  readonly params: RouteParams;
  readonly meta: RouteMeta;
  readonly matched: readonly RouteRecordNormalized[];
  readonly state: HistoryState;
  readonly redirectedFrom?: RouteLocationNormalized;
}

export const NavigationFailureType = Object.freeze({
  aborted: 4,
  cancelled: 8,
  duplicated: 16,
} as const);

export type NavigationFailureTypeValue = (
  typeof NavigationFailureType
)[keyof typeof NavigationFailureType];

export interface NavigationFailure extends Error {
  readonly type: NavigationFailureTypeValue;
  readonly to: RouteLocationNormalized;
  readonly from: RouteLocationNormalized;
}

export type NavigationGuardReturn =
  | void
  | boolean
  | RouteLocationRaw;

export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) => NavigationGuardReturn | PromiseLike<NavigationGuardReturn>;

export type AfterNavigationHook = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  failure?: NavigationFailure,
) => void | PromiseLike<void>;

export type ScrollBehavior = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition?: ScrollPosition,
) => ScrollPosition | false | void | PromiseLike<ScrollPosition | false | void>;

export interface RouterOptions {
  readonly history: RouterHistory;
  readonly routes: readonly RouteRecordRaw[];
  readonly scrollBehavior?: ScrollBehavior;
}

export interface RouterSnapshot {
  readonly location: string;
}

export interface Router<Routes extends RouteNamedMap = RouteNamedMap> {
  readonly history: RouterHistory;
  readonly currentRoute: Readonly<Ref<RouteLocationNormalized>>;
  resolve(to: RouteLocationRaw<Routes>): RouteLocationNormalized;
  push(to: RouteLocationRaw<Routes>): Promise<NavigationFailure | undefined>;
  replace(to: RouteLocationRaw<Routes>): Promise<NavigationFailure | undefined>;
  go(delta: number): void;
  back(): void;
  forward(): void;
  beforeEach(guard: NavigationGuard): () => void;
  beforeResolve(guard: NavigationGuard): () => void;
  afterEach(hook: AfterNavigationHook): () => void;
  onError(handler: (error: unknown) => void): () => void;
  addRoute(record: RouteRecordRaw, parentName?: string): () => void;
  removeRoute(name: string): void;
  hasRoute(name: string): boolean;
  getRoutes(): readonly RouteRecordNormalized[];
  getRouteComponent(record: RouteRecordNormalized, name?: string): RouteComponent | undefined;
  isReady(): Promise<void>;
  dehydrate(): RouterSnapshot;
  hydrate(snapshot: RouterSnapshot): Promise<NavigationFailure | undefined>;
  destroy(): void;
}

interface NavigationOptions {
  readonly replace?: boolean;
  readonly historyEvent?: {
    readonly from: HistoryLocation;
    readonly navigation: HistoryNavigation;
  };
  readonly redirectedFrom?: RouteLocationNormalized;
  readonly redirectCount?: number;
}

const startLocation: RouteLocationNormalized = Object.freeze({
  path: '/',
  fullPath: '/',
  href: '/',
  query: Object.freeze({}),
  hash: '',
  params: Object.freeze({}),
  meta: Object.freeze({}),
  matched: Object.freeze([]),
  state: Object.freeze({}),
});

export function createRouter<Routes extends RouteNamedMap = RouteNamedMap>(
  options: RouterOptions,
): Router<Routes> {
  const matcher = createRouterMatcher(options.routes);
  const currentRoute = shallowRef<RouteLocationNormalized>(startLocation);
  const beforeGuards = new Set<NavigationGuard>();
  const resolveGuards = new Set<NavigationGuard>();
  const afterHooks = new Set<AfterNavigationHook>();
  const errorHandlers = new Set<(error: unknown) => void>();
  const resolvedComponents = new Map<RouteComponentSource, RouteComponent>();
  const pendingComponents = new Map<LazyRouteComponent, Promise<RouteComponent>>();
  let navigationSequence = 0;
  let destroyed = false;
  let initialized = false;
  let readyResolve!: () => void;
  let readyReject!: (error: unknown) => void;
  let readySettled = false;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  const resolveLocation = (
    raw: RouteLocationRaw<Routes>,
    redirectedFrom?: RouteLocationNormalized,
  ): RouteLocationNormalized => {
    const parsed = normalizeRawLocation(raw);
    const resolution = parsed.name
      ? matcher.resolveName(parsed.name, parsed.params)
      : matcher.resolvePath(parsed.path) ?? emptyResolution(parsed.path);
    const query = parsed.query ?? Object.freeze({});
    const hash = normalizeHash(parsed.hash);
    const fullPath = `${resolution.path}${stringifyNormalizedQuery(query)}${hash}`;
    const meta = Object.freeze(Object.assign({}, ...resolution.matched.map((record) => record.meta)));
    return Object.freeze({
      ...(resolution.name ? { name: resolution.name } : {}),
      path: resolution.path,
      fullPath,
      href: options.history.createHref(fullPath),
      query,
      hash,
      params: resolution.params,
      meta,
      matched: resolution.matched,
      state: Object.freeze({ ...(parsed.state ?? {}) }),
      ...(redirectedFrom ? { redirectedFrom } : {}),
    });
  };

  const resolveRedirect = (
    route: RouteLocationNormalized,
    count: number,
  ): RouteLocationNormalized => {
    const record = route.matched.at(-1);
    if (!record?.redirect) return route;
    if (count >= 20) throw new Error('Router redirect limit exceeded.');
    const target = typeof record.redirect === 'function'
      ? record.redirect(route)
      : record.redirect;
    const redirected = resolveLocation(target as RouteLocationRaw<Routes>, route.redirectedFrom ?? route);
    return resolveRedirect(redirected, count + 1);
  };

  const loadRouteComponents = async (route: RouteLocationNormalized): Promise<void> => {
    for (const record of route.matched) {
      for (const source of Object.values(record.components)) {
        if (!isLazyRouteComponent(source) || resolvedComponents.has(source)) continue;
        let pending = pendingComponents.get(source);
        if (!pending) {
          pending = Promise.resolve(source.load()).then((loaded) => {
            const component = typeof loaded === 'function' ? loaded : loaded.default;
            resolvedComponents.set(source, component);
            pendingComponents.delete(source);
            return component;
          }, (error: unknown) => {
            pendingComponents.delete(source);
            throw error;
          });
          pendingComponents.set(source, pending);
        }
        await pending;
      }
    }
  };

  const runGuards = async (
    guards: Iterable<NavigationGuard>,
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    navigationId: number,
  ): Promise<NavigationGuardReturn> => {
    for (const guard of guards) {
      const result = await guard(to, from);
      if (navigationId !== navigationSequence) return false;
      if (result === false || isRouteLocation(result)) return result;
    }
    return undefined;
  };

  const navigate = async (
    raw: RouteLocationRaw<Routes>,
    navigationOptions: NavigationOptions = {},
  ): Promise<NavigationFailure | undefined> => {
    if (destroyed) throw new Error('Cannot navigate a destroyed router.');
    const navigationId = navigationSequence += 1;
    const from = currentRoute.value;
    let to: RouteLocationNormalized;
    try {
      to = resolveRedirect(
        resolveLocation(raw, navigationOptions.redirectedFrom),
        navigationOptions.redirectCount ?? 0,
      );
      if (initialized && to.fullPath === from.fullPath && !navigationOptions.historyEvent) {
        const failure = createNavigationFailure(NavigationFailureType.duplicated, to, from);
        await invokeAfterHooks(afterHooks, to, from, failure);
        settleReady();
        return failure;
      }

      const routeGuards = to.matched.flatMap((record) => record.beforeEnter);
      let guardResult = await runGuards(
        [...beforeGuards, ...routeGuards],
        to,
        from,
        navigationId,
      );
      if (navigationId !== navigationSequence) {
        const failure = createNavigationFailure(NavigationFailureType.cancelled, to, from);
        await invokeAfterHooks(afterHooks, to, from, failure);
        return failure;
      }
      if (isRouteLocation(guardResult)) {
        return navigate(guardResult as RouteLocationRaw<Routes>, {
          replace: navigationOptions.replace || Boolean(navigationOptions.historyEvent),
          ...(navigationOptions.historyEvent ? { historyEvent: navigationOptions.historyEvent } : {}),
          redirectedFrom: to.redirectedFrom ?? to,
          redirectCount: (navigationOptions.redirectCount ?? 0) + 1,
        });
      }
      if (guardResult === false) {
        const failure = createNavigationFailure(NavigationFailureType.aborted, to, from);
        rollbackHistoryNavigation(options.history, navigationOptions.historyEvent);
        await invokeAfterHooks(afterHooks, to, from, failure);
        settleReady();
        return failure;
      }

      await loadRouteComponents(to);
      if (navigationId !== navigationSequence) {
        const failure = createNavigationFailure(NavigationFailureType.cancelled, to, from);
        await invokeAfterHooks(afterHooks, to, from, failure);
        return failure;
      }
      guardResult = await runGuards(resolveGuards, to, from, navigationId);
      if (navigationId !== navigationSequence) {
        const failure = createNavigationFailure(NavigationFailureType.cancelled, to, from);
        await invokeAfterHooks(afterHooks, to, from, failure);
        return failure;
      }
      if (isRouteLocation(guardResult)) {
        return navigate(guardResult as RouteLocationRaw<Routes>, {
          replace: navigationOptions.replace || Boolean(navigationOptions.historyEvent),
          ...(navigationOptions.historyEvent ? { historyEvent: navigationOptions.historyEvent } : {}),
          redirectedFrom: to.redirectedFrom ?? to,
          redirectCount: (navigationOptions.redirectCount ?? 0) + 1,
        });
      }
      if (guardResult === false) {
        const failure = createNavigationFailure(NavigationFailureType.aborted, to, from);
        rollbackHistoryNavigation(options.history, navigationOptions.historyEvent);
        await invokeAfterHooks(afterHooks, to, from, failure);
        settleReady();
        return failure;
      }

      if (!navigationOptions.historyEvent) captureCurrentScroll(options.history);
      if (navigationOptions.historyEvent) {
        if (options.history.location.location !== to.fullPath) {
          options.history.replace(to.fullPath, to.state);
        }
      } else {
        if (navigationOptions.replace) options.history.replace(to.fullPath, to.state);
        else options.history.push(to.fullPath, to.state);
      }
      initialized = true;
      currentRoute.value = to;
      await applyScroll(options.scrollBehavior, to, from, navigationOptions.historyEvent?.navigation.savedPosition);
      await invokeAfterHooks(afterHooks, to, from);
      settleReady();
      return undefined;
    } catch (error) {
      for (const handler of [...errorHandlers]) handler(error);
      if (!readySettled) {
        readySettled = true;
        readyReject(error);
      }
      throw error;
    }
  };

  const settleReady = (): void => {
    if (readySettled) return;
    readySettled = true;
    readyResolve();
  };

  const removeHistoryListener = options.history.listen((to, from, navigation) => {
    void navigate({ path: to.location, state: to.state } as RouteLocationRaw<Routes>, {
      historyEvent: { from, navigation },
    }).catch(() => undefined);
  });

  void navigate(options.history.location.location as RouteLocationRaw<Routes>, {
    replace: true,
  }).catch(() => undefined);

  const router: Router<Routes> = {
    history: options.history,
    currentRoute,
    resolve: (to) => resolveRedirect(resolveLocation(to), 0),
    push: (to) => navigate(to),
    replace: (to) => navigate(to, { replace: true }),
    go: (delta) => goWithScroll(options.history, delta),
    back: () => goWithScroll(options.history, -1),
    forward: () => goWithScroll(options.history, 1),
    beforeEach: (guard) => addRemovable(beforeGuards, guard),
    beforeResolve: (guard) => addRemovable(resolveGuards, guard),
    afterEach: (hook) => addRemovable(afterHooks, hook),
    onError: (handler) => addRemovable(errorHandlers, handler),
    addRoute: (record, parentName) => matcher.addRoute(record, parentName),
    removeRoute: (name) => matcher.removeRoute(name),
    hasRoute: (name) => matcher.hasRoute(name),
    getRoutes: () => matcher.getRoutes(),
    getRouteComponent(record, name = 'default') {
      const source = record.components[name];
      if (!source) return undefined;
      return isLazyRouteComponent(source) ? resolvedComponents.get(source) : source;
    },
    isReady: () => ready,
    dehydrate: () => Object.freeze({ location: currentRoute.value.fullPath }),
    hydrate: (snapshot) => navigate(snapshot.location as RouteLocationRaw<Routes>, { replace: true }),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      navigationSequence += 1;
      removeHistoryListener();
      options.history.destroy();
      beforeGuards.clear();
      resolveGuards.clear();
      afterHooks.clear();
      errorHandlers.clear();
      pendingComponents.clear();
    },
  };
  return router;
}

export function isNavigationFailure(
  value: unknown,
  type?: NavigationFailureTypeValue,
): value is NavigationFailure {
  return value instanceof Error
    && 'type' in value
    && (type === undefined || (value as NavigationFailure).type === type);
}

function normalizeRawLocation(raw: RouteLocationRaw): {
  readonly path: string;
  readonly name?: string;
  readonly params?: RouteParamsRaw;
  readonly query: LocationQuery;
  readonly hash: string;
  readonly state?: HistoryState;
} {
  if (typeof raw === 'string') {
    const parsed = parseLocationString(raw);
    return { ...parsed, state: Object.freeze({}) };
  }
  if ('name' in raw) {
    return {
      path: '/',
      name: raw.name,
      params: raw.params,
      query: normalizeQuery(raw.query),
      hash: normalizeHash(raw.hash),
      ...(raw.state ? { state: raw.state } : {}),
    };
  }
  const parsed = parseLocationString(raw.path);
  return {
    ...parsed,
    query: raw.query ? normalizeQuery(raw.query) : parsed.query,
    hash: raw.hash !== undefined ? normalizeHash(raw.hash) : parsed.hash,
    ...(raw.state ? { state: raw.state } : {}),
  };
}

function parseLocationString(location: string): {
  readonly path: string;
  readonly query: LocationQuery;
  readonly hash: string;
} {
  const hashIndex = location.indexOf('#');
  const hash = hashIndex < 0 ? '' : normalizeHash(location.slice(hashIndex));
  const withoutHash = hashIndex < 0 ? location : location.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex < 0 ? withoutHash : withoutHash.slice(0, queryIndex);
  const search = queryIndex < 0 ? '' : withoutHash.slice(queryIndex);
  return {
    path: normalizePath(path || '/'),
    query: parseQuery(search),
    hash,
  };
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function normalizeHash(hash: string | undefined): string {
  if (!hash) return '';
  return hash.startsWith('#') ? hash : `#${hash}`;
}

function normalizeQuery(query: LocationQueryRaw | undefined): LocationQuery {
  return parseQuery(stringifyQuery(query));
}

function stringifyNormalizedQuery(query: LocationQuery): string {
  return stringifyQuery(query as LocationQueryRaw);
}

function emptyResolution(path: string): MatcherResolution {
  return Object.freeze({
    path,
    params: Object.freeze({}),
    matched: Object.freeze([]),
  });
}

function isRouteLocation(value: unknown): value is RouteLocationRaw {
  return typeof value === 'string'
    || Boolean(value && typeof value === 'object' && ('path' in value || 'name' in value));
}

function createNavigationFailure(
  type: NavigationFailureTypeValue,
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): NavigationFailure {
  const message = type === NavigationFailureType.aborted
    ? `Navigation to "${to.fullPath}" was aborted.`
    : type === NavigationFailureType.cancelled
      ? `Navigation to "${to.fullPath}" was cancelled.`
      : `Navigation to "${to.fullPath}" was duplicated.`;
  return Object.assign(new Error(message), { type, to, from });
}

async function invokeAfterHooks(
  hooks: ReadonlySet<AfterNavigationHook>,
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  failure?: NavigationFailure,
): Promise<void> {
  for (const hook of [...hooks]) await hook(to, from, failure);
}

function rollbackHistoryNavigation(
  history: RouterHistory,
  event: NavigationOptions['historyEvent'],
): void {
  if (!event || event.navigation.delta === 0) return;
  history.go(-event.navigation.delta, false);
}

function captureCurrentScroll(history: RouterHistory): void {
  const environment = globalThis as { scrollX?: number; scrollY?: number };
  if (typeof environment.scrollX !== 'number' || typeof environment.scrollY !== 'number') return;
  history.saveScroll({ left: environment.scrollX, top: environment.scrollY });
}

function goWithScroll(history: RouterHistory, delta: number): void {
  captureCurrentScroll(history);
  history.go(delta);
}

async function applyScroll(
  behavior: ScrollBehavior | undefined,
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition?: ScrollPosition,
): Promise<void> {
  if (!behavior) return;
  const position = await behavior(to, from, savedPosition);
  if (!position) return;
  const environment = globalThis as { scrollTo?: (options: ScrollToOptions) => void };
  environment.scrollTo?.({ left: position.left, top: position.top });
}

function addRemovable<Value>(set: Set<Value>, value: Value): () => void {
  set.add(value);
  return () => set.delete(value);
}
