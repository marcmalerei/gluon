<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/gluon-hero.jpg" alt="Gluon @gluonjs/ssr — native UI layers growing from a glowing core" width="100%">
</p>

<h1 align="center">Gluon / <code>@gluonjs/ssr</code></h1>
<!-- gluon-package-header:end -->

The official DOM-independent Gluon server renderer consumes the same public
`html`, functional component, application, Store, Router, async built-in, and
registered `GluonElement` definitions used by the browser.

Definitions created by `defineGluonElement()` use the same registered-class
path. Server rendering runs setup in a request-local effect scope, derives the
ShadowRoot template, and stops the scope without browser connection lifecycle.
Streaming and SSG consume that template unchanged; hydration reruns setup under
the browser connection owner and binds the declarative ShadowRoot through the
normal element hydrator.

```ts
import { createApp, html } from '@gluonjs/core';
import { renderRequest } from '@gluonjs/ssr';

const response = await renderRequest({
  url: '/products/orbit-lamp',
  routes,
  createApp: ({ router, store }) => createApp(() =>
    html`<main>${router.currentRoute.value.path} ${store.dehydrate().version}</main>`,
  ),
});
```

Every `renderRequest()` call owns a memory Router, Store manager, application,
and detached effect scope. All resources are disposed in `finally`, including
failed and concurrent renders. Browser mount, connection, update, disconnect,
and event/directive hooks do not run.

`renderToString()` escapes child and attribute data, rejects unsafe URL
protocols, omits event bindings, resolves async built-in server contracts, and
honors explicit `unsafeHTML()`/`unsafeURL()` values. `renderElement()` emits open
Declarative Shadow DOM for a class registered through `defineElement()`. Its
deterministic comment and temporary `data-gluon-h-*` markers let
`@gluonjs/ssr/hydration` reconstruct client bindings without replacing matching
nodes. `renderRequest()` derives exact component-style IDs from the resolved
request tree and merges them between shared UI and application-owned sheets.
Style manifests use deterministic IDs and ordered CSS text for initial carriers
and browser handoff.

`serializeSsrState()` accepts finite JSON data made from plain objects and
arrays and escapes HTML-significant characters plus U+2028/U+2029. The request
result includes the serialized value and a safe `data-gluon-state` script.

`hydrateTemplate()`, `hydrateApplication()`, and `hydrateElement()` validate
server DOM before binding events, refs, application context, and reactive
updates. Diagnostics distinguish text, attribute, structure, state, and style
mismatches. The default recovery replaces the root once; `recovery: 'throw'`
aborts without mutation. Suppressed categories remain recorded but do not call
the diagnostic callback.

`@gluonjs/ssr/streaming` exposes ordered chunks, byte `ReadableStream`s, and
progressive rendering. Shell and boundary records include newly required exact
component styles, and the stream writes their carriers before dependent HTML.
Resolved nested boundaries arrive as inert patch records or templates. An external `AbortSignal` cancels
pending response work and reaches async sources.

`createStyleManifest()` accepts either an ordered sheet array or Core's named
`StyleSheetSelection`. Named entries retain their public ID and optional scope
in the carrier, so `@gluonjs/atoms` can serialize
`createUiStyleSelection(theme)` and validate the exact selection during browser
installation without a second hand-maintained manifest.

`@gluonjs/ssr/static` prerenders explicit route URLs and records dynamic
fallbacks without rewriting components. `renderRequest()` can receive the Vite
asset manifest, document styles, and a request nonce; its `head` contains
resource hints, the module entry, and temporary style carriers. Hydration
validates component carrier count, identity, order, digest, content, and target,
then lets the renderer adopt exact client sheet objects before removing
carriers. Component sheets release with the hydrated render owner.

The maintained `create-gluon --ui --ssr` application composes these ownership
paths without a second aggregate manifest: `createUiStyleSelection()` supplies
the shared carriers, request rendering derives the exact Button carrier, and a
named application selection supplies the starter sheet. On the client,
`installUi({ hydrate: true })` consumes the shared carriers before
`hydrateApplication()` validates the application selection and usage-derived
Button sheet. Its generated browser test requires retained DOM, zero mismatches,
`recovered: false`, one instance of each exact sheet, and release on unmount.

## License

MIT License, Copyright © 2026 Marc Malerei.
