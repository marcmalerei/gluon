# Gluon vs Lit vs Vue framework comparison

Generated: 2026-10-04T18:15:48.702Z

Source: `84342c21fa401440addf5ea7d214b74e2d9bc4cd` on `codex/634-adjacent-keyed-swap` (working tree clean)

This report includes the complete current Gluon build at the recorded commit. The adjacent keyed-swap optimization and all other optimizations present in that build are therefore part of every Gluon measurement.

Method: 20 interleaved samples after 5 warm-ups; chromium, firefox, webkit where supported; lower milliseconds are faster.

Each suite keeps its own workload boundary and correctness checks. Ratios must not be combined across suites or generalized into a universal framework ranking.

## rendering

# Rendering benchmark evidence

Generated: 2026-10-04T18:15:31.662Z

Source: `84342c21fa401440addf5ea7d214b74e2d9bc4cd` on `codex/634-adjacent-keyed-swap` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.13.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 5 warm-up rounds, and 20 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 324000 | 0.000047 | 0.000049 | 1.00× |
| text | lit | 324000 | 0.000054 | 0.000056 | 1.16× |
| text | vue | 324000 | 0.000188 | 0.000200 | 4.04× |
| text | vanilla | 324000 | 0.000084 | 0.000098 | 1.80× |
| create | gluon | 21 | 0.3048 | 0.4190 | 1.00× |
| create | lit | 21 | 0.7571 | 0.8048 | 2.48× |
| create | vue | 21 | 0.3190 | 0.6524 | 1.05× |
| create | vanilla | 21 | 0.4333 | 0.5667 | 1.42× |
| update | gluon | 160 | 0.0775 | 0.0969 | 1.00× |
| update | lit | 160 | 0.0856 | 0.0944 | 1.10× |
| update | vue | 160 | 0.1700 | 0.1925 | 2.19× |
| update | vanilla | 160 | 0.1013 | 0.1125 | 1.31× |
| reverse | gluon | 70 | 0.1371 | 0.1600 | 1.00× |
| reverse | lit | 70 | 0.2571 | 0.2714 | 1.87× |
| reverse | vue | 70 | 0.2057 | 0.2214 | 1.50× |
| reverse | vanilla | 70 | 0.1129 | 0.1257 | 0.82× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000119 | 0.000125 | 1.00× |
| text | lit | 160000 | 0.000119 | 0.000125 | 1.00× |
| text | vue | 160000 | 0.000300 | 0.000306 | 2.53× |
| text | vanilla | 160000 | 0.000075 | 0.000081 | 0.63× |
| create | gluon | 24 | 0.5833 | 0.7917 | 1.00× |
| create | lit | 24 | 1.5833 | 1.7917 | 2.71× |
| create | vue | 24 | 0.5833 | 1.6667 | 1.00× |
| create | vanilla | 24 | 0.6667 | 1.0417 | 1.14× |
| update | gluon | 120 | 0.1250 | 0.1583 | 1.00× |
| update | lit | 120 | 0.1833 | 0.2250 | 1.47× |
| update | vue | 120 | 0.2333 | 0.2750 | 1.87× |
| update | vanilla | 120 | 0.0917 | 0.1000 | 0.73× |
| reverse | gluon | 80 | 0.1875 | 0.2375 | 1.00× |
| reverse | lit | 80 | 0.4250 | 0.4375 | 2.27× |
| reverse | vue | 80 | 0.3000 | 0.3500 | 1.60× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.87× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000075 | 0.000075 | 1.00× |
| text | lit | 160000 | 0.000069 | 0.000075 | 0.92× |
| text | vue | 160000 | 0.000250 | 0.000256 | 3.33× |
| text | vanilla | 160000 | 0.000138 | 0.000150 | 1.83× |
| create | gluon | 24 | 0.4583 | 0.8333 | 1.00× |
| create | lit | 24 | 1.0833 | 1.2083 | 2.36× |
| create | vue | 24 | 0.4167 | 0.4583 | 0.91× |
| create | vanilla | 24 | 0.6667 | 0.8333 | 1.45× |
| update | gluon | 160 | 0.0875 | 0.0938 | 1.00× |
| update | lit | 160 | 0.1000 | 0.1062 | 1.14× |
| update | vue | 160 | 0.2062 | 0.2125 | 2.36× |
| update | vanilla | 160 | 0.1437 | 0.1563 | 1.64× |
| reverse | gluon | 80 | 0.2250 | 0.2375 | 1.00× |
| reverse | lit | 80 | 0.5125 | 0.5375 | 2.28× |
| reverse | vue | 80 | 0.2750 | 0.2875 | 1.22× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.72× |

Every individual measured sample is preserved in the accompanying JSON file.

## application

# Application benchmark evidence

Generated: 2026-10-04T18:15:40.081Z

