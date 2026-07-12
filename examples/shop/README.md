# GLUON GOODS reference shop

GLUON GOODS is the living application acceptance surface for Gluon. It is a
coherent mobile-first shop frontend, not an example index. Each applicable
framework feature must improve a real customer flow here as defined by the
repository [working agreement](../../AGENTS.md).

## Current slice

Customer-facing links with nested or text content use the public
`compose(RouterLink, props)\`body\`` path. It passes the body as typed children
to the same RouterLink function; direct functional calls remain supported.
Compiler, SSR, and shop tests verify that this adds no host or renderer
boundary.

The current slice uses the public Core, Reactivity, Router, and Store APIs to provide:

- home, catalog, and deep-linkable product routes
- desktop and mobile navigation
- a realistic product catalog and product-detail surface
- keyboard-operable product configuration through the same typed,
  form-associated `gluon-product-configurator` Custom Element consumed by the
  maintained Vue 3 host
- a reactive bag with configured line items and quantities
- an app-local `gluon-bag-quantity` autonomous Custom Element authored through
  `defineGluonElement()`, with inferred properties/native events, cancelable
  optimistic quantity state, exposed focus, and 44px actions
- a labeled checkout form, exact order summary, and URL-addressable confirmation
- one isolated Store manager per shop application and persisted configured bag lines
- abortable product availability with explicit loading, error, timeout, and retry UI
- cached route views across back/forward traversal
- an application-owned teleported bag with cancellable enter/leave transitions
- keyed bag-line transitions with system reduced-motion handling
- modal initial focus, keyboard focus containment, and focus restoration
- shared `@gluonjs/quarks` focus-scope ownership for search, menu, and bag dialogs
- 44px minimum mobile action targets at 390px and 320px
- constructable stylesheet-only design
- one `installUi()` document owner shared by client mount and named SSR/hydration
  selection, with the GLUON GOODS product sheet retained as application-owned
- official `@gluonjs/vite` source maps, diagnostics, and state-preserving HMR
- an isolated server-rendered deep-product response and browser hydration
  handoff through `@gluonjs/ssr`

Async UI is part of Core because it composes renderer Parts and application
ownership directly. The shop now exposes `renderShopRequest(url)` through
`src/server.ts`; it reuses the same route records, Store definition, page
functions, async inventory boundary, and application shell without browser DOM
globals. `src/hydrate.ts` first installs the shared UI owner and validates its
four named carriers, then restores the request Router and Store snapshots,
retains matching nodes, adopts the remaining product-owned carrier, and
activates the product flow. The product configurator owns its control DOM and
`productConfiguratorStyles` sheet; product, configuration, native events, and
light-DOM slots form the host boundary. Server output retains the product title,
inventory status, and facts as light DOM before the element upgrades.

The bag quantity/remove surface is the concise-authoring acceptance boundary.
`src/bag-quantity-control.ts` registers lazily from the real bag flow, imports
only `@gluonjs/core`, owns one constructable ShadowRoot sheet, and communicates
with the Store through cancelable native events. Its explicitly keyed optimistic
quantity survives reconnect and compatible HMR; the Store remains the
authoritative bag owner.

The production pipeline emits hashed client assets and `gluon-assets.json`, a
Vite SSR request bundle, and five route-aware static documents with one recorded
dynamic product family plus stateful checkout and order fallbacks. See [static
and server deployment](../../docs/deployment.md).

## Run

```bash
npm run dev:shop
npm run build:shop
npm run build:shop:server
npm run build:shop:static
npm run measure:shop
```

`dev:shop` starts the Vite development server on `0.0.0.0:4173`; Vite prints the
available local and LAN URLs. The monorepo Vite configuration maps official
package names to workspace sources; shop application files import public
package entry points only. The same configuration installs `@gluonjs/vite`.
Compatible edits to exported page/components, the shop Store definition,
`shopStyles`, `productConfiguratorStyles`, and functional bag-control setup
update without a full reload;
public-schema or constructor changes use the documented reload boundary.

