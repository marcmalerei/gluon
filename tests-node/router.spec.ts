import { describe, expect, it, vi } from 'vitest';
import {
  NavigationFailureType,
  createMemoryHistory,
  createRouter,
  createRouterMatcher,
  isLazyRouteComponent,
  isNavigationFailure,
  lazyRoute,
  parseQuery,
  stringifyQuery,
  type RouteComponent,
} from '../packages/router/src/memory.js';
import {
  createWebHashHistory,
  createWebHistory,
} from '../packages/router/src/history.js';

const view: RouteComponent = () => '';

describe('@gluonjs/router query codec', () => {
  it('parses repeated values, bare keys, spaces, empty values, and malformed escapes', () => {
    expect(parseQuery('?tag=a&tag=b&flag&empty=&space=hello+world&bad=%E0%A4%A')).toEqual({
      tag: ['a', 'b'],
      flag: null,
      empty: '',
      space: 'hello world',
      bad: '%E0%A4%A',
    });
    expect(parseQuery('')).toEqual({});
  });

  it('serializes keys deterministically and omits undefined values', () => {
    expect(stringifyQuery({
      z: undefined,
      tag: ['b', null, undefined, 'a'],
      flag: null,
      count: 2,
      active: true,
      special: "!'()*",
    })).toBe('?active=true&count=2&flag&special=%21%27%28%29%2A&tag=b&tag&tag=a');
  });
});

describe('@gluonjs/router matcher', () => {
  const routes = [
    { path: '/', name: 'home', component: view },
    {
      path: '/users/:id(\\d+)',
      name: 'user',
      component: view,
      alias: '/u/:id(\\d+)',
      meta: { shell: true },
    },
    { path: '/files/:parts*', name: 'files', component: view },
    {
      path: '/account',
      name: 'account',
      alias: '/a',
      meta: { parent: true },
      children: [{
        path: 'settings/:section?',
        name: 'settings',
        component: view,
        meta: { child: true },
      }],
    },
  ] as const;

  it('prioritizes static records and resolves dynamic, custom, repeatable, and optional params', () => {
    const matcher = createRouterMatcher([
      ...routes,
      { path: '/users/new', name: 'new-user', component: view },
    ]);
    expect(matcher.resolvePath('/users/new')?.name).toBe('new-user');
    expect(matcher.resolvePath('/users/42')?.params).toEqual({ id: '42' });
    expect(matcher.resolvePath('/users/not-a-number')).toBeUndefined();
    expect(matcher.resolvePath('/files/a/b')?.params).toEqual({ parts: ['a', 'b'] });
    expect(matcher.resolvePath('/files')?.params).toEqual({});
    expect(matcher.resolvePath('/account/settings')?.params).toEqual({});
  });

  it('resolves names, aliases, nested aliases, metadata chains, and encoded params', () => {
    const matcher = createRouterMatcher(routes);
    expect(matcher.resolveName('user', { id: 7, ignored: 'value' })).toMatchObject({
      name: 'user',
      path: '/users/7',
      params: { id: '7' },
    });
    expect(matcher.resolvePath('/u/8')).toMatchObject({ name: 'user', params: { id: '8' } });
    expect(matcher.resolvePath('/a/settings/profile')?.matched.map((record) => record.name))
      .toEqual(['account', 'settings']);
    expect(matcher.resolveName('settings', { section: 'hello world' }).path)
      .toBe('/account/settings/hello%20world');
  });

  it('rejects invalid named params and route registration conflicts', () => {
    const matcher = createRouterMatcher(routes);
    expect(() => matcher.resolveName('user', {})).toThrow('Missing required route param "id"');
    expect(() => matcher.resolveName('user', { id: 'invalid' })).toThrow('do not match');
    expect(() => matcher.resolveName('home', { value: ['one', 'two'] })).not.toThrow();
    expect(() => matcher.resolveName('unknown')).toThrow('Unknown route name');
    expect(() => createRouterMatcher([
      { path: '/one', name: 'same' },
      { path: '/two', name: 'same' },
    ])).toThrow('Duplicate route name');
    expect(() => matcher.addRoute({ path: 'child' }, 'unknown')).toThrow('Unknown parent route');
  });

  it('adds and recursively removes named records', () => {
    const matcher = createRouterMatcher([]);
    const remove = matcher.addRoute({
      path: '/dynamic',
      name: 'dynamic',
      children: [{ path: 'child', name: 'dynamic-child' }],
    });
    expect(matcher.hasRoute('dynamic-child')).toBe(true);
    expect(matcher.getRoutes()).toHaveLength(2);
    matcher.removeRoute('dynamic');
    expect(matcher.resolvePath('/dynamic/child')).toBeUndefined();
    expect(matcher.hasRoute('dynamic')).toBe(false);
    matcher.removeRoute('missing');
    remove();
  });

  it('handles array aliases, absolute children, required repeats, escaping, and malformed encodings', () => {
    const matcher = createRouterMatcher([
      { path: 'tags/:tags+', name: 'tags', alias: ['/labels/:tags+', '/t/:tags+'] },
      { path: '/optional/:value?', name: 'optional' },
      { path: '/decode/:value', name: 'decode' },
      { path: '/literal.+/' },
      { path: '/choice/:value((foo|bar))/:id', name: 'choice' },
      { path: '/parent', children: [{ path: '/absolute', name: 'absolute' }] },
    ]);
    expect(matcher.resolveName('tags', { tags: ['one', 2] }).path).toBe('/tags/one/2');
    expect(matcher.resolvePath('/labels/a/b')?.params).toEqual({ tags: ['a', 'b'] });
    expect(matcher.resolveName('optional', { value: [] }).path).toBe('/optional');
    expect(matcher.resolvePath('/decode/%E0%A4%A')?.params).toEqual({ value: '%E0%A4%A' });
    expect(matcher.resolvePath('/literal.+')).toBeDefined();
    expect(matcher.resolvePath('/choice/bar/5')?.params).toEqual({ value: 'bar', id: '5' });
    expect(matcher.resolvePath('/absolute')?.name).toBe('absolute');
    expect(() => matcher.resolveName('decode', { value: ['a', 'b'] })).toThrow('not repeatable');
    expect(() => matcher.resolveName('tags', { tags: [] })).toThrow('Missing required');
  });

  it('brands lazy route components explicitly', () => {
    const lazy = lazyRoute(async () => view);
    expect(isLazyRouteComponent(lazy)).toBe(true);
    expect(isLazyRouteComponent(view)).toBe(false);
  });
});

