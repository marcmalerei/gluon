# Gluon architecture

Gluon separates standalone reactivity, its renderer, browser integration, and
UI vocabulary so each public package and entry point can remain focused and
tree-shakable.

## Source layout

```text
src/
├── application.ts      App instances, plugins, providers, registries, mount
├── application-context.ts  Context propagation, event guards, errors, warnings
├── builtins.ts         Suspense, async components, Teleport, KeepAlive, transitions
├── model.ts            Controlled native and Custom Element model bindings
├── runtime.ts          Template results, compiler plans, Parts, spreading, render
├── element.ts          Reactive Custom Element base and definition helper
├── component.ts        Atom, Molecule, and Organism metadata helpers
├── props.ts            Class/style-aware prop merging
├── styles/             Constructable stylesheet creation and adoption
├── quarks/             Typed q.<tag>() native-element factories
├── atoms/              Icon, Button, Input, Label
├── molecules/          Card, FormField
└── organisms/          AppShell

packages/reactivity/
├── src/effect.ts       Dependency graph, effects, cleanup, debug hooks
├── src/reactive.ts     Deep/shallow mutable/readonly object and collection proxies
├── src/ref.ts          Deep and shallow primitive refs
├── src/computed.ts     Lazy cached readonly and writable computed refs
├── src/scheduler.ts    Dedupe, batching, phases, ordering, nextTick
├── src/scope.ts        Hierarchical effect ownership and cleanup
├── src/watch.ts        Scheduled source and effect watchers
└── src/error.ts        Contained low-level reactivity error channel

packages/router/
├── src/history.ts      Browser, hash, and memory history adapters
├── src/matcher.ts      Route records, ranking, params, aliases, redirects
├── src/query.ts        Deterministic query parsing and serialization
├── src/router.ts       Navigation, guards, failures, lazy loading, snapshots
├── src/ui.ts           Gluon plugin, RouterLink, RouterView, injection helpers
└── src/memory.ts       DOM-free Node/server entry point

packages/store/
└── src/index.ts        Definitions, managers, transactions, plugins, snapshots,
                        HMR, persistence, and testing isolation

examples/shop/
├── src/app.ts          Public-package application composition and routes
├── src/pages.ts        Home, catalog, product, policy, and fallback pages
├── src/components.ts   Navigation, product rail, search, menu, and bag
├── src/state.ts        Official per-application Store definition and bag actions
├── src/styles.ts       Document-level constructable stylesheet design system
├── assets/             Production product and editorial imagery
└── design/             Accepted concepts and verified browser renders
```

The current private package builds separate ESM entry points for `@gluonjs/core`,
`@gluonjs/core/styles`, `@gluonjs/core/quarks`, `@gluonjs/core/atoms`,
`@gluonjs/core/molecules`, and `@gluonjs/core/organisms`. The accepted
[package governance ADR](adrs/0002-package-release-and-supply-chain-governance.md)
makes the four UI-layer subpaths transitional and defines their final optional
packages.

The separate `@gluonjs/router` package owns application routing and depends on
Core and Reactivity. Its `./memory` entry excludes browser histories and Gluon
UI bindings, so Node resolution and server snapshots do not evaluate a DOM
global. Browser and hash adapters access `window` only when their factory is
called. The complete navigation and ownership rules are documented in the
[Router contract](router.md).

The separate `@gluonjs/store` package depends only on Reactivity and compiles
without DOM or Node ambient types. Definitions are reusable factories; each
application, request, or test manager owns its live state, computed scope,
transactions, plugins, persistence adapter, and teardown. Its snapshot,
security, HMR compatibility, and inspection rules are documented in the
[Store contract](store.md).

The GLUON GOODS reference shop consumes only public package names in
application source. Its monorepo Vite and test aliases resolve those names to
workspace sources until package publication. `AGENTS.md` makes the shop a
mandatory living acceptance surface: applicable framework work integrates into
the same customer flow instead of creating disconnected demos.

## Standalone reactivity

`@gluonjs/reactivity` is compiled with `lib: ["ES2022"]` and no ambient DOM or
Node types. Its dependency graph is keyed by raw target and accessed property or
collection operation. Effects clear and rebuild their subscriptions on every
run, so conditional dependencies stop receiving updates when they are no longer
read.

Deep and shallow mutable or readonly proxies cover plain objects, arrays,
`Map`, and `Set`. Collection dependencies distinguish specific keys, membership,
size, map-key iteration, and value/entry iteration. Computed refs use an internal
effect only to mark their cache dirty; their getter executes lazily on the next
read.

### Scheduling and ownership

