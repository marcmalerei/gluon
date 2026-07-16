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
├── functional-element.ts Setup-based authoring lowered to GluonElement
├── component.ts        Atom, Molecule, and Organism metadata helpers
├── props.ts            Class/style-aware prop merging
└── styles/             Constructable stylesheet creation and adoption

packages/quarks/        Typed native factories and headless interactions
packages/atoms/         Icon, Button, Input, Label, tokens, and themes
packages/molecules/     Card and FormField compositions
packages/organisms/     AppShell structure

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

src/virtualizer.ts      Core accessible list/grid windowing, measurement,
                        scroll anchoring, SSR window, and resource ownership

packages/ssr/
├── src/index.ts        DOM-free serialization, DSD elements, request ownership,
│                       Router/Store snapshots, and safe embedded state
├── src/eleventy.ts     Optional request-isolated Eleventy custom format adapter
├── src/streaming.ts    Ordered and progressive async chunks plus stream adapters
├── src/hydration.ts    Browser binding reconstruction and style/state handoff
└── src/static.ts       Route-aware static output and mixed deployment manifest

packages/compiler/
└── src/index.ts        Template/part locations, diagnostics, source maps, and
                        development transform insertion

packages/vite/
├── src/index.ts        Vite project boundary, compiler integration, virtual client
└── src/client.ts       Stable development identities and runtime refresh bridge

packages/test-utils/
└── src/index.ts        Public component fixtures, cleanup, Router/Store isolation,
                        scheduler controls, and leak diagnostics

packages/language-server/
├── src/index.ts        Shared HTML/SVG/CSS analysis and editor operations
├── src/project-analyzer.ts Versioned static project inventory and confidence
├── src/protocol.ts     VS Code-independent LSP request and notification handling
├── src/server-cli.ts   Content-Length framed stdio server
├── src/check-cli.ts    Project-level CI diagnostic command
└── src/project-analyze-cli.ts Bounded zero-write JSON inventory command

packages/vue-migration-analyzer/
├── src/index.ts        Root-bounded discovery, deterministic reports, formatting
├── src/worker.ts       Isolated Vue SFC/script/template static parser
├── src/schema.ts       Frozen public report-schema export
├── src/cli.ts          Report-only `gluon-vue-analyze` executable
├── schemas/            Versioned JSON report schema
└── fixtures/           Retained supported/unsupported/adversarial evidence

editors/vscode/
└── extension.cjs       Maintained client for the lockstep language server

packages/devtools-api/
└── src/index.ts        Environment-neutral versioned snapshots and event protocol

packages/devtools/
└── src/index.ts        Opt-in Core/Router/Store bridge, Vite module, browser inspector

examples/shop/
├── src/app.ts          Public-package application composition and routes
├── src/server.ts       Public SSR request entry reusing the shop application
├── src/pages.ts        Home, catalog, product, policy, and fallback pages
├── src/components.ts   Navigation, product rail, search, menu, and bag
├── src/state.ts        Official per-application Store definition and bag actions
├── src/styles.ts       Document-level constructable stylesheet design system
├── assets/             Production product and editorial imagery
├── project-analysis.json Retained static project acceptance report
└── design/             Accepted concepts and verified browser renders

examples/playground/
├── src/app.ts          Editor, live preview, diagnostics, share, and reference UI
├── src/project.ts      Stable URL-safe two-file reproduction transport
├── src/archive.ts      Downloadable maintained starter tar generation
├── src/styles.ts       Constructable Swiss-editorial developer-tool system
└── design/             Accepted editor and diagnostic-reference concepts