describe('@gluonjs/router memory history', () => {
  it('tracks entries, state, replacement, direction, and saved scroll', () => {
    const history = createMemoryHistory(['/first', '/second']);
    const listener = vi.fn();
    const remove = history.listen(listener);
    expect(history.location).toMatchObject({ location: '/second', position: 1 });
    expect(history.createHref('third')).toBe('/third');
    history.replace('/replaced', { replace: true });
    history.saveScroll({ left: 4, top: 8 });
    history.push('/third', { pushed: true });
    history.go(-1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ location: '/replaced', state: { replace: true } }),
      expect.objectContaining({ location: '/third' }),
      expect.objectContaining({ delta: -1, direction: 'back', savedPosition: { left: 4, top: 8 } }),
    );
    history.go(1);
    expect(listener.mock.calls.at(-1)?.[2]).toMatchObject({ delta: 1, direction: 'forward' });
    history.go(99);
    remove();
    history.go(-1);
    expect(listener).toHaveBeenCalledTimes(2);
    history.destroy();
  });

  it('requires an initial entry and can suppress pop listeners', () => {
    expect(() => createMemoryHistory([])).toThrow('at least one entry');
    const history = createMemoryHistory(['/one', '/two']);
    const listener = vi.fn();
    history.listen(listener);
    history.go(-1, false);
    expect(history.location.location).toBe('/one');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('@gluonjs/router browser histories', () => {
  it('manages web URLs, user state, scroll, pop navigation, bases, and teardown', () => {
    const target = new FakeWindow('https://example.test/base/start?x=1#details');
    const history = createWebHistory('/base/', target as unknown as Window);
    expect(history.base).toBe('/base');
    expect(history.location).toMatchObject({ location: '/start?x=1#details', state: {} });
    expect(history.createHref('next')).toBe('/base/next');

    const listener = vi.fn();
    const remove = history.listen(listener);
    history.saveScroll({ left: 5, top: 9 });
    history.push('/next', { source: 'push' });
    expect(target.location.pathname).toBe('/base/next');
    expect(history.location).toMatchObject({ location: '/next', state: { source: 'push' } });
    history.replace('/final?ok=yes', { source: 'replace' });
    expect(target.location.search).toBe('?ok=yes');
    target.scrollX = 12;
    target.scrollY = 18;
    target.dispatchEvent(new Event('scroll'));
    history.go(-1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ location: '/start?x=1#details' }),
      expect.objectContaining({ location: '/final?ok=yes', state: { source: 'replace' } }),
      expect.objectContaining({ direction: 'back', delta: -1, savedPosition: { left: 5, top: 9 } }),
    );
    history.go(1, false);
    expect(listener).toHaveBeenCalledOnce();
    history.go(-1);
    history.go(1);
    expect(listener.mock.calls.at(-1)?.[2]).toMatchObject({ savedPosition: { left: 12, top: 18 } });
    remove();
    history.go(-1);
    expect(listener).toHaveBeenCalledTimes(3);
    history.destroy();
  });

  it('manages hash URLs and preserves an existing valid router state', () => {
    const target = new FakeWindow('https://example.test/app#/inside?x=1');
    const first = createWebHashHistory('app/', target as unknown as Window);
    expect(first.base).toBe('/app');
    expect(first.location.location).toBe('/inside?x=1');
    expect(first.createHref('/next')).toBe('/app#/next');
    first.push('/next');
    expect(target.location.hash).toBe('#/next');
    first.destroy();

    const second = createWebHashHistory('/app', target as unknown as Window);
    expect(second.location.position).toBe(1);
    second.replace('/');
    expect(target.location.href).toBe('https://example.test/app#/');
    second.destroy();
  });

  it('handles root bases, base-only paths, and pop entries without router metadata', () => {
    const target = new FakeWindow('https://example.test/base?x=1#details');
    const based = createWebHistory('/base', target as unknown as Window);
    expect(based.location.location).toBe('/?x=1#details');
    based.destroy();

    const rootTarget = new FakeWindow('https://example.test/start');
    const root = createWebHistory('/', rootTarget as unknown as Window);
    expect(root.createHref('/')).toBe('/');
    root.push('/next');
    rootTarget.history.replaceState({ external: true }, '', '/external');
    const listener = vi.fn();
    root.listen(listener);
    root.go(-1);
    root.go(1);
    expect(listener.mock.calls.at(-1)?.[2]).toMatchObject({ direction: 'unknown', delta: 0 });
    expect(root.location.state).toEqual({ external: true });
    root.destroy();
  });
});

