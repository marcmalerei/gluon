import type { TemplateValue } from '@gluonjs/core';
import type { NavigationGuard } from './router.js';

export type RouteParamPrimitive = string | number;
export type RouteParamValue = RouteParamPrimitive | readonly RouteParamPrimitive[];
export type RouteParamsRaw = Readonly<Record<string, RouteParamValue | null | undefined>>;
export type RouteParams = Readonly<Record<string, string | readonly string[]>>;
export type RouteMeta = Readonly<Record<string, unknown>>;

export interface RouteComponentContext {
  readonly route: import('./router.js').RouteLocationNormalized;
  readonly router: import('./router.js').Router;
  readonly record: RouteRecordNormalized;
}

export type RouteComponent = (context: RouteComponentContext) => TemplateValue;
const lazyRouteBrand = Symbol('gluon.lazy-route');
export interface LazyRouteComponent {
  readonly [lazyRouteBrand]: true;
  readonly load: () => Promise<RouteComponent | { readonly default: RouteComponent }>;
}
export type RouteComponentSource = RouteComponent | LazyRouteComponent;

export function lazyRoute(
  load: LazyRouteComponent['load'],
): LazyRouteComponent {
  return Object.freeze({ [lazyRouteBrand]: true as const, load });
}

export function isLazyRouteComponent(
  source: RouteComponentSource,
): source is LazyRouteComponent {
  return typeof source === 'object' && source !== null && lazyRouteBrand in source;
}

export interface RouteRecordRaw {
  readonly path: string;
  readonly name?: string;
  readonly component?: RouteComponentSource;
  readonly components?: Readonly<Record<string, RouteComponentSource>>;
  readonly children?: readonly RouteRecordRaw[];
  readonly redirect?: import('./router.js').RouteLocationRaw | ((to: import('./router.js').RouteLocationNormalized) => import('./router.js').RouteLocationRaw);
  readonly alias?: string | readonly string[];
  readonly meta?: RouteMeta;
  readonly beforeEnter?: NavigationGuard | readonly NavigationGuard[];
}

export interface RouteRecordNormalized {
  readonly id: number;
  readonly path: string;
  readonly name?: string;
  readonly parent?: RouteRecordNormalized;
  readonly children: RouteRecordNormalized[];
  readonly components: Record<string, RouteComponentSource>;
  readonly meta: RouteMeta;
  readonly redirect?: RouteRecordRaw['redirect'];
  readonly beforeEnter: readonly NavigationGuard[];
}

interface ParamKey {
  readonly name: string;
  readonly group: string;
  readonly optional: boolean;
  readonly repeatable: boolean;
}

interface RouteMatcherEntry {
  readonly path: string;
  readonly regex: RegExp;
  readonly keys: readonly ParamKey[];
  readonly score: number;
  readonly record: RouteRecordNormalized;
}

export interface MatcherResolution {
  readonly name?: string;
  readonly path: string;
  readonly params: RouteParams;
  readonly matched: readonly RouteRecordNormalized[];
}

export interface RouterMatcher {
  addRoute(record: RouteRecordRaw, parentName?: string): () => void;
  removeRoute(name: string): void;
  hasRoute(name: string): boolean;
  getRoutes(): readonly RouteRecordNormalized[];
  resolvePath(path: string): MatcherResolution | undefined;
  resolveName(name: string, params?: RouteParamsRaw): MatcherResolution;
}

