# Vue-to-Gluon cutover playbook

This playbook moves an existing Vue 3 application through a reversible Custom
Element boundary toward Gluon application ownership. It uses the production
`gluon-product-configurator` from GLUON GOODS throughout; it does not introduce
a second demonstration component.

Gluon does not parse or transform Vue source at this stage. The steps below are
manual changes against public browser and Gluon contracts. They do not promise
Vue runtime, directive, lifecycle, Router, Store, scoped-CSS, SFC, or SSR
compatibility.

## Rules that apply to every stage

1. One framework owns a DOM subtree. A Vue render and a Gluon render never
   update the same DOM subtree.
2. Structured input crosses a Custom Element boundary as a DOM property, not a
   string attribute. Output crosses it as a native `CustomEvent` with a typed
   `detail` payload.
3. The host owns light DOM passed to native slots. The Custom Element owns its
   Shadow DOM, lifecycle, constructed stylesheet, and public form contract.
4. State crosses the boundary as serializable snapshots or domain events. Do
   not share a process-global live store between frameworks or server requests.
5. Exactly one Router owns a URL at a time. Exactly one renderer owns the
   server markup and hydration of a route at a time.
6. A stage is complete only after its entry evidence remains green, its exit
   evidence is automated, and its rollback was identified before deployment.

## Running production case

The Vue fixture below is built by Vite with Vue `3.5.39` and
`@vitejs/plugin-vue` `6.0.7`. The plugin classifies
`gluon-product-configurator` as a Custom Element. Vue owns the product snapshot,
the surrounding form, the named and default light-DOM slots, and the evidence
panel. The Gluon element owns its product controls, configuration rules, Shadow
DOM, adopted stylesheet, and form-associated value.

`VueProductHost.vue` is the actual compiled host source:

<<< ../../../../examples/VueProductHost.vue

The mount module registers the production element and adopts the same shop
stylesheet contract used by GLUON GOODS:

<<< ../../../../examples/vue-host.ts

The [compiled Vue host](/gluon/1.3.0/examples/vue.html) and the production shop
are exercised by `tests/vue-migration-interop.spec.ts`,
`tests/docs-examples.spec.ts`, `tests/shop-example.spec.ts`, and the shop
SSR/hydration suite. Those tests are the evidence for every source snippet on
this page.

## Stage 0 — Establish the baseline

### Entry criteria

- The current Vue production build and its customer-critical browser flows
  pass without Gluon changes.
- Each candidate slice has an identified DOM owner, state owner, URL owner,
  stylesheet owner, server renderer, teardown hook, and rollback deployment.
- Product inputs, emitted domain events, form behavior, slots, focus behavior,
  async work, and persisted state are recorded from observable behavior.

### Work

Inventory leaves before routes or the application shell. For the running case,
the leaf is product configuration: one typed product snapshot enters, native
configuration and add-to-bag events leave, and one JSON form value participates
in the host form. The surrounding product route and bag remain application
concerns rather than component internals.

### Exit criteria

- The inventory names every boundary listed in the concept matrix below.
- The existing Vue behavior has regression evidence that can be run before and
  after the first Gluon deployment.
- A deployment can restore the previous Vue leaf without changing persisted
  customer data or the route URL.

## Stage 1 — Replace one leaf with a production Custom Element

### Entry criteria

- Stage 0 evidence is green.
- The Gluon element has a documented tag name in a versioned package release,
  typed public properties and events, native slot semantics, and deterministic
  disconnect cleanup.
- The Vue compiler treats the tag as a Custom Element.

### Work

Register the element before mounting the host when possible. Bind objects with
Vue's `.prop` transport, listen to native events at the element, and place only
Vue-owned light DOM in slots. Do not query or mutate the element's Shadow DOM
from application code. Retain a typed reference only to invoke documented
public methods or assign public properties.

The #88 case proves property assignment before and after definition, reactive
property replacement, native event payloads and flags, named/default slots,
stable element identity, disconnect/reconnect cleanup, adopted stylesheets,
focus and label behavior, form submission/reset/state restore/validation, and
the exact configured line item added to the bag.

### Exit criteria

- The production customer flow uses the same registered element in GLUON GOODS
  and the Vue host.
- Chromium, Firefox, and WebKit evidence covers the boundary behavior.
- Removing the Vue host also disconnects listeners, reactive scopes, async work,
  and adopted host styles without retaining the element.

## Stage 2 — Transfer component and form state

### Entry criteria

- Stage 1 is green in production-equivalent builds.
- The team has classified each value as host application state, element-local
  interaction state, form state, or cross-route domain state.

### Work

Move only element-local state into Gluon reactivity. Keep application state in
the current Vue owner until its whole consumer slice moves. Pass immutable
snapshots into the element and consume domain events; do not hand a Vue ref,
Pinia store, Gluon ref, or Gluon Store instance across the boundary.

