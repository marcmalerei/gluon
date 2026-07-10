# GLUON GOODS reference shop

GLUON GOODS is the living application acceptance surface for Gluon. It is a
coherent mobile-first shop frontend, not an example index. Each applicable
framework feature must improve a real customer flow here as defined by the
repository [working agreement](../../AGENTS.md).

## Current slice

This first slice uses the public Core, Reactivity, and Router APIs to provide:

- home, catalog, and deep-linkable product routes
- desktop and mobile navigation
- a realistic product catalog and product-detail surface
- keyboard-operable product configuration
- a reactive bag with configured line items and quantities
- modal initial focus, keyboard focus containment, and focus restoration
- 44px minimum mobile action targets at 390px and 320px
- constructable stylesheet-only design

The official Store and async UI packages do not exist yet. The smallest local
domain state is used until issues #26 and #27 replace it with their public APIs.

## Run

```bash
npm run dev:shop
npm run build:shop
npm run measure:shop
```

`dev:shop` starts the Vite development server on `0.0.0.0:4173`; Vite prints the
available local and LAN URLs. The monorepo Vite configuration maps official
package names to workspace sources; shop application files import public
package entry points only.

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

## Verification contract

The shop must build during `npm run check`. Browser tests cover the current
customer flow, and visual changes require desktop, 390px, and 320px screenshots
checked against the concepts above. The evolving public-API evidence map is
maintained in [FEATURES.md](FEATURES.md). `npm run check:shop-boundaries`
rejects private or undeclared package imports and `<style>` fallback paths in
shop source.

## Reproducible bundle evidence

`npm run measure:shop` performs a production build and reports raw and level-9
gzip byte counts from the generated files. For this slice, the single browser
entry that contains Core, Reactivity, Router, and the shop is 91,114 bytes raw
and 25,959 bytes gzip. The five WebP product/editorial assets total 155,126
bytes. These are composition measurements, not a rendering-speed claim. The
comparative Gluon, Lit, Vue, and Vanilla DOM benchmark belongs to issue #38 and
must publish its scenarios, browser versions, warm-up, samples, and raw results
before the repository makes a speed claim.
