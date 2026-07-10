# Router contract

`@gluonjs/router` is the official application router. It depends on Core and
Reactivity, but Core does not depend on it. `@gluonjs/router/memory` is the
DOM-free entry point for Node, server resolution, and unit tests.

## Route records

Records support static segments, `:param` segments, custom patterns such as
`:id(\\d+)`, optional `?`, repeatable `+`/`*`, names, nested children, aliases,
redirects, metadata, default/named components, and `beforeEnter` guards.
Static records outrank dynamic records. Named generation rejects missing,
non-repeatable, or custom-pattern-invalid parameters. Matching decodes path
parameters without throwing on malformed external escapes.

Aliases reuse the same normalized record and component identity. A redirect
belongs to the terminal record selected for the complete path; it does not
cascade from a layout parent into every child. Redirects retain
`redirectedFrom` and stop with an error after 20 records, preventing unbounded
loops. Runtime `addRoute` returns a recursive removal callback.

## Locations and queries

A location is a URL string, a `{ path, query, hash, state }` object, or a named
location with params. `RouteNamedMap` constrains names and params at compile
time. Query serialization sorts keys, retains array order, omits `undefined`,
and represents `null` as a bare key. Parsing preserves repeated and empty
values and treats `+` as a space.

`resolve()` is side-effect free. `push()` adds an entry and `replace()` updates
the current entry only after guards and lazy components succeed.

## Navigation pipeline and failures

Navigation runs:

1. location and record redirects;
2. global `beforeEach` and record `beforeEnter` guards;
3. lazy route component loading;
4. global `beforeResolve` guards;
5. history commit, reactive route update, scroll behavior, and `afterEach`.

Returning `false` from a guard creates an `aborted` failure. Starting another
navigation creates a `cancelled` failure for the superseded operation. Repeating
the current full location creates a `duplicated` failure. These values are
recognized with `isNavigationFailure`. Thrown guard and loader errors reject and
are forwarded to registered `onError` handlers.

Back/forward navigations are rolled back when a guard aborts. History user state
is kept separate from internal position, key, and scroll metadata.

## Histories and scrolling

- `createWebHistory(base)` uses pathname URLs and requires the deployment server
  to fall back deep-link requests to the SPA document.
- `createWebHashHistory(base)` keeps the application location after `#`.
- `createMemoryHistory(entries)` is deterministic and does not read a DOM global.

Before a push, replace, or programmatic traversal, the router asks the history
to store the current window coordinates. Browser history also records native
scroll events so browser-button traversal retains source positions.
`scrollBehavior(to, from, saved)` may return a position, `false`, or nothing. A
saved back/forward position is passed as its third argument.

## Gluon application bindings

`createRouterPlugin(router)` provides the router, exposes `$router` and the
current `$route` through app globals, and destroys the router on application
unmount. `useRouter()` and `useRoute()` read that isolated app context.

`RouterLink()` emits a native anchor with resolved `href`, accessibility state,
and configurable active classes. Modified, targeted, or download clicks retain
native browser behavior. `RouterView()` renders the selected depth and named
component, or its fallback when no component matches.

## Lazy builds and server handoff

Lazy records use `lazyRoute(() => import('./page.js'))`; ordinary functions are
always treated as synchronous components. The production fixture verifies that
Vite emits the imported page as a separate chunk.

For server resolution, create the router with memory history and await
`isReady()`. `dehydrate()` returns the normalized location. The browser router
uses `hydrate(snapshot)` to replace its initial location through the same guard
and loader pipeline. DOM hydration itself belongs to the later SSR package.