export function createRouterMatcher(routes: readonly RouteRecordRaw[]): RouterMatcher {
  let recordSequence = 0;
  const records: RouteRecordNormalized[] = [];
  const matchers: RouteMatcherEntry[] = [];
  const names = new Map<string, RouteRecordNormalized>();
  const recordMatchers = new Map<number, RouteMatcherEntry[]>();

  const sortMatchers = (): void => {
    matchers.sort((left, right) => right.score - left.score || right.path.length - left.path.length);
  };

  const addMatcher = (path: string, record: RouteRecordNormalized): string => {
    const normalizedPath = normalizeRoutePath(path);
    const compiled = compileRoutePath(normalizedPath);
    const entry = { path: normalizedPath, ...compiled, record };
    matchers.push(entry);
    const owned = recordMatchers.get(record.id) ?? [];
    owned.push(entry);
    recordMatchers.set(record.id, owned);
    return normalizedPath;
  };

  const addRecord = (
    raw: RouteRecordRaw,
    parent: RouteRecordNormalized | undefined,
    inheritedBases: readonly string[] = [],
  ): RouteRecordNormalized => {
    const path = joinRoutePath(parent?.path, raw.path);
    const record: RouteRecordNormalized = {
      id: recordSequence += 1,
      path,
      ...(raw.name ? { name: raw.name } : {}),
      ...(parent ? { parent } : {}),
      children: [],
      components: {
        ...(raw.component ? { default: raw.component } : {}),
        ...(raw.components ?? {}),
      },
      meta: Object.freeze({ ...(raw.meta ?? {}) }),
      ...(raw.redirect ? { redirect: raw.redirect } : {}),
      beforeEnter: Object.freeze(normalizeGuards(raw.beforeEnter)),
    };
    records.push(record);
    parent?.children.push(record);
    if (record.name) {
      if (names.has(record.name)) throw new Error(`Duplicate route name "${record.name}".`);
      names.set(record.name, record);
    }

    const matcherPaths = new Set<string>([addMatcher(path, record)]);
    const aliases = typeof raw.alias === 'string' ? [raw.alias] : raw.alias ?? [];
    for (const alias of aliases) matcherPaths.add(addMatcher(joinRoutePath(parent?.path, alias), record));
    for (const base of inheritedBases) matcherPaths.add(addMatcher(joinRoutePath(base, raw.path), record));

    for (const child of raw.children ?? []) {
      addRecord(child, record, [...matcherPaths].filter((entry) => entry !== path));
    }
    return record;
  };

  const removeRecord = (record: RouteRecordNormalized): void => {
    for (const child of [...record.children]) removeRecord(child);
    for (const matcher of recordMatchers.get(record.id) ?? []) {
      const index = matchers.indexOf(matcher);
      if (index >= 0) matchers.splice(index, 1);
    }
    recordMatchers.delete(record.id);
    const recordIndex = records.indexOf(record);
    if (recordIndex >= 0) records.splice(recordIndex, 1);
    if (record.name && names.get(record.name) === record) names.delete(record.name);
    const childIndex = record.parent?.children.indexOf(record) ?? -1;
    if (childIndex >= 0) record.parent?.children.splice(childIndex, 1);
  };

  for (const route of routes) addRecord(route, undefined);
  sortMatchers();

  return {
    addRoute(raw, parentName) {
      const parent = parentName ? names.get(parentName) : undefined;
      if (parentName && !parent) throw new Error(`Unknown parent route "${parentName}".`);
      const record = addRecord(raw, parent);
      sortMatchers();
      return () => removeRecord(record);
    },
    removeRoute(name) {
      const record = names.get(name);
      if (record) removeRecord(record);
    },
    hasRoute: (name) => names.has(name),
    getRoutes: () => Object.freeze([...records]),
    resolvePath(path) {
      for (const matcher of matchers) {
        const match = matcher.regex.exec(path);
        if (!match) continue;
        return createResolution(path, extractParams(match, matcher.keys), matcher.record);
      }
      return undefined;
    },
    resolveName(name, params = {}) {
      const record = names.get(name);
      if (!record) throw new Error(`Unknown route name "${name}".`);
      const path = generateRoutePath(record.path, params);
      const matcher = recordMatchers.get(record.id)?.find((entry) => entry.path === record.path);
      const match = matcher?.regex.exec(path);
      if (!matcher || !match) {
        throw new Error(`Route params do not match the path for route "${name}".`);
      }
      return createResolution(path, extractParams(match, matcher.keys), record);
    },
  };
}

