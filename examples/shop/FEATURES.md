# GLUON GOODS capability evidence

| Gluon capability | Shop surface | Automated evidence | Status |
| --- | --- | --- | --- |
| Application runtime and plugin context | Isolated shop mount and Router plugin | `tests/shop-example.spec.ts` | Integrated |
| HTML templates and attribute spreading | Every page and reusable control | Core renderer suite + shop browser test | Integrated |
| Core `render()` single-node insertion and single-pass binding instantiation | Dynamic product, bag, delivery, and order templates throughout the existing customer journey | Direct-vs-fragment and parser-reordered traversal regressions + retained rendering comparison + shop performance budgets | Integrated renderer optimization |
| Standalone reactivity | Bag, configuration, search, and navigation UI state | `tests/shop-example.spec.ts` | Integrated |
| Router histories and links | Home, catalog, product deep links, active navigation | Router suite + shop browser test | Integrated |
| Adopted stylesheets | Complete responsive shop presentation | Shop browser test + visual QA | Integrated |
| Native dialog and control accessibility | Search, mobile menu, product choices, and bag | `tests/shop-example.spec.ts` + 390px/320px browser QA | Integrated |
| Official Store | Per-app bag state, configured line items, persisted bag, derived totals | Store Node/type suites + `tests/shop-example.spec.ts` | Integrated |
| Store actions + Router forms | Labeled delivery checkout, order summary, atomic order placement, and confirmation URL | Desktop/mobile shop flow + Store snapshot and browser assertions | Integrated purchase path |
| `Suspense` and async component contract | Abortable product availability loading, explicit pending/error/retry states | Built-ins browser suite + `tests/shop-example.spec.ts` | Integrated |
| `Teleport` and `Transition` | Application-owned, animated accessible bag overlay | Built-ins context/cleanup suite + shop browser test | Integrated |
| `KeepAlive` | Route view retention across product back/forward traversal | Built-ins LRU suite + shop node-identity assertion | Integrated |
| `TransitionGroup` | Keyed bag line insertion/removal/movement | Built-ins identity/reduced-motion suite + shop bag flow | Integrated |
| `@gluonjs/test-utils` | Acceptance infrastructure only; it has no honest customer-facing shop surface | Package browser/type contracts; shop remains on its production app API | Integrated as test infrastructure |
| `@gluonjs/vite` | Shop development/build pipeline; compatible page, Store, Custom Element, and adopted stylesheet edits retain live state | Compiler contracts + real Vite/Chromium HMR flow + production-bundle scan | Integrated as build infrastructure |
| `@gluonjs/ssr`, hydration, and static entry points | Isolated dynamic response plus five prerendered routes, mixed `/products/:slug` fallback, identity-preserving browser handoff, and initial styled content using the same shop modules | SSR/static fixtures + asset manifest + browser Router/Store/style ownership and add-to-bag assertions | Integrated universal rendering and deployment |
| `create-gluon` | Acceptance infrastructure only; generated starters are separate applications and have no honest customer-facing shop surface | CLI unit/type contracts + install/typecheck/test/build verification for all 20 supported selections | Integrated as project scaffolding |
| `@gluonjs/language-server` | Developer tooling only; it has no honest customer-facing shop surface | Shared analyzer + protocol/type contracts + generated starter template checks | Integrated as editor and CI infrastructure |
| `@gluonjs/devtools-api` and `@gluonjs/devtools` | Opt-in development inspection only; production GLUON GOODS does not expose the bridge | Protocol Node suite + browser multi-app/render/Router/Store/inspector suite + production-disabled Vite assertion | Integrated as development infrastructure |
| Playground and diagnostic catalog | Separate developer reproduction/reference surface; it has no honest customer-facing shop application | Catalog/source parity + compact-code fixture + Playground URL/archive/browser flow + production build | Integrated as diagnostic infrastructure |
| Cross-engine CI and performance budgets | Acceptance infrastructure only; no customer-facing control belongs in the shop | Full GLUON GOODS browser suite in Playwright Chromium, Firefox, and WebKit + production bundle and home/product/bag/checkout p95 budgets + retained workflow artifacts | Integrated as release-quality evidence |
| Versioned documentation and generated API reference | Developer education and release evidence only; it has no honest customer-facing shop control | `npm run check:docs` + compiled documentation examples + public Pages deployment | Integrated as documentation infrastructure |
| Accessibility, security, and retention gates | Existing browse, configure, bag, and checkout journey; no decorative QA surface is added | axe WCAG A/AA journey scan + focus assertions + repeated teardown retention + validated threat model | Integrated as release-quality evidence |
| `@gluonjs/quarks` `createFocusScope()` | Search, mobile-menu, and bag-dialog focus entry, containment, and return | Shop keyboard-flow assertions in every browser engine lane | Integrated into the customer journey |