Let the native form own submission, reset, disabled propagation, constraint
validation, and state restoration. The host may read the element's public form
value through `FormData`; it must not mirror the element's private control tree.

### Exit criteria

- Every mutable value has exactly one writer and a documented lifetime.
- Form submission and reset work through native form APIs with and without the
  Vue host.
- Application-level state still has one owner, and element-local cleanup passes
  repeated mount/unmount retention tests.

## Stage 3 — Cut over routes, shared state, and async UI

### Entry criteria

- All leaves needed by one complete route have passed Stage 2.
- Direct navigation, reload, back/forward, route parameters, query parameters,
  guards, scroll behavior, lazy loading, async cancellation, and error recovery
  are covered for that route.

### Work

Choose route ownership at the deployment boundary. A Vue-owned URL continues
through Vue Router. A Gluon-owned URL uses `createRouter`, one supported history,
`RouterView`, and Gluon route records. Do not install two history listeners that
both navigate the same URL.

Create one `StoreManager` per Gluon application with `createStoreManager()` and
instantiate definitions with `definition.use(manager)`. For server rendering,
create and dispose a manager per request. Transfer only validated snapshots or
domain events while Vue-owned routes remain; never expose a process-global live
store to both applications.

Async ownership follows route ownership. The departing owner aborts its pending
work. The arriving owner implements its own pending, error, retry, and teardown
behavior; Vue `<Suspense>` and Gluon `Suspense` do not share a live task.

### Exit criteria

- Deep links, reload, back/forward, redirects, failures, and cancellation pass
  under the new single Router owner.
- Cross-route state is created and disposed with the new application/request
  owner and has explicit snapshot hydration where required.
- The old Vue route registration, loaders, guards, and store consumers for the
  migrated URL are removed.

## Stage 4 — Cut over styles and universal rendering

### Entry criteria

- Stage 3 client navigation is green.
- The route's server renderer, hydration payload, asset manifest, stylesheet
  order, mismatch policy, and request-state lifetime are recorded.

### Work

Move global route styles to constructed `CSSStyleSheet` instances owned by the
Gluon application and component styles to sheets adopted by each Shadow Root.
Remove Vue scoped-style selectors only after the last Vue-owned node that needs
them is gone. Do not add a `<style>` fallback.

For a Gluon-owned route, render with the public `@gluonjs/ssr` request APIs,
serialize request-local Router and Store snapshots, and hydrate that Gluon
markup once on the client. A Vue renderer must not hydrate the same DOM subtree.
The Vue coexistence fixture is client-rendered; #88's server/hydration evidence
comes from the production GLUON GOODS route, so no Vue-SSR interoperability
claim is made.

### Exit criteria

- The response contains the expected initial content and stylesheet ownership
  before client JavaScript runs.
- Hydration preserves the tested element identity and reports no unexpected
  mismatch.
- Request state is isolated and disposed; client navigation and the configured
  add-to-bag flow remain green after hydration.

## Stage 5 — Transfer the shell and remove Vue

### Entry criteria

- Every production URL, global state consumer, overlay, focus boundary, global
  stylesheet, server entry, and hydration entry has a Gluon owner.
- No remaining third-party feature requires a Vue application context.
- Production and rollback artifacts for the final Vue-backed release are
  retained according to the application's release policy.

### Work

Move the final shell as one ownership change. Remove the Vue mount, Vue Router,
Pinia/Vuex managers, Vue-only build plugins, `.vue` compilation, Vue-only CSS,
and dependencies only after repository search and production bundle inspection
show no remaining consumer. Keep browser platform contracts such as native
Custom Events and forms; they are not temporary compatibility code.

### Exit criteria

- A clean install, typecheck, test, server build, client build, and production
  bundle scan pass without Vue or its build plugin.
- All supported URLs, forms, dialogs, focus returns, persistence, server
  responses, hydration, and critical customer flows pass in every configured
  automated engine target.
- Rollback means deploying the retained prior artifact and compatible data
  contract, not running two application owners on the same subtree.

## Boundary and rollback matrix

