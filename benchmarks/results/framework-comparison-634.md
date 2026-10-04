# Gluon vs Lit vs Vue framework comparison

Generated: 2026-10-04T17:27:24.883Z

Source: `a658185006db70b77bf85fe0a70a577ac3103668` on `codex/634-adjacent-keyed-swap` (working tree clean)

This report includes the complete current Gluon build at the recorded commit. The adjacent keyed-swap optimization and all other optimizations present in that build are therefore part of every Gluon measurement.

Method: 20 interleaved samples after 5 warm-ups; chromium, firefox, webkit where supported; lower milliseconds are faster.

Each suite keeps its own workload boundary and correctness checks. Ratios must not be combined across suites or generalized into a universal framework ranking.

## rendering

# Rendering benchmark evidence

Generated: 2026-10-04T17:27:07.167Z

Source: `a658185006db70b77bf85fe0a70a577ac3103668` on `codex/634-adjacent-keyed-swap` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.13.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 5 warm-up rounds, and 20 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 243000 | 0.000045 | 0.000047 | 1.00× |
| text | lit | 243000 | 0.000047 | 0.000048 | 1.03× |
| text | vue | 243000 | 0.000186 | 0.000190 | 4.10× |
| text | vanilla | 243000 | 0.000076 | 0.000087 | 1.68× |
| create | gluon | 36 | 0.3111 | 0.4528 | 1.00× |
| create | lit | 36 | 0.8667 | 1.0333 | 2.79× |
| create | vue | 36 | 0.3194 | 0.5056 | 1.03× |
| create | vanilla | 36 | 0.4361 | 0.6361 | 1.40× |
| update | gluon | 160 | 0.0719 | 0.0800 | 1.00× |
| update | lit | 160 | 0.0900 | 0.0956 | 1.25× |
| update | vue | 160 | 0.1688 | 0.1850 | 2.35× |
| update | vanilla | 160 | 0.0975 | 0.1094 | 1.36× |
| reverse | gluon | 70 | 0.1371 | 0.1686 | 1.00× |
| reverse | lit | 70 | 0.2586 | 0.2743 | 1.89× |
| reverse | vue | 70 | 0.2014 | 0.2129 | 1.47× |
| reverse | vanilla | 70 | 0.1157 | 0.1300 | 0.84× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 120000 | 0.000117 | 0.000125 | 1.00× |
| text | lit | 120000 | 0.000117 | 0.000125 | 1.00× |
| text | vue | 120000 | 0.000300 | 0.000308 | 2.57× |
| text | vanilla | 120000 | 0.000075 | 0.000083 | 0.64× |
| create | gluon | 24 | 0.5417 | 0.9167 | 1.00× |
| create | lit | 24 | 1.5000 | 1.6667 | 2.77× |
| create | vue | 24 | 0.5833 | 0.7917 | 1.08× |
| create | vanilla | 24 | 0.6250 | 0.7083 | 1.15× |
| update | gluon | 80 | 0.1500 | 0.2000 | 1.00× |
| update | lit | 80 | 0.1875 | 0.2250 | 1.25× |
| update | vue | 80 | 0.2250 | 0.7500 | 1.50× |
| update | vanilla | 80 | 0.0875 | 0.1125 | 0.58× |
| reverse | gluon | 80 | 0.1875 | 0.2250 | 1.00× |
| reverse | lit | 80 | 0.4250 | 0.4500 | 2.27× |
| reverse | vue | 80 | 0.3000 | 0.8625 | 1.60× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.87× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000075 | 0.000075 | 1.00× |
| text | lit | 160000 | 0.000069 | 0.000075 | 0.92× |
| text | vue | 160000 | 0.000256 | 0.000262 | 3.42× |
| text | vanilla | 160000 | 0.000138 | 0.000144 | 1.83× |
| create | gluon | 24 | 0.4583 | 0.8750 | 1.00× |
| create | lit | 24 | 1.1250 | 1.2500 | 2.45× |
| create | vue | 24 | 0.4167 | 0.4583 | 0.91× |
| create | vanilla | 24 | 0.6667 | 0.8333 | 1.45× |
| update | gluon | 80 | 0.0875 | 0.1000 | 1.00× |
| update | lit | 80 | 0.1000 | 0.1125 | 1.14× |
| update | vue | 80 | 0.2125 | 0.2125 | 2.43× |
| update | vanilla | 80 | 0.1500 | 0.1625 | 1.71× |
| reverse | gluon | 80 | 0.2250 | 0.2375 | 1.00× |
| reverse | lit | 80 | 0.5125 | 0.5375 | 2.28× |
| reverse | vue | 80 | 0.2750 | 0.2875 | 1.22× |
| reverse | vanilla | 80 | 0.1750 | 0.1750 | 0.78× |

Every individual measured sample is preserved in the accompanying JSON file.

## application

# Application benchmark evidence

Generated: 2026-10-04T17:27:16.029Z

