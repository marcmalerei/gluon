# Async UI and rendering built-ins

Gluon Core provides async boundaries, lazy functional components, application-
owned teleports, cached views, and cancellable transitions. All visible
built-ins return ordinary `TemplateValue` values and participate in renderer
cleanup.

## Suspense

`Suspense()` owns one abort controller and monotonically increasing attempt for
each rendered Part. A source is either a promise or a loader receiving
`{ signal, attempt }`:

```ts
const inventory = Suspense({
  source: ({ signal }) => loadInventory(productId, signal),
  fallback: html`<p>Checking inventory…</p>`,
  delay: 50,
  timeout: 2_000,
  children: (result) => html`<p>${result.label}</p>`,
  error: (error, retry) => html`
    <p>${String(error)}</p>
    <button @click=${retry}>Retry</button>
  `,
});
```

- `fallback` is explicit and may contain another `Suspense()` boundary.
- `delay` prevents a fallback flash when cached work resolves quickly.
- `timeout` aborts the attempt and renders an `AsyncTimeoutError` through the
  error callback.
- Retry cancels the previous attempt and starts the same loader with the next
  attempt number.
- Source replacement, render suspension, and unmount abort pending work.
- `sourceKey` keeps one logical request alive across unrelated parent renders
  while adopting the newest fallback, children, and error callbacks.
- Late resolutions and rejections from cancelled attempts cannot update the
  Part.

If no error callback exists, a failed boundary renders `nothing`. A retryable
source must be a loader rather than one already-settled promise.

## Async components

`defineAsyncComponent()` creates a typed functional component with loading,
error, timeout, and retry rendering. Resolved component definitions are cached.
The returned function also exposes:

- `preload()` — shares concurrent preload work and resolves when the component
  definition is available;
- `reset()` — clears the resolved definition for HMR or an explicit retry;
- `resolved` — reports whether calling the component is synchronous.

Routers may use an async component as a normal route component. Servers call
`preload()` before rendering; the following component call then returns its
normal synchronous template.

## Teleport

`Teleport({ to, children })` renders through an internal `display: contents`
host appended to an `Element` or selector target. The host is registered with
the active Gluon application, so injected context, guarded events, component
errors, and nested renderer ownership remain attached to the source app even
when the target is outside its mount root.

Updating `to` moves the same host. Disabling Teleport renders children locally.
Replacement, suspension, or app unmount disconnects the nested renderer,
unregisters application ownership, and removes the host.

## KeepAlive

`KeepAlive({ cacheKey, children, max })` stores one renderer host per key. A
deactivated entry is removed from the live Part and `suspendRender()` releases
its listeners, refs, and directive resources while retaining DOM and component
state. Activation renders current inputs into the retained host before it is
reconnected.

`max` is a positive integer. Once exceeded, the least-recently-used inactive
entry is permanently unmounted. `onActivated`, `onDeactivated`, and `onEvicted`
provide deterministic lifecycle evidence. Disconnecting KeepAlive unmounts
every entry, including the active entry.

## Transition

`Transition()` animates direct element roots with the Web Animations API.
Replacement runs leave keyframes, renders the latest content, then runs enter
keyframes. A new update cancels owned animations and uses a generation guard so
stale completions cannot commit. Supplying `transitionKey` makes ordinary
updates with the same identity commit synchronously; only identity changes run
leave/enter.

`TransitionGroup()` composes `repeat()` with unique stable keys. Retained
elements keep identity, moved elements use FLIP transforms, inserted elements
use enter keyframes, and removed elements animate a fixed-position visual clone
before cleanup. A new group update cancels animations and removes outstanding
clones.

Both APIs accept custom enter/leave keyframes, duration, and easing.
`reducedMotion: true` disables animation explicitly; the default and
`'system'` read `prefers-reduced-motion: reduce` and commit immediately.

## Server contract

Built-in directive markers remain private to the browser renderer.
`getBuiltinServerContract(value)` is the public, DOM-free SSR and streaming handoff:

- Suspense exposes `resolve()`, including timeout and error/fallback behavior.
- Teleport exposes target and content for collection or in-place server policy.
- KeepAlive and transitions expose content because caching and animation are
  browser lifecycle behavior.
- TransitionGroup exposes keyed repeated content.

The server renderer and progressive coordinator consume these descriptors
rather than inspecting private runtime symbols. `resolve(signal)` propagates a
response abort to Suspense sources; hydration resolves the same contracts once
before binding marker DOM. Production style/asset transport remains #37.

## Verification

- `tests/builtins.spec.ts` covers loading, nesting, retry, timeout, abort,
  router/preload behavior, context ownership, cache retention/eviction,
  cancellation, reduced motion, keyed identity, and server descriptors.
- `tests/shop-example.spec.ts` covers async product availability, cached route
  identity, teleported bag interaction and cleanup, persisted lines, and the
  customer flow.
- `tests-node/core.types.ts` covers public inference and invalid calls.