| Stage | Vue owner | Gluon owner | Transport | Teardown responsibility | Rollback point |
| --- | --- | --- | --- | --- | --- |
| 0 — Baseline | Entire current application | None in the live Vue tree | Recorded inputs, outputs, URLs, and snapshots | Existing Vue application | Last verified Vue artifact |
| 1 — Leaf | Route, product snapshot, light DOM, host form, bag | Product controls, Shadow DOM, configuration rules, form-associated value | DOM properties, native slots, `CustomEvent`, `FormData` | Vue unmounts host listeners; element disconnects its scope and async work | Render the retained Vue leaf |
| 2 — State/form | Application and cross-route domain state | Element-local interaction and native form state | Immutable snapshots in; domain events and form value out | The owner that created each scope/store/listener | Restore the Stage 1 boundary and state adapter |
| 3 — Route | Only URLs not yet migrated | Migrated URL, route async work, request/app Store manager | Navigation at disjoint URL ownership; serialized snapshots at deployment/request boundaries | Departing Router removes routes/listeners; each app disposes its manager | Route migrated URLs to the prior Vue artifact |
| 4 — Universal | Only remaining Vue-rendered routes and their CSS | Migrated route server render, hydration, assets, constructed styles | Serialized Router/Store request state and generated asset references | Each renderer disposes request state; only the owning client hydrates | Serve the retained Stage 3 client/previous server artifact |
| 5 — Shell | None | Full application, URLs, state, styles, server and client render | Public Gluon and browser contracts only | Gluon application/request disposal | Redeploy the final verified Vue-backed artifact |

## Concept and ownership matrix

| Concern | Vue-side contract | Gluon-side contract | Semantic difference to verify | Remove from Vue when |
| --- | --- | --- | --- | --- |
| Props / properties | Vue props and `.prop` on a Custom Element | Declared `GluonElement` properties | Objects cross the native boundary as properties; attributes remain strings | The receiving subtree has a Gluon owner |
| Events | Component emits or native listeners | Typed native `CustomEvent` | Verify `detail`, bubbling, composition, cancellation, and event name | No Vue listener consumes the domain event |
| Slots | Vue slots or host light DOM | Native Shadow DOM slots or typed scoped-slot functions | Native slot fallback and light-DOM ownership differ from Vue slot rendering | The old component no longer renders that slot |
| Forms | Vue bindings plus native form APIs | Form-associated Custom Element and `ElementInternals` | Submission, reset, validation, labels, focus, disabled state, and restore are native contracts | The Vue control/model mirror is gone |
| Refs | Vue template refs | Typed element reference or Gluon `ref` | A host reference reaches only public element APIs, not private Shadow DOM | The Vue owner no longer calls the element |
| Reactivity | Vue `ref`, `computed`, watchers and effect scopes | `@gluonjs/reactivity` refs, computed values, watchers, and scopes | Scheduling and cleanup must be tested; live refs do not cross owners | All consumers in that scope moved together |
| Router | Vue Router records, guards and views | `createRouter`, supported histories, `RouterView`, public route APIs | Record shapes, guards, lazy loading, scroll and failures are redesigned | The complete URL belongs to Gluon |
| Store | Pinia/Vuex application manager | `defineStore` plus an application/request `StoreManager` | Store definitions are reusable; live instances belong to a manager and are not global bridges | Every consumer and hydration path moved |
| Async UI | Vue async components or `<Suspense>` | Gluon async components and `Suspense` | Cancellation, pending/error/retry UI and teardown are separate implementations | The old route/component cannot start work |
| Styles | Vue global or scoped CSS | Constructed sheets and `adoptedStyleSheets` | Selector rewriting is not compatible; ownership and adoption order are explicit | No Vue-owned node needs the sheet |
| SSR / hydration | Vue server renderer and Vue hydration | `@gluonjs/ssr` render, request snapshots, and Gluon hydration | One renderer and one hydrator own a route subtree; snapshots are request-local | The route is rendered and hydrated by Gluon |
| Tests | Vue unit/component/E2E suites | Gluon unit, browser integration, SSR/hydration, and E2E evidence | Preserve observable behavior; framework-private assertions are rewritten | Equivalent public behavior is covered |
| Production build | Vue plugin, SFC compiler, Vue chunks | Gluon TypeScript/Vite/server/static entries | Clean-install output, assets, deployment fallback, and bundle contents are verified | No source, plugin, chunk, or runtime import remains |

## Verification and rollback runbook

Run the narrow coexistence evidence during Stages 1 and 2:

```sh
npx vitest run tests/vue-migration-interop.spec.ts tests/docs-examples.spec.ts tests/shop-example.spec.ts
npm run build:shop
npm run build:docs-examples
```

Run documentation evidence whenever this playbook or its embedded sources
change:

```sh
npm run check:docs
```

For each route cutover, add direct-link, reload, back/forward, async failure,
teardown, server response, hydration, and production-build evidence before
changing traffic. Record the previous artifact identifier and the data contract
it expects. If the new route violates its exit criteria, restore traffic to
that artifact; do not mount Vue over a Gluon-owned subtree as an emergency
fallback.

The repository-wide release gate remains:

```sh
npm run check
```

The output of these commands verifies compiled sources and observable behavior.
It does not authorize automatic Vue source rewriting. RFC 0003 and issue #91
provide a report-only reader with an explicit syntax, reporting, privacy, and
failure contract. A source writer remains prohibited without another accepted
RFC.
