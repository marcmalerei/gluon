# `@gluonjs/ssr`

The official DOM-independent Gluon server renderer consumes the same public
`html`, functional component, application, Store, Router, async built-in, and
registered `GluonElement` definitions used by the browser.

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
Declarative Shadow DOM for a class registered through `defineElement()`.
Stylesheet carriers and manifests are delivered by issue #37.

`serializeSsrState()` accepts finite JSON data made from plain objects and
arrays and escapes HTML-significant characters plus U+2028/U+2029. The request
result includes the serialized value and a safe `data-gluon-state` script.

`@gluonjs/ssr/streaming` exposes an ordered async chunk iterator and a byte
`ReadableStream`. Incremental async-boundary streaming is intentionally owned
by issue #36.

## License

MIT License, Copyright © 2026 Marc Malerei.