Scheduler work is deduplicated by function within `pre`, `update`, and `post`
phases. Each phase sorts ascending numeric IDs before insertion order, providing
an explicit parent-before-child mechanism. A phase queued after that phase has
already completed runs in the next cycle; one flush drains all cycles before
`nextTick` resolves. Promise-returning jobs are awaited within their phase and
their rejections use the same error channel. A recursion limit routes
self-queueing failures through the error channel without rejecting the flush
promise.

Effects remain synchronous unless they select `pre`, `update`, or `post`. Lazy
effects can defer their first execution and expose an eager scheduling hook for
render-owner integration. The outermost
synchronous `batch` deduplicates all affected effects before dispatch. `untracked`
temporarily suppresses subscription collection while preserving nested active
effect behavior.

Attached scopes own effects, computed dependency effects, watchers, child
scopes, and cleanup callbacks. Stop order is reverse-created effects,
reverse-created child scopes, then reverse-registered cleanup callbacks.
Detached scopes remain independent. Scope stop invalidates queued work and
permanently disables scope-owned runners.

Low-level failures select the closest effect, watcher, job, or scope handler;
the configured global reactivity handler is used when no local handler exists.
The default uses platform `reportError` or `console.error`; handler failures are
contained by that default channel. Application-
specific error ownership remains issue #23.

`GluonElement` owns one lazy update-phase render effect per connection. Declared
property requests and reactive invalidations queue the same runner, conditional
render dependencies are rebuilt each run, and disconnect stops the complete
scope before suspending DOM bindings. Reconnection retains state and matching
DOM while creating fresh reactive ownership. The public diagnostic hook reports
batched render causes, tracked dependencies, and timings. The full contract is
documented in [Reactive Custom Elements](reactive-elements.md).

## Runtime contract

`html` and `svg` return immutable-shape `TemplateResult` objects. A template is compiled once per `TemplateStringsArray` and cached in a `WeakMap`.

Compilation stores direct child-node paths for every dynamic Part. Cloned templates instantiate Parts from those cached paths instead of walking the complete clone. Each descriptor also stores its original expression index, so DOM attribute ordering does not control value ordering.

The runtime currently has three Part types:

- `NodePart` updates children, nested templates, DOM nodes, index-based arrays,
  and keyed `repeat()` results.
- `AttributePart` handles attributes plus `.property`, `?boolean`, and `@event` prefixes.
- `SpreadPart` reconciles prop objects, including classes, style maps, `data`, `aria`, events, and refs.

Event listeners and refs are disconnected when a binding changes or a template is replaced. Spread sub-maps remove only attributes or style properties previously owned by that Part.

Root and nested template instances refresh their rendered top-level node sets
after every successful update. This keeps renderer ownership accurate when a
top-level conditional or list adds and removes nodes between cached static
siblings, while the next render can still detect external DOM replacement.

The production binding semantics for forms, lifecycle directives, event
options, qualified namespaces, unsafe-content boundaries, root suspension,
permanent unmount, and external DOM recovery are specified by the
[DOM runtime contract](dom-runtime.md).

## Application runtime

`createApp` owns a renderer container, detached reactive scope, plugin cleanup
stack, provider map, functional component registry, configuration, and explicit
public exposure. Container-to-context ownership uses weak roots. A connected
`GluonElement` walks its composed ancestry to resolve the nearest root, so
nested applications override outer context without a process-global registry.

Application root functions and element update/lifecycle callbacks run inside a
synchronous context frame. That frame supplies typed injection, error ownership,
warning ownership, and stable event-listener guards. Runtime event Parts capture
the frame while they install a listener, preserving native listener behavior
while routing synchronous throws and returned promise rejections.

Custom Elements remain the only stateful component instances. Per-app named
components are functional render functions; they do not own state, lifecycle,
or a second DOM identity. The complete isolation, ordering, failure, and cleanup
contract is documented in [Application runtime](application-runtime.md).

## Public component contracts

`element.ts` keeps property, event, native-slot, lifecycle, and public-exposure
metadata on the Custom Element class. Runtime validation warns through the
nearest application but preserves the supplied prop or event value. Native slot
assignment retains Light DOM ownership. `component.ts` provides the scoped-slot
functional convention, while `model.ts` composes controlled property/event
spreads over the existing renderer. Element and callback refs remain renderer
Parts; the exposed-ref adapter resolves only the frozen object published by the
upgraded Custom Element. See [Component contracts](component-contracts.md).

### List identity

Ordinary arrays retain the original index-based behavior: a compatible template
instance belongs to its current array position. Reordering array values updates
those position-owned instances and does not attach item identity.

`repeat(items, key, renderItem)` creates the explicit keyed path. It materializes
the iterable and validates every `PropertyKey` before producing a
`RepeatResult`. Missing (`null` or `undefined`) and duplicate keys throw before
the result reaches `render()`. Each accepted key owns a child `NodePart` and an
internal marker. Reconciliation updates surviving Parts and moves their marker
and rendered node group into the requested order. It disconnects only keys that
do not survive. Consequently, a surviving template or Custom Element keeps its
DOM identity, binding state, and local element state across prepend, append,
reverse, sort, and arbitrary moves.

