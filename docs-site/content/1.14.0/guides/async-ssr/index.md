# Async component data and SSR

Async work can happen while Gluon renders on the server, but the async boundary
must be explicit. Put the request in `Suspense({ source })`; do not start a
request from a module-global variable or an untracked render side effect.

## One component, two server policies

<<< ../../../../examples/async-ssr.ts

`prepareForHydration()` resolves the declared boundary, then serializes the
same prepared value for the browser to hydrate. `renderProgressively()` emits a
fallback shell first and later boundary chunks. Both APIs propagate an abort
signal to the source. The browser-only `Suspense` path can instead show its
fallback immediately and resolve after the page is interactive.

| Need | Boundary | What the user receives |
| --- | --- | --- |
| Browser-only loading | `Suspense()` in the browser app | Fallback first, then resolved content. |
| Blocking SSR | `prepareForHydration()` | Server waits, sends resolved HTML, browser hydrates it. |
| Progressive SSR | `renderProgressively()` | Server sends fallback shell, then ordered boundary chunks. |
| Page prefetch | `renderRequest({ load })` | Request-local data is loaded before app creation. |
| Component-owned loading | `Suspense({ source, fallback, error })` | The component owns pending, error, retry, and cancellation UI. |

The source receives `{ signal, attempt }`. A timeout or disconnect aborts the
request. A retry starts a new attempt, and a cancelled result cannot update the
old render part.

## Common mistakes

- Do not fetch at module scope: concurrent requests would share the result.
- Do not pass an already-settled promise when retry or cancellation is needed;
  pass a loader function.
- Do not call browser APIs in the server source. Keep browser-only work in the
  hydrated application or behind a browser check.
- Do not confuse page prefetching with component-owned loading. `renderRequest`
  owns request data; `Suspense` owns a visible component boundary.

The [async rendering reference](https://github.com/marcmalerei/gluon/blob/main/docs/async-ui.md)
contains the complete built-in contract. The [universal rendering guide](../universal-rendering/)
shows how the request result reaches the browser.
