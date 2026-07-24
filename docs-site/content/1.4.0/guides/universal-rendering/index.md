# Universal rendering

The browser, server, hydration, streaming, and static entry points share the
same public template and component model. Request-local Router, Store,
application, and effect ownership prevents cross-request state reuse.

## Render safe HTML and state

<<< ../../../../examples/universal-rendering.ts

`renderToString()` escapes ordinary child and attribute values. State transport
accepts finite JSON values and escapes HTML-significant characters. Dynamic raw
HTML and unsafe URLs require visibly unsafe APIs and reviewed inputs.

## Hydration and static output

The server emits deterministic hydration markers and validated style carriers.
The browser restores Router and Store snapshots before `hydrateApplication()`.
Static generation prerenders explicit public URLs and records dynamic fallbacks
without forking application modules.

Read the [hydration guide](/gluon/1.4.0/reference/hydration/) and
[deployment guide](/gluon/1.4.0/guides/deployment/) for the complete handoff.
