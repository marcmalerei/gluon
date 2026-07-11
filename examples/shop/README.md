# GLUON GOODS reference shop

GLUON GOODS is the living application acceptance surface for Gluon. It is a
coherent mobile-first shop frontend, not an example index. Each applicable
framework feature must improve a real customer flow here as defined by the
repository [working agreement](../../AGENTS.md).

## Current slice

The current slice uses the public Core, Reactivity, Router, and Store APIs to provide:

- home, catalog, and deep-linkable product routes
- desktop and mobile navigation
- a realistic product catalog and product-detail surface
- keyboard-operable product configuration
- a reactive bag with configured line items and quantities
- a labeled checkout form, exact order summary, and URL-addressable confirmation
- one isolated Store manager per shop application and persisted configured bag lines
- abortable product availability with explicit loading, error, timeout, and retry UI
- cached route views across back/forward traversal
- an application-owned teleported bag with cancellable enter/leave transitions
- keyed bag-line transitions with system reduced-motion handling
- modal initial focus, keyboard focus containment, and focus restoration
- 44px minimum mobile action targets at 390px and 320px
- constructable stylesheet-only design
- official `@gluonjs/vite` source maps, diagnostics, and state-preserving HMR
- an isolated server-rendered deep-product response and browser hydration
  handoff through `@gluonjs/ssr`

Async UI is part of Core because it composes renderer Parts and application
ownership directly. The shop now exposes `renderShopRequest(url)` through
`src/server.ts`; it reuses the same route records, Store definition, page
functions, async inventory boundary, and application shell without browser DOM
globals. `src/hydrate.ts` restores the request Router and Store snapshots,
retains matching nodes, adopts validated server style carriers, and activates
the product flow.

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
Compatible edits to exported page/components, the shop Store definition, and
`shopStyles` update without a full reload; public-schema or constructor changes
use the documented reload boundary.

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
- [desktop keyboard focus on the product gallery](design/rendered-product-focus-desktop.png)
- [mobile keyboard focus on the product gallery](design/rendered-product-focus-mobile.png)

## Verification contract

The shop must build during `npm run check`. Browser tests cover the current
customer flow, and visual changes require desktop, 390px, and 320px screenshots
checked against the concepts above. The evolving public-API evidence map is
maintained in [FEATURES.md](FEATURES.md). `npm run check:shop-boundaries`
rejects private or undeclared package imports and `<style>` fallback paths in
shop source.

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
is 137,169 bytes raw and 40,088 bytes gzip. The five WebP product/editorial assets total 155,126
bytes. These are composition measurements, not a rendering-speed claim. The
comparative Gluon, Lit, Vue, and Vanilla DOM benchmark belongs to issue #38 and
must publish its scenarios, browser versions, warm-up, samples, and raw results
before the repository makes a speed claim.

That comparison is now available through `npm run benchmark:rendering` and
documented in [`docs/performance.md`](../../docs/performance.md). It remains a
separate performance surface rather than a shop route because running renderer
microbenchmarks is not part of the GLUON GOODS customer journey. The retained
baseline does not establish a general Gluon speed advantage.
