# `@gluonjs/router`

The official Gluon router provides deterministic route matching, browser/hash/
memory histories, typed named routes, guards, failures, lazy route components,
scroll restoration, and Gluon application bindings.

The package is part of the lockstep Gluon `1.0.2` release line. Core and
Reactivity are peers so an application has one shared application context and
reactive identity.

## Browser application

```ts
import { createApp, html } from '@gluonjs/core';
import {
  RouterLink,
  RouterView,
  createRouter,
  createRouterPlugin,
  createWebHistory,
  lazyRoute,
} from '@gluonjs/router';

const router = createRouter({
  history: createWebHistory('/app'),
  routes: [
    { path: '/', name: 'home', component: () => html`<h1>Home</h1>` },
    {
      path: '/reports/:id',
      name: 'report',
      component: lazyRoute(() => import('./report-page.js')),
    },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { left: 0, top: 0 },
});

await router.isReady();

const app = createApp(() => html`
  ${RouterLink({ to: '/', children: 'Home' })}
  ${RouterView()}
`);
app.use(createRouterPlugin(router));
app.mount(document.querySelector('#app')!);
```

`RouterLink` intercepts unmodified same-context clicks and exposes active and
exact-active classes. `RouterView({ depth, name })` selects nested and named
route components. Unmounting the application destroys the installed router.

## Typed named routes

```ts
type Routes = {
  home: { params: {} };
  report: { params: { id: string | number } };
};

const typedRouter = createRouter<Routes>({ history, routes });
await typedRouter.push({ name: 'report', params: { id: 42 } });
```

Path params are encoded on generation and decoded on matching. Query keys are
sorted during serialization; repeated values retain their input order.
Prototype-like decoded keys remain frozen own data and never participate in
the parser accumulator's prototype chain.

## Navigation control

`beforeEach`, record `beforeEnter`, and `beforeResolve` run in that order.
Returning `false` aborts navigation; returning a location redirects it. `push`
and `replace` resolve with an `aborted`, `cancelled`, or `duplicated`
`NavigationFailure` when applicable. Loader and hook errors reject navigation
and are forwarded to `onError` handlers.

Lazy routes must use `lazyRoute(() => import(...))`. The explicit wrapper keeps
ordinary functional components unambiguous and preserves production code
splitting.

## Memory and server use

Import `@gluonjs/router/memory` in Node, tests, or server rendering code. This
entry point has no browser-history or Gluon UI binding export.

```ts
import { createMemoryHistory, createRouter } from '@gluonjs/router/memory';

const router = createRouter({
  history: createMemoryHistory(['/reports/42?print=true']),
  routes,
});
await router.isReady();

const snapshot = router.dehydrate();
await browserRouter.hydrate(snapshot);
```

See the repository [router contract](../../docs/router.md) for route syntax,
history ownership, SSR handoff, failure, and scroll behavior.

## License

MIT License, Copyright © 2026 Marc Malerei.
