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
| Async UI primitives | Inventory loading, lazy media, transition states | Issue #27 | Pending package |
| SSR and hydration | Deep product URL server response and hydration | Issues #35–#37 | Pending packages |
