export type HistoryState = Readonly<Record<string, unknown>>;

export interface ScrollPosition {
  readonly left: number;
  readonly top: number;
}

export interface HistoryLocation {
  readonly location: string;
  readonly state: HistoryState;
  readonly position: number;
}

export interface HistoryNavigation {
  readonly type: 'pop';
  readonly delta: number;
  readonly direction: 'back' | 'forward' | 'unknown';
  readonly savedPosition?: ScrollPosition;
}

export type HistoryListener = (
  to: HistoryLocation,
  from: HistoryLocation,
  navigation: HistoryNavigation,
) => void;

export interface RouterHistory {
  readonly base: string;
  readonly location: HistoryLocation;
  createHref(location: string): string;
  push(location: string, state?: HistoryState): void;
  replace(location: string, state?: HistoryState): void;
  go(delta: number, triggerListeners?: boolean): void;
  listen(listener: HistoryListener): () => void;
  saveScroll(position: ScrollPosition): void;
  destroy(): void;
}

interface MemoryEntry {
  readonly location: string;
  readonly state: HistoryState;
  readonly position: number;
  scroll?: ScrollPosition;
}

export function createMemoryHistory(
  initialEntries: readonly string[] = ['/'],
): RouterHistory {
  if (initialEntries.length === 0) throw new Error('Memory history requires at least one entry.');
  let entries: MemoryEntry[] = initialEntries.map((location, position) => ({
    location: normalizeHistoryLocation(location),
    state: Object.freeze({}),
    position,
  }));
  let index = entries.length - 1;
  const listeners = new Set<HistoryListener>();

  const snapshot = (entry: MemoryEntry): HistoryLocation => Object.freeze({
    location: entry.location,
    state: entry.state,
    position: entry.position,
  });

  return {
    base: '/',
    get location() {
      return snapshot(entries[index]!);
    },
    createHref: normalizeHistoryLocation,
    push(location, state = {}) {
      const position = index + 1;
      entries = entries.slice(0, position);
      entries.push({
        location: normalizeHistoryLocation(location),
        state: Object.freeze({ ...state }),
        position,
      });
      index = position;
    },
    replace(location, state = {}) {
      const current = entries[index]!;
      entries[index] = {
        location: normalizeHistoryLocation(location),
        state: Object.freeze({ ...state }),
        position: current.position,
        ...(current.scroll ? { scroll: current.scroll } : {}),
      };
    },
    go(delta, triggerListeners = true) {
      const target = Math.min(entries.length - 1, Math.max(0, index + delta));
      if (target === index) return;
      const from = entries[index]!;
      index = target;
      const to = entries[index]!;
      if (triggerListeners) {
        const navigation = Object.freeze({
          type: 'pop' as const,
          delta: target - from.position,
          direction: target < from.position ? 'back' as const : 'forward' as const,
          ...(to.scroll ? { savedPosition: to.scroll } : {}),
        });
        for (const listener of [...listeners]) listener(snapshot(to), snapshot(from), navigation);
      }
    },
    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    saveScroll(position) {
      entries[index]!.scroll = Object.freeze({ ...position });
    },
    destroy() {
      listeners.clear();
    },
  };
}

export function createWebHistory(
  base = '/',
  targetWindow: Window = window,
): RouterHistory {
  return createBrowserHistory('web', base, targetWindow);
}

export function createWebHashHistory(
  base = '/',
  targetWindow: Window = window,
): RouterHistory {
  return createBrowserHistory('hash', base, targetWindow);
}

interface BrowserRouterState {
  readonly position: number;
  readonly key: string;
  readonly scroll?: ScrollPosition;
}

const browserStateKey = '__gluonRouter';