A changed key has no identity relationship to the previous key. Reconciliation
disconnects the old child and creates a new one. Switching between a keyed
result and an ordinary array also disconnects the previous mode before mounting
the next one. Key extractors must therefore use stable item identity rather than
the current index.

## Template constraints

Each expression must be either a complete child expression or a complete attribute value:

```ts
html`<div class=${className}>${children}</div>`;
```

Partial attribute interpolation is intentionally rejected:

```ts
// Unsupported
html`<div class="prefix ${state}"></div>`;
```

Compose the full string first. This keeps compilation deterministic and avoids a second string-interpolation subsystem inside attribute Parts.

## Custom Elements

The accepted long-term division between stateful element components and
stateless functional components is defined in
[RFC 0002](rfcs/0002-unified-component-model.md). This section describes the
current implementation of those two roles; the RFC separately records known
prototype gaps and the required Gluon 1.0 contract.

`GluonElement` finalizes declared property accessors once per constructor. It supports:

- attribute names and opt-out
- String, Number, Boolean, Object, and Array conversion
- defaults and custom converters
- change predicates
- property-to-attribute reflection
- scoped reactive rendering through the shared phased scheduler
- `updateComplete`
- disconnect/reconnect effect ownership and development render diagnostics
- inherited constructable stylesheets

Every instance renders into an open ShadowRoot. Component styles are always adopted `CSSStyleSheet` instances.

## Styling invariant

The accepted browser/runtime matrix, SSR carrier format, and hydration handoff
are defined in
[ADR 0001](adrs/0001-browser-runtime-and-style-transport.md). The current source
implements only the client-side constructed-sheet portion of that contract.

Gluon does not create or inject `<style>` elements. `css` creates a `CSSStyleSheet`; `adoptStyles` and `unadoptStyles` manage `adoptedStyleSheets` while preserving unrelated sheets.

This is a deliberate browser baseline. A browser without constructable and adopted stylesheet support receives a descriptive error.

The adopted-only statement describes client rendering and the final hydrated
state. Server-rendered initial style carriers are serialized transport state and
must be removed after successful adoption; they are not a client runtime fallback.

## Quark DX

The Tiny-Lit snapshot contained more than one hundred nearly identical per-tag Quark modules. Gluon replaces them with one typed proxy:

```ts
q.button({ children: 'Save' });
q.section({ children: q.h2({ children: 'Overview' }) });
```

The type of `q` maps every key in `HTMLElementTagNameMap` to a cached factory. `quark('my-element')` covers custom elements. Void elements reject children.

## UI layers

Atoms, Molecules, and Organisms are ordinary render functions with explicit metadata. They all return `TemplateResult` and compose through Quarks; there is no second component runtime.

They have no host, state instance, or lifecycle of their own. Stateful and
publicly interoperable components use `GluonElement`; their render methods may
compose any of these functional layers.

Layer styles are exported as constructable sheets and must be adopted explicitly. This avoids import-time DOM mutation and keeps application stylesheet ownership visible.

## Verification boundaries

The machine-readable [`package-contract.json`](../package-contract.json) defines
the complete planned package graph. `npm run check:packages` validates every
declared package independently and additionally verifies built exports, types,
license, changelog, README, and `npm pack` contents for implemented packages.
Reactivity behavior runs in a Node Vitest configuration; the public generated
Core and Reactivity declarations are compiled again through
`tests-node/core.types.ts` and `tests-node/reactivity.types.ts`.

The browser suite verifies DOM identity, nested templates, index-based arrays,
keyed insert/delete/prepend/append/reverse/sort/arbitrary moves, keyed cleanup,
invalid-key diagnostics, all binding forms, spread cleanup, refs, Custom Element
properties and reflection, SVG namespaces, Quark factories, layer composition,
and stylesheet adoption.

`npm run benchmark:keyed` provides three Gluon-only Chromium scenarios with
1,000 rows: full reverse, a 100-row block move, and a 100-row replacement
window. It is a repeatable regression harness, not a comparative benchmark.

`npm run benchmark:rendering` production-builds a separate comparison surface
with Gluon, Lit, Vue, and optimized Vanilla DOM implementations. It validates
identical output, calibrates shared per-scenario batches, rotates execution
order, runs in Chromium, Firefox, and WebKit, and retains raw samples plus exact
environment metadata. [`performance.md`](performance.md) defines the workloads,
interpretation rules, and measurement limits. The benchmark has no application
runtime dependency and is intentionally not a GLUON GOODS customer route.