examples/virtualizer/
├── src/app.ts          500-item accessible list/grid acceptance application
├── src/styles.ts       Constructable responsive example stylesheet
└── vite.config.ts      Public-package runnable and production build boundary
```

The optional UI packages share the typed native extension boundary documented
in [`ui-extensibility.md`](ui-extensibility.md). `defineAtom`,
`defineMolecule`, and `defineOrganism` only attach immutable `layer` and
`displayName` metadata to a stateless render function. They do not register a
Custom Element, create lifecycle/state ownership, adopt styles, install themes,
validate props, add semantics, or arrange cleanup.

Core builds `@gluonjs/core`, the opt-in `@gluonjs/core/decorators` authoring
entry, and `@gluonjs/core/styles`. The optional UI
graph is separately consumable as `@gluonjs/quarks`, `@gluonjs/atoms`,
`@gluonjs/molecules`, and `@gluonjs/organisms`, with dependencies pointing only
downward as defined by the
[package governance ADR](adrs/0002-package-release-and-supply-chain-governance.md).

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

`@gluonjs/ssr` imports the public Core server contracts, Router memory entry,
Store, and Reactivity. Browser style definitions become inert serializable
descriptors when `CSSStyleSheet` is absent; `GluonElement` uses a DOM-free base
and server render entry without running connection lifecycle. A request creates
one detached scope, memory Router, Store manager, and application, then releases
them in `finally`. The public serializer owns escaping, URL validation, async
built-in resolution, deterministic binding markers, DSD output, and JSON-safe
state embedding. The browser hydration entry independently validates parsed DOM,
adopts matching Core Parts, restores public Router/Store snapshots, and reports
categorized recovery evidence. Vite emits the immutable client asset manifest;
static generation consumes it with the same request renderer. Style carriers
are request-local and become document-local adopted sheets only after validation.

`@gluonjs/test-utils` composes only public Core, Reactivity, Router, and Store
exports. Each fixture owns a real application root and records its cleanup
boundary; Router histories and Store managers are factory-created per test.
The package's black-box and ownership rules are documented in its
[package guide](../packages/test-utils/README.md).

## Vite transform and HMR boundary

`@gluonjs/compiler` parses application TypeScript or JavaScript and records the
original `html`/`css` template boundaries, `compose()` template bodies, and
expression offsets. Its
high-resolution map remains chained through Vite, so a generated runtime
location resolves to the author module and expression. The compiler does not
replace Gluon's public runtime template format.

`compose(component, props)\`body\`` is a Core helper, not a second renderer.
It builds `body` with `html` and calls the supplied function once with that
result as `children`. Functional ownership, DOM identity, SSR/hydration,
Devtools, test utilities, and HMR therefore observe the same result as a direct
call. RFC 0004 fixes this boundary.

`@gluonjs/vite` transforms application modules inside the resolved Vite root.
Development transforms route exported functions, Store definitions,
`defineElement()` and `defineGluonElement()` registration, and `css` results
through one virtual client.
That client keeps identities by normalized module URL and transform key. Store
managers receive their public `hotUpdate()` path; adopted sheets retain their
object identity while `replaceSync()` changes CSSOM contents; mounted
applications and connected elements receive scheduler-owned render requests.

The first registered Custom Element constructor remains the registry value.
Compatible edits patch its prototype and static contracts. Tag, superclass,
form association, constructor/instance-field initialization, property/attribute,
event, or slot schema, and component stylesheet-count changes invalidate the boundary and
require a reload. Production transforms omit the virtual client, hot handlers,
and module keys and define Core's render-debug flag as false.

The GLUON GOODS reference shop consumes only public package names in
application source. Its monorepo Vite and test aliases resolve those names to
workspace sources until package publication. `AGENTS.md` makes the shop a
mandatory living acceptance surface: applicable framework work integrates into
the same customer flow instead of creating disconnected demos.

The shop application is also the production UI-package ownership boundary.
`createShopApplication()` optionally installs one target-scoped `UiOwner`,
retains the app-owned brand-token and layout sheets through its `styleOwner`,
and releases dialogs, exact rendered component sheets, application sheets, and
the shared owner on unmount. Header, menu, product, bag, search, and checkout
flows use official public Atoms/Molecules plus app-local presets and
Molecule/Organism metadata. The stateful form-associated product configurator
and functional quantity Custom Element keep their existing ShadowRoot and event
ownership; functional Buttons compose inside those boundaries.

