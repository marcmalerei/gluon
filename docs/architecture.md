# Gluon architecture

Gluon separates standalone reactivity, its renderer, browser integration, and
UI vocabulary so each public package and entry point can remain focused and
tree-shakable.

## Source layout

```text
src/
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
```

The current private package builds separate ESM entry points for `@gluonjs/core`,
`@gluonjs/core/styles`, `@gluonjs/core/quarks`, `@gluonjs/core/atoms`,
`@gluonjs/core/molecules`, and `@gluonjs/core/organisms`. The accepted
[package governance ADR](adrs/0002-package-release-and-supply-chain-governance.md)
makes the four UI-layer subpaths transitional and defines their final optional
packages.

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

Effects remain synchronous unless they select `pre` or `post`. The outermost
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
specific error ownership remains issue #23. Issue #22 integrates these scheduler
and scope primitives with `GluonElement`; the element still uses its current
property-update microtask until that lifecycle integration is implemented.

## Runtime contract

`html` and `svg` return immutable-shape `TemplateResult` objects. A template is compiled once per `TemplateStringsArray` and cached in a `WeakMap`.

Compilation stores direct child-node paths for every dynamic Part. Cloned templates instantiate Parts from those cached paths instead of walking the complete clone. Each descriptor also stores its original expression index, so DOM attribute ordering does not control value ordering.

The runtime currently has three Part types:

- `NodePart` updates children, nested templates, DOM nodes, index-based arrays,
  and keyed `repeat()` results.
- `AttributePart` handles attributes plus `.property`, `?boolean`, and `@event` prefixes.
- `SpreadPart` reconciles prop objects, including classes, style maps, `data`, `aria`, events, and refs.

Event listeners and refs are disconnected when a binding changes or a template is replaced. Spread sub-maps remove only attributes or style properties previously owned by that Part.

The production binding semantics for forms, lifecycle directives, event
options, qualified namespaces, unsafe-content boundaries, root suspension,
permanent unmount, and external DOM recovery are specified by the
[DOM runtime contract](dom-runtime.md).

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
- microtask-batched rendering
- `updateComplete`
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
Performance claims require a separate reproducible benchmark design and
baseline implementations.
