export {
  createMemoryHistory,
  type HistoryListener,
  type HistoryLocation,
  type HistoryNavigation,
  type HistoryState,
  type RouterHistory,
  type ScrollPosition,
} from './history.js';

export {
  createRouterMatcher,
  isLazyRouteComponent,
  lazyRoute,
  type LazyRouteComponent,
  type MatcherResolution,
  type RouteComponent,
  type RouteComponentContext,
  type RouteComponentSource,
  type RouteMeta,
  type RouteParamPrimitive,
  type RouteParams,
  type RouteParamsRaw,
  type RouteRecordNormalized,
  type RouteRecordRaw,
  type RouterMatcher,
} from './matcher.js';

export {
  NavigationFailureType,
  createRouter,
  isNavigationFailure,
  type AfterNavigationHook,
  type NamedRouteDefinition,
  type NavigationFailure,
  type NavigationFailureTypeValue,
  type NavigationGuard,
  type NavigationGuardReturn,
  type RouteLocationNormalized,
  type RouteLocationPath,
  type RouteLocationRaw,
  type RouteNamedMap,
  type Router,
  type RouterOptions,
  type RouterSnapshot,
  type ScrollBehavior,
} from './router.js';

export {
  parseQuery,
  stringifyQuery,
  type LocationQuery,
  type LocationQueryPrimitive,
  type LocationQueryRaw,
  type LocationQueryValue,
} from './query.js';