## Standalone reactivity

`@gluonjs/reactivity` is compiled with `lib: ["ES2022", "ESNext.Disposable"]`
and no ambient DOM or
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
their rejections use the same error channel. Synchronous jobs run back-to-back
inside the phase without one artificial microtask per job. A recursion limit
routes self-queueing failures through the error channel without rejecting the
flush promise.

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

Compilation stores each dynamic Part's original expression index, direct
child-node path, and element/comment traversal index. Cloned templates resolve
all Parts in one `TreeWalker` pass ordered by traversal index, then place the
resulting bindings back into expression-index order. DOM parser reparenting and
attribute traversal therefore do not control value or hydration-marker order.

The runtime currently has three Part types:

- `NodePart` updates children, nested templates, DOM nodes, index-based arrays,
  and keyed `repeat()` results.
- `AttributePart` handles attributes plus `.property`, `?boolean`, and `@event` prefixes.
- `SpreadPart` reconciles prop objects, including classes, style maps, `data`, `aria`, events, and refs.

Event Parts retain one native guarded dispatcher while callbacks change and
the event-options value stays identical. They replace the native listener when
that options value changes, and disconnect it when the binding or template is
removed. Refs follow their normal change/removal lifecycle. Spread sub-maps
remove only attributes or style properties previously owned by that Part.

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

App-local component creation is automated by the Node-only
`create-gluon add-component` workflow. It emits ordinary public-package imports
and does not add a generator runtime to browser bundles. Stateless Atom,
Molecule, and Organism output remains metadata-bearing render functions;
stateful output uses `defineGluonElement`; headless output wraps Quark behavior.
Visual functional output exports its sheet, named SSR/hydration selection, and
target owner explicitly. See [App-local component generator](component-generator.md).

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
and rendered node group into the requested order. The generic path trims equal
keyed heads and tails before allocating its middle lookup, retains the longest
contiguous run whose rendered nodes did not change, and moves only groups
outside that run. If renderer-owned nodes were changed externally, it falls
back to the ordinary recovery path. It disconnects only keys that do not
survive. Consequently, a surviving template or Custom Element keeps its DOM
identity, binding state, and local element state across prepend, append,
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

An element may declare `static shadowRootRegistry` with a handle created by
`createGluonElementRegistry()`. The handle owns definitions independently of
hosts and selects a native scoped registry when the platform supports complete
ShadowRoot association. Unsupported browsers intentionally use the global
registry; SSR uses an isolated definition table and emits the declarative
registry marker. Registration identity also partitions HMR records, so equal
tag names in separate native roots never share patched constructors. See
[Scoped Custom Element registries](scoped-element-registries.md).

`defineGluonElement()` generates a subclass with the same declarations and
protected hooks. Setup runs in a child of the connection render scope;
explicitly keyed ref/reactive state is instance-retained, while computed values,
watchers, lifecycle registrations, and cleanups are connection-local. SSR uses
an isolated temporary setup scope, hydration uses the normal connection owner,
and compatible HMR reruns patched setup while retaining the host and state. The
accepted contract is [RFC 0005](rfcs/0005-functional-custom-element-authoring.md).
Its readonly `context.props` proxy reads native host properties and tracks an
internal revision advanced by accepted declared-property writes; this keeps
property watchers reactive without introducing a second property store.

## Styling invariant

The accepted browser/runtime matrix, SSR carrier format, and hydration handoff
are defined in
[ADR 0001](adrs/0001-browser-runtime-and-style-transport.md). The current source
implements only the client-side constructed-sheet portion of that contract.