describe('@gluonjs/router navigation', () => {
  it('initializes from history and normalizes query, hash, meta, state, and href', async () => {
    const history = createMemoryHistory(['/parent/child/hello?z=2&a=1#details']);
    const router = createRouter({
      history,
      routes: [{
        path: '/parent',
        meta: { layout: 'app', shared: 'parent' },
        children: [{
          path: 'child/:slug',
          name: 'child',
          component: view,
          meta: { shared: 'child' },
        }],
      }],
    });
    expect(router.currentRoute.value).toMatchObject({ path: '/', fullPath: '/', href: '/' });
    await router.isReady();
    expect(router.currentRoute.value).toMatchObject({
      name: 'child',
      path: '/parent/child/hello',
      fullPath: '/parent/child/hello?a=1&z=2#details',
      href: '/parent/child/hello?a=1&z=2#details',
      params: { slug: 'hello' },
      query: { a: '1', z: '2' },
      hash: '#details',
      meta: { layout: 'app', shared: 'child' },
    });
    expect(router.getRouteComponent(router.currentRoute.value.matched[1]!)).toBe(view);
    router.destroy();
  });

  it('supports push, replace, named routes, duplicate failures, and back/forward', async () => {
    const history = createMemoryHistory();
    const afterEach = vi.fn();
    const router = createRouter({
      history,
      routes: [
        { path: '/', name: 'home' },
        { path: '/user/:id', name: 'user' },
        { path: '/other', name: 'other' },
      ],
    });
    router.afterEach(afterEach);
    await router.isReady();
    await router.push({ name: 'user', params: { id: 2 }, query: { b: 2, a: 1 }, state: { source: 'test' } });
    expect(history.location).toMatchObject({
      location: '/user/2?a=1&b=2',
      state: { source: 'test' },
    });
    await router.replace('/other');
    const duplicate = await router.push('/other');
    expect(isNavigationFailure(duplicate, NavigationFailureType.duplicated)).toBe(true);
    router.back();
    await waitForNavigation();
    expect(router.currentRoute.value.fullPath).toBe('/');
    router.forward();
    await waitForNavigation();
    expect(router.currentRoute.value.fullPath).toBe('/other');
    expect(afterEach).toHaveBeenCalled();
    router.destroy();
  });

  it('runs global and record guards, redirects, exposes failures, and removes hooks', async () => {
    const order: string[] = [];
    const history = createMemoryHistory();
    const router = createRouter({
      history,
      routes: [
        { path: '/', name: 'home' },
        { path: '/login', name: 'login' },
        { path: '/legacy', redirect: { name: 'login', params: {} } },
        { path: '/blocked', beforeEnter: () => false },
        {
          path: '/secure',
          beforeEnter: [
            () => { order.push('record'); },
            () => ({ name: 'login', params: {} }),
          ],
        },
      ],
    });
    const removeBefore = router.beforeEach((to) => {
      order.push(`before:${to.path}`);
    });
    const removeResolve = router.beforeResolve(() => { order.push('resolve'); });
    const after = vi.fn();
    const removeAfter = router.afterEach(after);
    await router.isReady();

    const blocked = await router.push('/blocked');
    expect(isNavigationFailure(blocked, NavigationFailureType.aborted)).toBe(true);
    expect(router.currentRoute.value.path).toBe('/');
    await router.push('/legacy');
    expect(router.currentRoute.value).toMatchObject({ path: '/login' });
    expect(router.currentRoute.value.redirectedFrom?.path).toBe('/legacy');
    await router.push('/secure');
    expect(router.currentRoute.value.path).toBe('/login');
    expect(order).toContain('record');
    expect(after).toHaveBeenCalledWith(expect.anything(), expect.anything(), blocked);

    removeBefore();
    removeResolve();
    removeAfter();
    await router.push('/');
    expect(after.mock.calls.length).toBeGreaterThan(0);
    router.destroy();
  });

  it('cancels superseded asynchronous navigation', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/' }, { path: '/slow' }, { path: '/fast' }],
    });
    const after = vi.fn();
    router.afterEach(after);
    router.beforeEach(async (to) => {
      if (to.path === '/slow') await pending;
    });
    await router.isReady();
    const slow = router.push('/slow');
    await Promise.resolve();
    const fast = router.push('/fast');
    release();
    const cancelled = await slow;
    expect(isNavigationFailure(cancelled, NavigationFailureType.cancelled)).toBe(true);
    expect(await fast).toBeUndefined();
    expect(router.currentRoute.value.path).toBe('/fast');
    expect(after).toHaveBeenCalledWith(expect.anything(), expect.anything(), cancelled);
    router.destroy();
  });

  it('loads explicit lazy routes once and reports loader errors', async () => {
    const component = vi.fn(() => 'lazy');
    const loader = vi.fn(async () => ({ default: component }));
    const failingLoader = vi.fn(async () => { throw new Error('chunk failed'); });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/' },
        { path: '/lazy', name: 'lazy', component: lazyRoute(loader) },
        { path: '/failure', component: lazyRoute(failingLoader) },
      ],
    });
    const onError = vi.fn();
    const removeError = router.onError(onError);
    await router.isReady();
    await router.push('/lazy');
    const record = router.currentRoute.value.matched[0]!;
    expect(router.getRouteComponent(record)).toBe(component);
    await router.push('/');
    await router.push('/lazy');
    expect(loader).toHaveBeenCalledOnce();
    await expect(router.push('/failure')).rejects.toThrow('chunk failed');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'chunk failed' }));
    removeError();
    router.destroy();
  });

  it('clears failed lazy loads so a later navigation can retry', async () => {
    let attempt = 0;
    const loader = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('temporary chunk failure');
      return view;
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/' }, { path: '/retry', component: lazyRoute(loader) }],
    });
    await router.isReady();
    await expect(router.push('/retry')).rejects.toThrow('temporary chunk failure');
    await expect(router.push('/retry')).resolves.toBeUndefined();
    expect(loader).toHaveBeenCalledTimes(2);
    router.destroy();
  });

  it('shares pending lazy loads and supports functional redirects and direct component modules', async () => {
    let release!: (component: RouteComponent) => void;
    const pending = new Promise<RouteComponent>((resolve) => { release = resolve; });
    const loader = vi.fn(() => pending);
    const direct = vi.fn(() => 'direct');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/' },
        { path: '/pending', component: lazyRoute(loader) },
        { path: '/direct', component: lazyRoute(async () => direct) },
        { path: '/function', redirect: () => '/direct' },
      ],
    });
    await router.isReady();
    const first = router.push('/pending');
    await Promise.resolve();
    const second = router.push('/pending');
    release(view);
    expect(isNavigationFailure(await first, NavigationFailureType.cancelled)).toBe(true);
    expect(await second).toBeUndefined();
    expect(loader).toHaveBeenCalledOnce();
    await router.push('/function');
    expect(router.currentRoute.value.path).toBe('/direct');
    expect(router.getRouteComponent(router.currentRoute.value.matched[0]!)).toBe(direct);
    router.destroy();
  });

  it('applies beforeResolve redirects, aborts, and cancellation failures', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const history = createMemoryHistory();
    const router = createRouter({
      history,
      routes: [
        { path: '/' },
        { path: '/redirect' },
        { path: '/target' },
        { path: '/blocked' },
        { path: '/slow' },
      ],
    });
    router.beforeResolve(async (to) => {
      if (to.path === '/redirect') return '/target';
      if (to.path === '/blocked') return false;
      if (to.path === '/slow') await pending;
    });
    await router.isReady();
    await router.push('/redirect');
    expect(router.currentRoute.value.path).toBe('/target');
    const blocked = await router.push('/blocked');
    expect(isNavigationFailure(blocked, NavigationFailureType.aborted)).toBe(true);
    const slow = router.push('/slow');
    await Promise.resolve();
    const fast = router.push('/');
    release();
    expect(isNavigationFailure(await slow, NavigationFailureType.cancelled)).toBe(true);
    await fast;
    router.destroy();
  });

  it('rolls back aborted pop navigation and resolves unmatched and object locations', async () => {
    const history = createMemoryHistory();
    const router = createRouter({
      history,
      routes: [{ path: '/' }, { path: '/allowed' }],
      scrollBehavior: () => false,
    });
    await router.isReady();
    await router.push('/allowed');
    router.beforeEach((to) => to.path === '/' ? false : undefined);
    router.back();
    await waitForNavigation();
    expect(history.location.location).toBe('/allowed');
    expect(router.currentRoute.value.path).toBe('/allowed');
    expect(router.resolve('unmatched').matched).toEqual([]);
    expect(router.resolve({ path: 'unmatched?old=1#old', query: { next: 2 }, hash: 'new', state: { ok: true } }))
      .toMatchObject({ fullPath: '/unmatched?next=2#new', state: { ok: true } });
    expect(router.getRouteComponent(router.currentRoute.value.matched[0]!, 'missing')).toBeUndefined();
    expect(isNavigationFailure(new Error('plain'))).toBe(false);
    router.destroy();
  });

  it('replaces popstate record and guard redirects at the traversed position', async () => {
    const history = createMemoryHistory();
    const router = createRouter({
      history,
      routes: [
        { path: '/' },
        { path: '/legacy', redirect: '/target' },
        { path: '/guarded' },
        { path: '/target' },
      ],
    });
    router.beforeEach((to) => to.path === '/guarded' ? '/target' : undefined);
    await router.isReady();

    history.push('/legacy');
    history.go(-1);
    await waitForNavigation();
    history.go(1);
    await waitForNavigation();
    expect(history.location.location).toBe('/target');
    expect(router.currentRoute.value.path).toBe('/target');

    history.push('/guarded');
    history.go(-1);
    await waitForNavigation();
    history.go(1);
    await waitForNavigation();
    expect(history.location.location).toBe('/target');
    expect(router.currentRoute.value.path).toBe('/target');
    router.destroy();
  });

  it('rejects readiness on an initial route failure and limits redirect loops', async () => {
    const router = createRouter({
      history: createMemoryHistory(['/failure']),
      routes: [{
        path: '/failure',
        component: lazyRoute(async () => { throw new Error('initial chunk failed'); }),
      }],
    });
    await expect(router.isReady()).rejects.toThrow('initial chunk failed');
    router.destroy();

    const looping = createRouter({
      history: createMemoryHistory(['/']),
      routes: [{ path: '/', redirect: '/' }],
    });
    await expect(looping.isReady()).rejects.toThrow('redirect limit');
    looping.destroy();
  });

  it('supports route registration, snapshots, hydration, scroll behavior, and teardown', async () => {
    const originalScrollTo = globalThis.scrollTo;
    const scrollTo = vi.fn();
    Object.assign(globalThis, { scrollX: 3, scrollY: 6, scrollTo });
    const history = createMemoryHistory();
    const scrollBehavior = vi.fn((_to, _from, saved) => saved ?? { left: 0, top: 10 });
    const router = createRouter({ history, routes: [{ path: '/' }], scrollBehavior });
    await router.isReady();
    const remove = router.addRoute({ path: '/added', name: 'added' });
    expect(router.hasRoute('added')).toBe(true);
    await router.push('/added');
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 10 });
    const snapshot = router.dehydrate();
    await router.push('/');
    await router.hydrate(snapshot);
    expect(router.currentRoute.value.path).toBe('/added');
    remove();
    expect(router.hasRoute('added')).toBe(false);
    router.removeRoute('missing');
    expect(router.getRoutes()).toHaveLength(1);
    router.go(0);
    router.destroy();
    router.destroy();
    await expect(router.push('/')).rejects.toThrow('destroyed router');
    Object.assign(globalThis, { scrollTo: originalScrollTo });
  });
});