function createBrowserHistory(
  mode: 'web' | 'hash',
  base: string,
  targetWindow: Window,
): RouterHistory {
  const normalizedBase = normalizeBase(base);
  const listeners = new Set<HistoryListener>();
  let suppressedPosition: number | undefined;
  let current = readBrowserLocation(mode, normalizedBase, targetWindow);
  let state = readBrowserState(targetWindow.history.state);
  if (!state) {
    state = { position: targetWindow.history.length - 1, key: createHistoryKey() };
    targetWindow.history.replaceState(
      mergeBrowserState(targetWindow.history.state, state),
      '',
      createBrowserHref(mode, normalizedBase, current),
    );
  }
  let userState = stripBrowserState(targetWindow.history.state);

  const snapshot = (): HistoryLocation => Object.freeze({
    location: current,
    state: userState,
    position: state!.position,
  });

  const popstate = (): void => {
    const from = snapshot();
    const nextState = readBrowserState(targetWindow.history.state)
      ?? { position: from.position, key: createHistoryKey() };
    const nextUserState = stripBrowserState(targetWindow.history.state);
    current = readBrowserLocation(mode, normalizedBase, targetWindow);
    state = nextState;
    userState = nextUserState;
    if (suppressedPosition === nextState.position) {
      suppressedPosition = undefined;
      return;
    }
    const delta = nextState.position - from.position;
    const navigation = Object.freeze({
      type: 'pop' as const,
      delta,
      direction: delta < 0 ? 'back' as const : delta > 0 ? 'forward' as const : 'unknown' as const,
      ...(nextState.scroll ? { savedPosition: nextState.scroll } : {}),
    });
    const to = snapshot();
    for (const listener of [...listeners]) listener(to, from, navigation);
  };
  targetWindow.addEventListener('popstate', popstate);

  const scroll = (): void => {
    if (typeof targetWindow.scrollX !== 'number' || typeof targetWindow.scrollY !== 'number') return;
    saveBrowserScroll({ left: targetWindow.scrollX, top: targetWindow.scrollY });
  };
  targetWindow.addEventListener('scroll', scroll, { passive: true });

  const saveBrowserScroll = (position: ScrollPosition): void => {
    state = { ...state!, scroll: Object.freeze({ ...position }) };
    targetWindow.history.replaceState(
      mergeBrowserState(userState, state),
      '',
      createBrowserHref(mode, normalizedBase, current),
    );
  };

  return {
    base: normalizedBase,
    get location() {
      return snapshot();
    },
    createHref: (location) => createBrowserHref(mode, normalizedBase, normalizeHistoryLocation(location)),
    push(location, nextState = {}) {
      current = normalizeHistoryLocation(location);
      state = { position: state!.position + 1, key: createHistoryKey() };
      const nextUserState = Object.freeze({ ...nextState });
      targetWindow.history.pushState(
        mergeBrowserState(nextUserState, state),
        '',
        createBrowserHref(mode, normalizedBase, current),
      );
      userState = nextUserState;
    },
    replace(location, nextState = {}) {
      current = normalizeHistoryLocation(location);
      state = { ...state!, key: createHistoryKey() };
      userState = Object.freeze({ ...nextState });
      targetWindow.history.replaceState(
        mergeBrowserState(userState, state),
        '',
        createBrowserHref(mode, normalizedBase, current),
      );
    },
    go(delta, triggerListeners = true) {
      if (!triggerListeners) suppressedPosition = state!.position + delta;
      targetWindow.history.go(delta);
    },
    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    saveScroll(position) {
      saveBrowserScroll(position);
    },
    destroy() {
      listeners.clear();
      targetWindow.removeEventListener('popstate', popstate);
      targetWindow.removeEventListener('scroll', scroll);
    },
  };
}

function normalizeBase(base: string): string {
  const prefixed = base.startsWith('/') ? base : `/${base}`;
  return prefixed === '/' ? '/' : prefixed.replace(/\/+$/, '');
}

function normalizeHistoryLocation(location: string): string {
  const prefixed = location.startsWith('/') ? location : `/${location}`;
  return prefixed || '/';
}

function readBrowserLocation(mode: 'web' | 'hash', base: string, targetWindow: Window): string {
  if (mode === 'hash') {
    const hash = targetWindow.location.hash.slice(1);
    return normalizeHistoryLocation(hash || '/');
  }
  const pathname = targetWindow.location.pathname;
  const strippedPath = base !== '/' && (pathname === base || pathname.startsWith(`${base}/`))
    ? pathname.slice(base.length)
    : pathname;
  return normalizeHistoryLocation(
    `${strippedPath || '/'}${targetWindow.location.search}${targetWindow.location.hash}`,
  );
}

function createBrowserHref(mode: 'web' | 'hash', base: string, location: string): string {
  if (mode === 'hash') return `${base === '/' ? '' : base}#${location}` || '#/';
  return `${base === '/' ? '' : base}${location}` || '/';
}

function readBrowserState(value: unknown): BrowserRouterState | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const state = Reflect.get(value, browserStateKey) as BrowserRouterState | undefined;
  return state && typeof state.position === 'number' && typeof state.key === 'string'
    ? state
    : undefined;
}

function mergeBrowserState(userState: unknown, routerState: BrowserRouterState): Record<string, unknown> {
  return {
    ...(userState && typeof userState === 'object' ? userState : {}),
    [browserStateKey]: routerState,
  };
}

function stripBrowserState(value: unknown): HistoryState {
  if (!value || typeof value !== 'object') return Object.freeze({});
  const state = { ...(value as Record<string, unknown>) };
  delete state[browserStateKey];
  return Object.freeze(state);
}

function createHistoryKey(): string {
  return Math.random().toString(36).slice(2, 10);
}