Gluon does not create or inject browser-runtime `<style>` elements. `css`
creates a `CSSStyleSheet`; `adoptStyles` and `unadoptStyles` manage
`adoptedStyleSheets` while preserving unrelated sheets. `createStyleSheetOwner`
adds target-local reference counting: each handle releases only sheets it
retained, and a sheet that predated the first handle remains adopted.

This is a deliberate browser baseline. A browser without constructable and adopted stylesheet support receives a descriptive error.

The adopted-only statement describes client rendering and the final hydrated
state. Server-rendered initial style carriers are serialized transport state and
must be removed after successful adoption; they are not a client runtime fallback.

## Quark DX

Gluon exposes native HTML tags through one typed Quark proxy instead of
maintaining a separate module for every tag:

```ts
q.button({ children: 'Save' });
q.section({ children: q.h2({ children: 'Overview' }) });
```

The type of `q` maps every key in `HTMLElementTagNameMap` to a cached factory. `quark('my-element')` covers custom elements. Void elements reject children.

## UI layers

Atoms, Molecules, and Organisms are ordinary render functions with explicit
layer, display-name, and immutable exact-style metadata. They all return
`TemplateResult` and compose through Quarks; there is no second component runtime.

They have no host, state instance, or lifecycle of their own. Stateful and
publicly interoperable components use `GluonElement`; their render methods may
compose any of these functional layers.

### Compiler-proven primitive element updates

The production compiler recognizes one intentionally narrow element shape: a
class that directly extends the imported `GluonElement`, declares the rendered
property in a static object literal, does not override `update()`, and returns
one fixed `html` template directly. Exactly one interpolation must read that
property in child-text position. Any additional interpolation must be an event
binding to a private readonly function field. The compiler wraps the unchanged
public TemplateResult with internal callsite metadata; it does not emit a
second template representation.

After the first general render resolves the actual `NodePart`, a production
property-only update may queue a smaller element-owned job. The job retains the
element ID, shared update phase, deduplication, completion promise, primitive
value semantics, and root-identity checks. It never runs when update lifecycle
hooks are registered. Reactive triggers, explicit requests, multiple property
names, hydration, suspension, style ownership, changed root nodes, or a missing
Part promote the same pending work to the full render effect. This keeps
conditional dependency rebuilding, application/error ownership, renderer
recovery, HMR, reconnect, and user-defined update behavior on their established
paths.

`@gluonjs/atoms` owns the optional UI installation boundary because dependency
direction already points from Atoms to Core. `installUi()` creates no new
package edge: one call retains Core's layer order and foundation plus Atom-owned
tokens and one target-local active theme sheet. Its returned `UiOwner` exposes
typed theme switching, idempotent disposal, and a separate target-scoped
`styleOwner` for additional explicit target sheets. Core never imports an
optional UI package.

The active theme sheet keeps one identity while its CSS text changes. Each
Document or ShadowRoot receives its own instance, so theme state is not a
process singleton. Named `StyleSheetSelection` entries carry the same four
sheets through SSR. Component calls copy their exact dependencies onto the
returned template value. Root and nested Parts retain those dependencies on the
actual `Document` or `ShadowRoot` before committing dependent DOM, reference-
count duplicate instances, and release conditional, async, teleported,
transitioned, element, application, hydration, and unmount ownership at their
documented lifecycle boundaries. Target-local ordering is stable by layer and
component ID regardless of discovery order. Deprecated aggregate sheets remain
exported for migration, but exact rendering rejects their coexistence instead
of silently double-styling.

SSR and hydration use the same selection order: shared `gluon-ui` entries,
request-derived exact component entries, then application-owned entries. This
keeps server carriers and client validation identical when a page combines a
named application selection with usage-derived component styles.

## Report-only Vue migration analyzer