function extractParams(
  match: RegExpExecArray,
  keys: readonly ParamKey[],
): Record<string, string | readonly string[]> {
  const params: Record<string, string | readonly string[]> = {};
  keys.forEach((key, index) => {
    const value = match.groups?.[key.group] ?? match[index + 1];
    if (value === undefined) return;
    params[key.name] = key.repeatable
      ? Object.freeze(value.split('/').map(decodeParam))
      : decodeParam(value);
  });
  return params;
}

function createResolution(
  path: string,
  params: Record<string, string | readonly string[]>,
  record: RouteRecordNormalized,
): MatcherResolution {
  const matched: RouteRecordNormalized[] = [];
  let current: RouteRecordNormalized | undefined = record;
  while (current) {
    matched.unshift(current);
    current = current.parent;
  }
  return Object.freeze({
    ...(record.name ? { name: record.name } : {}),
    path,
    params: Object.freeze(params),
    matched: Object.freeze(matched),
  });
}

function normalizeGuards(
  guards: RouteRecordRaw['beforeEnter'],
): NavigationGuard[] {
  if (!guards) return [];
  return Array.isArray(guards) ? [...guards] : [guards as NavigationGuard];
}

function joinRoutePath(parent: string | undefined, path: string): string {
  if (path.startsWith('/')) return normalizeRoutePath(path);
  if (!parent || parent === '/') return normalizeRoutePath(`/${path}`);
  return normalizeRoutePath(`${parent}/${path}`);
}

function normalizeRoutePath(path: string): string {
  const prefixed = path.startsWith('/') ? path : `/${path}`;
  const normalized = prefixed.replace(/\/{2,}/g, '/');
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function compileRoutePath(path: string): Omit<RouteMatcherEntry, 'path' | 'record'> {
  if (path === '/') return { regex: /^\/?$/, keys: [], score: 100 };
  const keys: ParamKey[] = [];
  let score = 0;
  let pattern = '^';
  for (const segment of path.slice(1).split('/')) {
    const param = segment.match(/^:([A-Za-z_][\w]*)(?:\((.+)\))?([?+*])?$/);
    if (!param?.[1]) {
      pattern += `/${escapeRegex(segment)}`;
      score += 40;
      continue;
    }
    const [, name, customPattern, modifier = ''] = param;
    const repeatable = modifier === '+' || modifier === '*';
    const optional = modifier === '?' || modifier === '*';
    const valuePattern = customPattern ?? '[^/]+';
    const group = `p${keys.length}`;
    keys.push({ name, group, repeatable, optional });
    if (repeatable) {
      const repeated = `${valuePattern}(?:/${valuePattern})*`;
      pattern += optional ? `(?:/(?<${group}>${repeated}))?` : `/(?<${group}>${repeated})`;
      score += optional ? 5 : 15;
    } else {
      pattern += optional ? `(?:/(?<${group}>${valuePattern}))?` : `/(?<${group}>${valuePattern})`;
      score += optional ? 10 : 20;
    }
  }
  pattern += '/?$';
  return { regex: new RegExp(pattern), keys: Object.freeze(keys), score };
}

function generateRoutePath(path: string, params: RouteParamsRaw): string {
  if (path === '/') return '/';
  const segments: string[] = [];
  for (const segment of path.slice(1).split('/')) {
    const param = segment.match(/^:([A-Za-z_][\w]*)(?:\((.+)\))?([?+*])?$/);
    if (!param?.[1]) {
      segments.push(segment);
      continue;
    }
    const [, name, , modifier = ''] = param;
    const value = params[name];
    const optional = modifier === '?' || modifier === '*';
    const repeatable = modifier === '+' || modifier === '*';
    if (value == null || (Array.isArray(value) && value.length === 0)) {
      if (optional) continue;
      throw new Error(`Missing required route param "${name}".`);
    }
    if (Array.isArray(value)) {
      if (!repeatable) throw new Error(`Route param "${name}" is not repeatable.`);
      segments.push(value.map((entry) => encodeURIComponent(String(entry))).join('/'));
    } else {
      segments.push(encodeURIComponent(String(value)));
    }
  }
  return `/${segments.join('/')}`;
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