Source: `84342c21fa401440addf5ea7d214b74e2d9bc4cd` on `codex/634-adjacent-keyed-swap` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.13.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, 5 warm-up rounds, 20 samples, three-action update batches, and correctness checks over 120 keyed product records with navigation landmarks, filtering, sorting, conditional product detail, configuration events, bag state, and teardown. Lower milliseconds per action is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 0.5000 | 1.1000 | 1.00× |
| mount | lit | 1 | 0.4000 | 0.9000 | 0.80× |
| mount | vue | 1 | 0.4000 | 0.6000 | 0.80× |
| filter | gluon | 3 | 0.1333 | 0.4667 | 1.00× |
| filter | lit | 3 | 0.1667 | 0.2333 | 1.25× |
| filter | vue | 3 | 0.1333 | 0.2000 | 1.00× |
| sort | gluon | 3 | 0.1000 | 0.1000 | 1.00× |
| sort | lit | 3 | 0.1000 | 0.1333 | 1.00× |
| sort | vue | 3 | 0.1333 | 0.1333 | 1.33× |
| configure | gluon | 3 | 0.0667 | 0.0667 | 1.00× |
| configure | lit | 3 | 0.0333 | 0.0333 | 0.50× |
| configure | vue | 3 | 0.0667 | 0.1000 | 1.00× |
| bag | gluon | 3 | 0.0333 | 0.0667 | 1.00× |
| bag | lit | 3 | 0.0333 | 0.0667 | 1.00× |
| bag | vue | 3 | 0.1000 | 0.1000 | 3.00× |
| teardown | gluon | 20 | 0.0500 | 0.0650 | 1.00× |
| teardown | lit | 20 | 0.0150 | 0.0200 | 0.30× |
| teardown | vue | 20 | 0.0250 | 0.0250 | 0.50× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 1.0000 | 2.0000 | 1.00× |
| mount | lit | 1 | 1.0000 | 2.0000 | 1.00× |
| mount | vue | 1 | 1.0000 | 1.0000 | 1.00× |
| filter | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| filter | lit | 3 | 0.3333 | 0.6667 | 1.00× |
| filter | vue | 3 | 0.3333 | 0.6667 | 1.00× |
| sort | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| sort | lit | 3 | 0.3333 | 0.6667 | n/a (timer resolution) |
| sort | vue | 3 | 0.3333 | 0.3333 | n/a (timer resolution) |
| configure | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | vue | 3 | 0.000000 | 1.0000 | n/a (timer resolution) |
| bag | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| teardown | gluon | 20 | 0.1000 | 0.5000 | 1.00× |
| teardown | lit | 20 | 0.0500 | 0.0500 | 0.50× |
| teardown | vue | 20 | 0.0500 | 0.0500 | 0.50× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 1.0000 | 1.0000 | 1.00× |
| mount | lit | 1 | 1.0000 | 1.0000 | 1.00× |
| mount | vue | 1 | 0.000000 | 1.0000 | n/a (timer resolution) |
| filter | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| filter | lit | 3 | 0.3333 | 0.3333 | 1.00× |
| filter | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| sort | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | lit | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | lit | 3 | 0.000000 | 0.000000 | n/a (timer resolution) |
| configure | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| teardown | gluon | 20 | 0.0500 | 0.1000 | 1.00× |
| teardown | lit | 20 | 0.000000 | 0.0500 | n/a (timer resolution) |
| teardown | vue | 20 | 0.0500 | 0.0500 | 1.00× |

Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

## hydration

# Cross-framework hydration benchmark evidence

Generated: 2026-10-04T18:15:44.088Z

Source: `84342c21fa401440addf5ea7d214b74e2d9bc4cd` on `codex/634-adjacent-keyed-swap` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.13.0, Lit 3.3.3 with SSR 4.1.0/1.1.8, Vue 3.5.39, Playwright 1.61.1

Method: 20 interleaved samples after 5 warm-ups. The server markup is installed before timing; hydration, row-119 interaction, and teardown are measured separately.

## chromium 149.0.7827.55

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 1.9000 / 2.3000 | 0.1000 / 0.2000 | 0.000000 / 0.2000 |
| lit | 27233 | 0.2000 / 0.3000 | 0.000000 / 0.1000 | 0.000000 / 0.1000 |
| vue | 10207 | 0.2000 / 0.3000 | 0.1000 / 0.2000 | 0.000000 / 0.1000 |

## firefox 151.0

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 3.0000 / 5.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |
| lit | 27233 | 0.000000 / 1.0000 | 0.000000 / 0.000000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |

## webkit 26.5

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 2.0000 / 2.0000 | 0.000000 / 0.000000 | 0.000000 / 1.0000 |
| lit | 27233 | 0.000000 / 1.0000 | 0.000000 / 0.000000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |

Correctness requires retained server main identity, 120 rows, a successful row-119 interaction, and an empty root after teardown. Cross-framework streaming, concurrent request capacity, and memory/GC behavior are outside this lane.

## ssr

# SSR comparison benchmark evidence

Generated: 2026-10-04T18:15:48.582Z

Source: `84342c21fa401440addf5ea7d214b74e2d9bc4cd` on `codex/634-adjacent-keyed-swap` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.13.0, Lit 3.3.3 with @lit-labs/ssr 4.1.0, Vue 3.5.39 with @vue/server-renderer 3.5.39

Method: 20 interleaved samples after 5 warm-ups, rotating framework order. The workload renders 120 keyed product rows in one catalog main/section/list tree. Lower milliseconds per complete string render is faster.

| Framework | Median ms | p95 ms | Markup bytes | vs Gluon |
| --- | ---: | ---: | ---: | ---: |
| gluon | 0.1292 | 0.1536 | 23615 | 1.00× |
| lit | 0.1497 | 0.2849 | 22886 | 1.16× |
| vue | 0.0780 | 0.1268 | 8051 | 0.60× |

This lane compares complete Node string rendering only. It does not claim streaming throughput, request concurrency, memory/GC behavior, or browser hydration equivalence.
Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

Raw JSON for every suite and every sample is embedded under `suites` in the accompanying JSON file.
Adjacent-swap focused evidence: [keyed-adjacent-swap-634.json](./keyed-adjacent-swap-634.json).