async function waitForNavigation(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

interface FakeEntry {
  readonly url: URL;
  readonly state: unknown;
}

class FakeHistory {
  private entries: FakeEntry[];
  private index = 0;

  constructor(private readonly owner: FakeWindow, url: URL) {
    this.entries = [{ url, state: null }];
  }

  get length(): number {
    return this.entries.length;
  }

  get state(): unknown {
    return this.entries[this.index]!.state;
  }

  pushState(state: unknown, _unused: string, url?: string | URL | null): void {
    const next = this.resolve(url);
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push({ url: next, state });
    this.index += 1;
    this.owner.location = next;
  }

  replaceState(state: unknown, _unused: string, url?: string | URL | null): void {
    const next = this.resolve(url);
    this.entries[this.index] = { url: next, state };
    this.owner.location = next;
  }

  go(delta = 0): void {
    const target = Math.min(this.entries.length - 1, Math.max(0, this.index + delta));
    if (target === this.index) return;
    this.index = target;
    const entry = this.entries[this.index]!;
    this.owner.location = entry.url;
    this.owner.dispatchEvent(new Event('popstate'));
  }

  private resolve(url: string | URL | null | undefined): URL {
    return url == null ? this.owner.location : new URL(String(url), this.owner.location);
  }
}

class FakeWindow extends EventTarget {
  location: URL;
  readonly history: FakeHistory;
  scrollX = 0;
  scrollY = 0;

  constructor(url: string) {
    super();
    this.location = new URL(url);
    this.history = new FakeHistory(this, this.location);
  }
}