Source: `a658185006db70b77bf85fe0a70a577ac3103668` on `codex/634-adjacent-keyed-swap` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.13.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, 5 warm-up rounds, 20 samples, three-action update batches, and correctness checks over 120 keyed product records with navigation landmarks, filtering, sorting, conditional product detail, configuration events, bag state, and teardown. Lower milliseconds per action is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 0.5000 | 1.0000 | 1.00× |
| mount | lit | 1 | 0.4000 | 1.1000 | 0.80× |
| mount | vue | 1 | 0.4000 | 0.6000 | 0.80× |
| filter | gluon | 3 | 0.1333 | 0.4667 | 1.00× |
| filter | lit | 3 | 0.1667 | 0.2000 | 1.25× |
| filter | vue | 3 | 0.1333 | 0.2000 | 1.00× |
| sort | gluon | 3 | 0.1000 | 0.1333 | 1.00× |
| sort | lit | 3 | 0.1000 | 0.1333 | 1.00× |
| sort | vue | 3 | 0.1333 | 0.1333 | 1.33× |
| configure | gluon | 3 | 0.0667 | 0.0667 | 1.00× |
| configure | lit | 3 | 0.0333 | 0.0667 | 0.50× |
| configure | vue | 3 | 0.0667 | 0.1000 | 1.00× |
| bag | gluon | 3 | 0.0333 | 0.0667 | 1.00× |
| bag | lit | 3 | 0.0333 | 0.0667 | 1.00× |
| bag | vue | 3 | 0.1000 | 0.1000 | 3.00× |
| teardown | gluon | 20 | 0.0550 | 0.0600 | 1.00× |
| teardown | lit | 20 | 0.0150 | 0.0200 | 0.27× |
| teardown | vue | 20 | 0.0200 | 0.0250 | 0.36× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 1.0000 | 2.0000 | 1.00× |
| mount | lit | 1 | 1.0000 | 1.0000 | 1.00× |
| mount | vue | 1 | 1.0000 | 1.0000 | 1.00× |
| filter | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| filter | lit | 3 | 0.3333 | 0.6667 | 1.00× |
| filter | vue | 3 | 0.3333 | 0.6667 | 1.00× |
| sort | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| sort | vue | 3 | 0.3333 | 0.3333 | 1.00× |
| configure | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | vue | 3 | 0.000000 | 1.0000 | n/a (timer resolution) |
| bag | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| teardown | gluon | 20 | 0.1000 | 0.1000 | 1.00× |
| teardown | lit | 20 | 0.000000 | 0.0500 | n/a (timer resolution) |
| teardown | vue | 20 | 0.0500 | 0.0500 | 0.50× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 1.0000 | 1.0000 | 1.00× |
| mount | lit | 1 | 1.0000 | 1.0000 | 1.00× |
| mount | vue | 1 | 0.000000 | 1.0000 | n/a (timer resolution) |
| filter | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| filter | lit | 3 | 0.3333 | 0.3333 | 1.00× |
| filter | vue | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | lit | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | vue | 3 | 0.000000 | 0.000000 | n/a (timer resolution) |
| configure | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| teardown | gluon | 20 | 0.0500 | 0.1000 | 1.00× |
| teardown | lit | 20 | 0.0500 | 0.0500 | 1.00× |
| teardown | vue | 20 | 0.0500 | 0.0500 | 1.00× |

Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

## hydration

# Cross-framework hydration benchmark evidence

Generated: 2026-10-04T17:27:20.648Z

Source: `a658185006db70b77bf85fe0a70a577ac3103668` on `codex/634-adjacent-keyed-swap` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.13.0, Lit 3.3.3 with SSR 4.1.0/1.1.8, Vue 3.5.39, Playwright 1.61.1

Method: 20 interleaved samples after 5 warm-ups. The server markup is installed before timing; hydration, row-119 interaction, and teardown are measured separately.

## chromium 149.0.7827.55

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 1.9000 / 2.7000 | 0.1000 / 0.2000 | 0.1000 / 0.2000 |
| lit | 27233 | 0.3000 / 0.4000 | 0.000000 / 0.1000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.2000 / 0.3000 | 0.1000 / 0.2000 | 0.000000 / 0.1000 |

## firefox 151.0

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 3.0000 / 4.0000 | 0.000000 / 1.0000 | 0.000000 / 1.0000 |
| lit | 27233 | 0.000000 / 1.0000 | 0.000000 / 0.000000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |

## webkit 26.5

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 2.0000 / 2.0000 | 0.000000 / 1.0000 | 0.000000 / 1.0000 |
| lit | 27233 | 0.000000 / 1.0000 | 0.000000 / 0.000000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |

Correctness requires retained server main identity, 120 rows, a successful row-119 interaction, and an empty root after teardown. Cross-framework streaming, concurrent request capacity, and memory/GC behavior are outside this lane.

## ssr

# SSR comparison benchmark evidence

Generated: 2026-10-04T17:27:24.766Z

Source: `a658185006db70b77bf85fe0a70a577ac3103668` on `codex/634-adjacent-keyed-swap` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.13.0, Lit 3.3.3 with @lit-labs/ssr 4.1.0, Vue 3.5.39 with @vue/server-renderer 3.5.39

Method: 20 interleaved samples after 5 warm-ups, rotating framework order. The workload renders 120 keyed product rows in one catalog main/section/list tree. Lower milliseconds per complete string render is faster.

| Framework | Median ms | p95 ms | Markup bytes | vs Gluon |
| --- | ---: | ---: | ---: | ---: |
| gluon | 0.1273 | 0.1370 | 23615 | 1.00× |
| lit | 0.1459 | 0.2909 | 22886 | 1.15× |
| vue | 0.0780 | 0.1518 | 8051 | 0.61× |

This lane compares complete Node string rendering only. It does not claim streaming throughput, request concurrency, memory/GC behavior, or browser hydration equivalence.
Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

Raw JSON for every suite and every sample is embedded under `suites` in the accompanying JSON file.
Adjacent-swap focused evidence: [keyed-adjacent-swap-634.json](./keyed-adjacent-swap-634.json).

