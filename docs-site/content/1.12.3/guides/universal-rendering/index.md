# Universal rendering

The browser, server, hydration, streaming, and static entry points share the
same public template and component model. Request-local Router, Store,
application, and effect ownership prevents cross-request state reuse.

## First SSR application

Start with the request boundary before reading marker and style transport
details. The server creates request-local data and an application; it sends the
HTML and state carrier; the browser creates the matching application and
hydrates the retained `#app` DOM.

<<< ../../../../examples/first-ssr-app.ts

The labels in the example are ownership boundaries:

| Label | Rule |
| --- | --- |
| shared | Templates and pure component definitions may be imported by both sides. |
| server-only | Request loading, `renderRequest()`, and response assembly run once per request. |
| browser-only | `hydrateApplication()`, `window`, and `document` run after browser boot. |
| per-request | Router, Store, app, effects, and loaded data are created inside `handleRequest()`. |
| application-global | Immutable constants and pure functions are safe; live request state is not. |

Hydration is not a second server render. It compares the browser DOM with the
same application output, restores the transported state, then mounts the live
client runtime. Use `recovery: 'throw'` while diagnosing mismatches so the
first wrong boundary remains visible.

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

Read the [hydration guide](/gluon/1.12.3/reference/hydration/) and
[deployment guide](/gluon/1.12.3/guides/deployment/) for the complete handoff.

## Troubleshoot from the symptom

| Symptom | Likely cause | Diagnostic/check | Minimal fix |
| --- | --- | --- | --- |
| Browser API throws during SSR | Shared code read `window` or `document` | Run the server entry alone and inspect the stack | Move the read to browser-only code or a connection hook. |
| Hydration mismatch | Server and browser inputs differ | Use `recovery: 'throw'` and inspect the first mismatch path | Make data/request inputs deterministic and transport state explicitly. |
| Async boundary stays in fallback | Server boundary was never declared/resolved | Check `Suspense` and `prepareForHydration()` usage | Put the loader in `Suspense({ source })`; choose blocking or progressive policy. |
| Duplicate server/client fetch | Browser starts a request instead of consuming handoff | Inspect the state carrier and client boot order | Prefetch per request or hydrate the resolved boundary before mounting. |
| Shadow DOM is unstyled | Document CSS does not cross a shadow root | Inspect style manifest and adopted sheets | Use component styles and the documented Shadow DOM asset handoff. |

For the async decision itself, continue with [async component data and SSR](../async-ssr/).
