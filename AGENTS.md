# Repository working agreement

## General

- State facts only. Verify repository and runtime claims; do not guess.
- Preserve unrelated user changes and keep the worktree clean after delivery.

## Git flow

- Before changing repository files, use an existing scoped GitHub issue or
  create one, then work on a `codex/` branch.
- When a scoped change is complete, update its documentation, run the relevant
  checks, create a pull request, merge it, close the completed issue, remove the
  merged branch, and leave `main` clean.
- If an issue is intentionally delivered in vertical slices, keep the epic open
  and record the completed slice and remaining acceptance work in the issue.

## Documentation

- Every code change must update the relevant user, API, architecture, or
  verification documentation in the same pull request.

## Living reference shop

`examples/shop` is Gluon's canonical application acceptance surface. It is a
real, coherent, mobile-first shop frontend named **GLUON GOODS**. It is not a
component gallery, cookbook, Storybook substitute, playground, or collection of
isolated examples.

### Product contract

- Keep one consistent commerce experience: global navigation, home and catalog
  discovery, product details, product configuration, bag management, and the
  purchase path as the platform gains the APIs needed to support it.
- Use realistic typed product data, prices, variants, availability, copy, and
  responsive imagery. Do not use lorem ipsum, placeholder rectangles, inert
  controls, fake metrics, or disconnected demo panels.
- The current brand and visual source of truth lives in `examples/shop/design`:
  Swiss-editorial commerce, true white, near-black type, restrained chartreuse
  actions, cobalt product details, thin rules, open layouts, and product-led
  photography. Preserve that system unless a dedicated design issue supersedes
  it.
- All visible interface text and controls remain code-native. Raster assets are
  reserved for product and editorial imagery, not screenshots of UI.

### Growth rule for every Gluon feature

For every framework feature, package, or public API change:

1. Decide whether the capability has a user-visible or acceptance-relevant shop
   application. If it does, integrate it into a real shop flow in the same PR.
2. Add or update the corresponding entry in `examples/shop/FEATURES.md`, naming
   the public API, visible shop surface, and automated evidence.
3. Add regression evidence at the correct level: unit tests for domain logic,
   browser integration for rendering/interactions, and end-to-end coverage for
   customer flows.
4. If the capability has no honest shop application, record the verified reason
   in the PR and leave the shop unchanged. Do not manufacture decorative demos
   merely to claim coverage.

The shop must remain runnable after every merged slice. Do not wait until the end
of a milestone to integrate accumulated features.

### Public-boundary rule

- Application source imports official public package entry points only, such as
  `@gluonjs/core`, `@gluonjs/reactivity`, and `@gluonjs/router`.
- Do not import repository `src/`, package-internal files, private symbols, or
  deep `dist` paths from shop application code. Monorepo-only aliases may live
  in build/test configuration until workspace package linking replaces them.
- Do not recreate a missing framework feature inside the shop under a compatible
  name. Use the smallest honest local domain implementation and replace it when
  the official package lands.
- Browser styling uses constructable stylesheets and `adoptedStyleSheets` only;
  do not add `<style>` fallback paths.

### Required customer experience

- Navigation works through real URLs, deep links, reload initialization, and
  back/forward traversal on desktop and mobile.
- Mobile is a first-class layout, not a compressed desktop page. Verify at 390px
  and at least one small-mobile width; touch targets are at least 44px.
- Product discovery supports meaningful category/filter/sort behavior when the
  relevant state APIs exist.
- Product configuration has labeled, keyboard-operable choices and changes the
  exact line item added to the bag.
- Bag state supports adding configured products, quantity changes, removal,
  totals, empty state, and an accessible drawer or page.
- Checkout, account, async inventory, persistence, transitions, SSR, and
  hydration must join the same customer journey as those framework capabilities
  are implemented. They must not become separate demo routes.
- Use semantic landmarks, native controls, visible focus, dialog focus handling,
  useful alternative text, reduced-motion support, and WCAG-aware contrast.

### Quality gates

- A clean install must typecheck and build the shop.
- Critical flows must be automated: browse products, navigate to a deep product
  URL, configure a product, add it to the bag, change quantity, and recover the
  same route through back/forward.
- Visual changes require desktop and mobile browser verification. Compare the
  rendered result with the accepted concept images in `examples/shop/design`
  and attach meaningful screenshots to the pull request.
- Keep `examples/shop/README.md` current with run instructions, architecture,
  design tokens, supported flows, and known framework-dependent gaps.
- Keep bundle composition and measurable runtime evidence factual. Do not make
  performance claims without reproducible measurements.
