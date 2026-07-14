<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/gluon-hero.jpg" alt="Gluon @gluonjs/test-utils — native UI layers growing from a glowing core" width="100%">
</p>

<h1 align="center">Gluon / <code>@gluonjs/test-utils</code></h1>
<!-- gluon-package-header:end -->

The official Gluon test utilities mount public components and applications in a
real browser without private runtime imports. The package targets Gluon's
currently supported Chromium browser matrix.

## Functional components

```ts
import { afterEach, expect, it } from 'vitest';
import { html } from '@gluonjs/core';
import {
  cleanupFixtures,
  mountComponent,
} from '@gluonjs/test-utils';

afterEach(cleanupFixtures);

it('updates through public props', async () => {
  const fixture = mountComponent(
    ({ count }: Readonly<{ count: number }>) => html`<output>${count}</output>`,
    { props: { count: 1 } },
  );

  expect(fixture.text()).toContain('1');
  await fixture.setProps({ count: 2 });
  expect(fixture.get('output').textContent).toBe('2');
});
```

Every fixture uses `createApp()` and owns a persistent mount container.
Providers, optioned plugins, and an app setup callback can be supplied through
mount options. `renderFixture()` covers complete application templates.

## Custom Elements, slots, and events

`mountElement()` creates a real Custom Element host and accepts initial
properties, attributes, named/default light-DOM slots, and native event
listeners. `emitted(name)` records the original browser events. Cleanup removes
the test-owned listeners and unmounts the application before removing its
generated container.

The same helper consumes constructors registered through
`defineGluonElement()`. Its `properties` type includes inferred structured and
primitive inputs, while exposed setup methods remain callable on
`fixture.element`; disconnecting the fixture stops setup watchers and runs
`onCleanup()` through the ordinary element lifecycle.

Tests query rendered output through native black-box selectors:

- `query(selector)` returns an element or `null`;
- `get(selector)` returns one element or throws a fixture-named diagnostic;
- `text()` returns the fixture container text.

The helpers do not expose renderer Parts, component private state, or private
package paths.

## Cleanup and ownership

`cleanupFixtures()` asynchronously releases all active fixtures in reverse
creation order. `fixture.cleanup()` is the synchronous form for ordinary
resources. `fixture.own(cleanup, label)` attaches external effects, observers,
servers, or listeners to the same ownership record.

`activeFixtureNames()` and `assertNoFixtureLeaks()` identify forgotten fixtures
by name. Because each fixture owns its app root, the diagnostic covers the
components, reactive effects, directives, refs, and listeners below that root.
Cleanup also fails if application/resource cleanup throws or renderer-owned DOM
remains.

`installAutoCleanup(afterEach)` adapts any test runner with an `afterEach`-style
registrar. `assertBeforeCleanup: true` turns a fixture that was not explicitly
cleaned into a failure while still performing cleanup.

## Router, Store, and scheduling

`createRouterFixture()` creates a fresh memory history and Router. Install its
public `plugin` on a fixture and await `ready`. `createStoreFixture()` creates a
fresh testing manager with optional initial state; its plugin disposes that
manager with the application. Neither helper shares module-global router or
store state.

`flushUpdates(callback?)` drains promises and Gluon's `nextTick()` scheduler.
`settle({ cycles, timers })` repeats that boundary and can include one zero-delay
timer turn per cycle for async UI tests.

Server rendering tests use the public `@gluonjs/ssr` package directly. Browser
hydration assertions use `hydrateTemplate()` or `hydrateApplication()` from the
public `@gluonjs/ssr/hydration` entry point; this package does not emulate
marker, mismatch, or recovery behavior privately.

`create-gluon --ui --testing` generates a complete application-level Chromium
test rather than an isolated markup sample. It mounts the real starter owner,
queries the native Button by its app-owned data attribute, checks its accessible
name and computed styles, drives the reactive click update, and verifies exact
sheet cleanup. The UI + SSR selection adds the public hydration path and asserts
retained DOM with no recovery.

## Verification

- `npm run test:test-utils:coverage`
- `npm run typecheck:test-utils-api`
- `npm run build:test-utils`

## License

MIT License, Copyright © 2026 Marc Malerei.
