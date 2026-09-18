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

## Tailwind inside Shadow DOM

Tailwind's document stylesheet does not cross a Shadow DOM boundary. Use the
optional `@gluonjs/vite/tailwind` entry with one Tailwind CSS import and pass
the generated Vite asset manifest to SSR. The manifest's `shadowStyles` entries
produce one compact stylesheet link per Declarative Shadow DOM root, rather
than duplicating Tailwind's generated CSS in every template. During hydration,
pass the same entries to `hydrateApplication()` or `hydrateElement()`; Gluon
loads each asset once per document, verifies its digest, then adopts the same
constructed sheet into all participating roots.

Read the [hydration guide](/gluon/1.11.1/reference/hydration/) and
[deployment guide](/gluon/1.11.1/guides/deployment/) for the complete handoff.
