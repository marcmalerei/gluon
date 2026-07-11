# GLUON GOODS capability evidence

| Gluon capability | Shop surface | Automated evidence | Status |
| --- | --- | --- | --- |
| Application runtime and plugin context | Isolated shop mount and Router plugin | `tests/shop-example.spec.ts` | Integrated |
| HTML templates and attribute spreading | Every page and reusable control | Core renderer suite + shop browser test | Integrated |
| Standalone reactivity | Bag, configuration, search, and navigation UI state | `tests/shop-example.spec.ts` | Integrated |
| Router histories and links | Home, catalog, product deep links, active navigation | Router suite + shop browser test | Integrated |
| Adopted stylesheets | Complete responsive shop presentation | Shop browser test + visual QA | Integrated |
| Native dialog and control accessibility | Search, mobile menu, product choices, and bag | `tests/shop-example.spec.ts` + 390px/320px browser QA | Integrated |
| Official Store | Per-app bag state, configured line items, persisted bag, derived totals | Store Node/type suites + `tests/shop-example.spec.ts` | Integrated |
| `Suspense` and async component contract | Abortable product availability loading, explicit pending/error/retry states | Built-ins browser suite + `tests/shop-example.spec.ts` | Integrated |
| `Teleport` and `Transition` | Application-owned, animated accessible bag overlay | Built-ins context/cleanup suite + shop browser test | Integrated |
| `KeepAlive` | Route view retention across product back/forward traversal | Built-ins LRU suite + shop node-identity assertion | Integrated |
| `TransitionGroup` | Keyed bag line insertion/removal/movement | Built-ins identity/reduced-motion suite + shop bag flow | Integrated |
| `@gluonjs/test-utils` | Acceptance infrastructure only; it has no honest customer-facing shop surface | Package browser/type contracts; shop remains on its production app API | Integrated as test infrastructure |
| `@gluonjs/vite` | Shop development/build pipeline; compatible page, Store, Custom Element, and adopted stylesheet edits retain live state | Compiler contracts + real Vite/Chromium HMR flow + production-bundle scan | Integrated as build infrastructure |
| `@gluonjs/ssr` | Isolated deep product URL server response using the same routes, Store, pages, and async inventory | DOM-free SSR contract + GLUON GOODS deep-product Node assertion | Integrated server rendering; hydration/styles pending #36–#37 |