[RFC 0003](rfcs/0003-report-only-vue-migration-analyzer.md) authorizes the
Node-only `@gluonjs/vue-migration-analyzer` package with root and
`./schema` exports plus the `gluon-vue-analyze` executable. It has no official
Gluon dependency and does not enter the Core, browser, application, Router,
Store, SSR, Compiler, Vite, Devtools, language-server, or UI runtime graphs.
Issue #91 added it to the machine-readable package and release contracts with
the implementation, package contents, schema, CLI, fixtures, and release
evidence in one slice.

The analyzer may read only the RFC's bounded Vue 3.5 project surface. It parses
source into inert AST data in an isolated worker and emits deterministic reports
to stdout. It never imports application/config/plugin code, uses a network,
follows symbolic links, or writes source. Unsupported and dynamic constructs
remain explicit diagnostics linked to the versioned cutover guide.

The bounded issue #92 evaluation is retained in
[`vue-codemod-decision.md`](vue-codemod-decision.md) and its machine-readable
evidence. It records no-go for source writing across 14 candidate classes:
17 fixture files produced 52 inventory records and 26 findings, but zero
candidate classes have retained behavioral-equivalence proof. No converter
package, transform hook, or write mode enters the architecture. A future source
writer cannot reuse RFC 0003; it requires another accepted RFC first.

The package has no honest GLUON GOODS customer surface. The production
configurator and Vue host remain input/evidence fixtures, while the analyzer
itself remains developer tooling.

## Developer-experience evidence boundary

The issue #107 comparison is an evidence system, not a framework runtime or an
application dependency. Its versioned task contract and completed-run JSON
schema live under `benchmarks/dx`; they do not enter Core, UI, Router, Store,
SSR, Compiler, Vite, Devtools, language-server, or GLUON GOODS bundles.

The contract compares one checkout customer flow through seven identical
observable tasks in Gluon, the official `create-vue` lane, and the React Router
framework lane selected from React's official application guidance. It retains
raw commands, files, authored/configuration lines, dependencies, concepts,
diagnostics, browser results, universal-rendering evidence, cleanup evidence,
and human observations. Results remain separate per task and dimension; no
single weighted score is an architectural input or accepted output.

`npm run check:dx-scorecard` validates the contract, exact retained fixtures,
the 21-pair automation record, and the separation between automated and
completed evidence. `npm run benchmark:dx` owns disposable scaffold baselines
and raw command capture; it does not enter runtime packages. A completed run
still cannot be inferred from that gate because the completed schema requires
at least one retained human usability pass. See
[`dx-benchmark.md`](dx-benchmark.md) for the current verified boundary.

## Verification boundaries

The machine-readable [`package-contract.json`](../package-contract.json) defines
the complete implemented release-group graph, including the analyzer.
`npm run check:packages`
validates every declared package independently and additionally verifies built
exports, types, license, changelog, README, and `npm pack` contents for
implemented packages.
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
The retained issue #95 comparison and its interpretation are recorded in
[`performance.md`](performance.md).

`npm run benchmark:rendering` production-builds a separate comparison surface
with Gluon, Lit, Vue, and optimized Vanilla DOM implementations. It validates
identical output, calibrates shared per-scenario batches, rotates execution
order, runs in Chromium, Firefox, and WebKit, and retains raw samples plus exact
environment metadata. [`performance.md`](performance.md) defines the workloads,
interpretation rules, and measurement limits. The benchmark has no application
runtime dependency and is intentionally not a GLUON GOODS customer route.

`npm run benchmark:components` applies the same production and evidence
contract to 50 autonomous Custom Elements per framework. Gluon uses the public
`GluonElement` class, Lit uses `LitElement`, and Vue uses
`defineCustomElement`; all three render open Shadow DOM and identical
scenario-specific surfaces. Lifecycle includes label, internal button state,
and 20 keyed rows; property renders only the label; state only the button; and
list only the 20 keyed rows. Operations settle through each framework's public
completion API before the next operation. The comparative Vite configs
explicitly compile aliased Gluon source with `__GLUON_DEV__` disabled, and
`npm run check:benchmark-builds` enforces that production-mode boundary.
