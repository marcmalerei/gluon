# Application runtime contract

`createApp()` adds application-scoped ownership around Gluon's renderer and
Custom Elements without creating a second managed component-instance model.
Stateful components remain `GluonElement` instances; functional components
remain render functions.

## Create, configure, and mount

```ts
import {
  createApp,
  createInjectionKey,
  dynamicComponent,
  html,
  inject,
} from '@gluonjs/core';
import { reactive } from '@gluonjs/reactivity';

const storeKey = createInjectionKey<{ count: number }>('counter');

const app = createApp<{ increment(): void }>((context) => {
  const store = inject(storeKey);
  context.expose({ increment: () => { store.count += 1; } });
  return html`<main>${dynamicComponent('counter', store)}</main>`;
});

app.provide(storeKey, reactive({ count: 0 }));
app.component<{ count: number }>('counter', ({ count }) => html`
  <output>${count}</output>
`);
app.config.globalProperties.locale = 'en';

const mount = app.mount(document.querySelector('#app')!);
mount.exposed?.increment();
mount.unmount();
```

The mount container is a persistent `Element` or `ShadowRoot`. A plain
`DocumentFragment` is rejected: inserting it into another node drains its
children, so it cannot continue owning renderer state, application context, or
later reactive updates.

An application has three states: created, mounted, and unmounted. Plugins,
providers, functional component registrations, and application hooks are
registered while created. One application mounts once. A container can own one
application at a time and becomes available to another application after
unmount.

The root is a `TemplateResult` or a function returning one. Root functions run
inside an application-owned effect scope and update-phase reactive effect.
Reactive values read by the root therefore invalidate only that application.

## Per-application isolation

Every application owns independent instances of:

- its plugin installation set and reverse-order cleanup stack;
- its typed provider map;
- its named functional component registry;
- `config.errorHandler`, `config.warnHandler`, and `config.globalProperties`;
- its root effect scope, renderer root, lifecycle hooks, and public exposure.

`createInjectionKey<Value>()` preserves the provided value type. `inject()` is
valid while an application root, functional component, element update, event,
or lifecycle callback owns the active context. A fallback is returned only when
one is supplied; otherwise a missing injection throws a deterministic error.
Reactive stores are ordinary provided values until the official store package
in issue #26 adds its higher-level contract.

`app.use(plugin, options)` installs each plugin identity once. A synchronous
cleanup function returned by `install` runs during unmount in reverse install
order. Repeated installation warns with `GLUON_PLUGIN_DUPLICATE`. Plugin errors
use the owning application's error handler.

`dynamicComponent(component, props)` accepts a functional component directly
or resolves a name from the current application's registry. Missing named
components render no child and warn with `GLUON_COMPONENT_MISSING`. Custom
Elements remain explicitly registered through `defineElement`; the application
registry does not replace the platform's document-wide `CustomElementRegistry`.

## Mount and unmount ordering

Mount performs these steps:

1. claim and register the container's application context;
2. create the detached application effect scope and lazy root effect;
3. synchronously perform the initial root render;
4. run `app.onMounted` callbacks after the first successful commit.

Unmount is idempotent after a successful mount and performs:

1. mark the application unmounted and stop/invalidate its effect scope;
2. permanently unmount renderer bindings and clear the container;
3. run `app.onUnmounted` callbacks in registration order;
4. run plugin cleanups in reverse installation order;
5. release the container registration, public exposure, providers, and
   functional component registry.

Queued root effects cannot execute after unmount. Renderer unmount releases
directives, native event listeners, and refs. Scope stopping continues through
all owned effects even if one `onStop` hook fails; the failure enters the
scope/application cleanup error channel. A failing renderer cleanup likewise
enters that channel without skipping application hooks or plugin cleanups.

## Component lifecycle

`GluonElement` subclasses register connection lifecycle callbacks with the
protected methods below, normally in their constructor:

- `onConnected`: after the first successful render of each connection;
- `onBeforeUpdate`: before every later render in that connection;
- `onUpdated`: after every successful initial or later render;
- `onDisconnected`: after scope cleanup and renderer suspension;
- `onErrorCaptured`: capture descendant component errors.

Connection order is `render → onConnected → onUpdated`. Later updates use
`onBeforeUpdate → render → onUpdated`. Disconnect stops the connection scope,
suspends DOM resources, then runs `onDisconnected`. Reconnection creates a new
scope, retains state and matching DOM, and begins again with the connection
order. Promise rejections returned by lifecycle callbacks are routed as
`lifecycle` errors.

Effects, watchers, and `onScopeDispose()` registrations created while an
element update executes belong to that connection scope. Resource creation must
still be guarded against accidental duplication on every render.

## Errors, warnings, and boundaries

Application error information includes the app, thrown value, source, and
optional originating element. Sources are `application`, `render`, `effect`,
`event`, `async`, `lifecycle`, and `plugin`.

Element render effects and scope-owned effects/watchers route through the
closest ancestor `onErrorCaptured` handler. Returning `true` marks the error
handled. Otherwise it reaches the owning `app.config.errorHandler`; standalone
components use the Reactivity/platform fallback. A boundary failure itself
reaches the application handler as an `application` error.

Event listeners created during app or element rendering are automatically
wrapped while preserving listener identity, native `this`, objects with
`handleEvent`, and removal options. Synchronous throws use source `event` and a
returned promise rejection uses `async`.

`app.run(callback)` binds manually started synchronous or asynchronous work to
one application. `runWithErrorHandling(callback)` binds work to the currently
active application/element owner. Arbitrary work started later without either
owner cannot be attributed automatically and uses the platform fallback.

Warnings use the current application's `warnHandler`; `warn(message, code)` is
the public manual entry point. Warning-handler failures enter the application
error channel rather than changing the caller's control flow.

## Controlled public exposure

An application root exposes only the value passed to `context.expose`; the
mount handle never returns internal application state. An element subclass can
likewise call protected `expose(value)`, and consumers retrieve only that value
with the explicitly typed `getPublicInstance<Public>(element)` helper. Exposure
objects are frozen at the boundary. The application mount exposure is cleared
when that application unmounts; element exposure remains attached to the element
across its documented reconnect lifecycle.