## Design system

- background: true white (`#ffffff`)
- text: near black (`#111111`)
- action: electric chartreuse (`#c8ff00`)
- product detail: cobalt (`#173f91`)
- borders: thin neutral rules
- typography: system grotesk with an editorial display scale
- container model: open bands and rails, not nested card grids
- component geometry: square to lightly rounded, low shadow

The accepted concept references are:

- [desktop home and catalog](design/home-desktop.webp)
- [desktop product configuration](design/product-desktop.webp)
- [mobile home and product flow](design/mobile-flow.webp)

The latest verified renders are:

- [desktop home](design/rendered-home-desktop.png)
- [mobile home](design/rendered-home-mobile.png)
- [mobile product configuration](design/rendered-product-mobile.png)
- [Vue-migration product boundary on desktop](design/rendered-product-migration-desktop.png)
- [Vue-migration product boundary at 390px](design/rendered-product-migration-mobile.png)
- [desktop keyboard focus on the product gallery](design/rendered-product-focus-desktop.png)
- [mobile keyboard focus on the product gallery](design/rendered-product-focus-mobile.png)

## Verification contract

The shop must build during `npm run check`. Browser tests cover the current
customer flow, and visual changes require desktop, 390px, and 320px screenshots
checked against the concepts above. The evolving public-API evidence map is
maintained in [FEATURES.md](FEATURES.md). `npm run check:shop-boundaries`
rejects private or undeclared package imports and `<style>` fallback paths in
shop source.

`tests/vue-migration-interop.spec.ts` additionally verifies the production
element's pre-definition upgrade, structured properties, native event flags,
default and named slots, stable host and owned-node identity, disconnect and
cleanup behavior, adopted stylesheet, and platform form participation. The
compiled Vue 3.5.39 host uses `@vitejs/plugin-vue` with
`compilerOptions.isCustomElement`; it does not wrap or translate the Gluon
element into a Vue component.

The checkout acceptance flow was verified at 390px from product through bag,
labeled delivery fields, order submission, and confirmation. At 320px the
confirmation has no horizontal overflow and every visible link/button remains
at least 44px high. This frontend confirmation does not claim payment-provider
or fulfillment integration.

`npm run check:shop-performance` builds the same production shop and measures
home readiness, product navigation, bag opening, and checkout navigation over
two warm-ups and ten Chromium samples. The reviewed p95 ceilings live in
`quality/shop-performance-budgets.json`; JSON and Markdown preserve every raw
sample. These local production timings are regression ceilings, not network,
device, or general framework-speed claims.

## Reproducible bundle evidence

`npm run measure:shop` performs a production build and reports raw and level-9
gzip byte counts from the generated files. For this slice, the single browser
entry that contains Core, Reactivity, Router, Store, async built-ins, and the shop
has an issue #108 owner baseline of 164,012 raw bytes and 47,686 gzip bytes. On
the pre-#108 integration base, the issue #112 functional bag quantity boundary
measured 166,257 raw bytes and 47,947 level-9 gzip bytes. Relative to the issue
#88 baseline of 158,152 raw and 45,683 gzip bytes, that isolated #112 delta was
8,105 raw bytes and 2,264 gzip bytes and included the concise authoring runtime
plus the app-local control. The five WebP product/editorial assets total 155,126
bytes. These are composition measurements, not a rendering-speed claim. The
comparative Gluon, Lit, Vue, and Vanilla DOM benchmark belongs to issue #38 and
must publish its scenarios, browser versions, warm-up, samples, and raw results
before the repository makes a speed claim.

That comparison is now available through `npm run benchmark:rendering` and
documented in [`docs/performance.md`](../../docs/performance.md). It remains a
separate performance surface rather than a shop route because running renderer
microbenchmarks is not part of the GLUON GOODS customer journey. The retained
baseline does not establish a general Gluon speed advantage.
