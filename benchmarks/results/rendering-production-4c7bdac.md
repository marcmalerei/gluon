# Rendering benchmark evidence

Generated: 2026-07-15T10:40:23.353Z

Source: `4c7bdac8e82c155296eb99275fa0a441960b3a7d` on `codex/component-rendering-benchmarks` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.0.8, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 40 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 240000 | 0.000047 | 0.000048 | 1.00× |
| text | lit | 240000 | 0.000047 | 0.000049 | 1.02× |
| text | vue | 240000 | 0.000186 | 0.000203 | 3.99× |
| text | vanilla | 240000 | 0.000081 | 0.000098 | 1.73× |
| create | gluon | 21 | 0.2952 | 0.4381 | 1.00× |
| create | lit | 21 | 0.7857 | 0.9429 | 2.66× |
| create | vue | 21 | 0.3286 | 0.5810 | 1.11× |
| create | vanilla | 21 | 0.4619 | 0.6286 | 1.56× |
| update | gluon | 100 | 0.0620 | 0.0770 | 1.00× |
| update | lit | 100 | 0.0900 | 0.1130 | 1.45× |
| update | vue | 100 | 0.1750 | 0.1990 | 2.82× |
| update | vanilla | 100 | 0.1020 | 0.1200 | 1.65× |
| reverse | gluon | 70 | 0.1357 | 0.1614 | 1.00× |
| reverse | lit | 70 | 0.2657 | 0.2900 | 1.96× |
| reverse | vue | 70 | 0.2057 | 0.2371 | 1.52× |
| reverse | vanilla | 70 | 0.1157 | 0.1371 | 0.85× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 100000 | 0.000120 | 0.000130 | 1.00× |
| text | lit | 100000 | 0.000130 | 0.000130 | 1.08× |
| text | vue | 100000 | 0.000310 | 0.000320 | 2.58× |
| text | vanilla | 100000 | 0.000080 | 0.000090 | 0.67× |
| create | gluon | 24 | 0.6250 | 1.2083 | 1.00× |
| create | lit | 24 | 1.7083 | 4.5000 | 2.73× |
| create | vue | 24 | 0.6667 | 1.7083 | 1.07× |
| create | vanilla | 24 | 0.7083 | 1.1250 | 1.13× |
| update | gluon | 80 | 0.1125 | 0.1750 | 1.00× |
| update | lit | 80 | 0.1875 | 0.2250 | 1.67× |
| update | vue | 80 | 0.2500 | 1.2000 | 2.22× |
| update | vanilla | 80 | 0.1000 | 0.1125 | 0.89× |
| reverse | gluon | 80 | 0.2125 | 0.2750 | 1.00× |
| reverse | lit | 80 | 0.4125 | 0.6875 | 1.94× |
| reverse | vue | 80 | 0.3625 | 1.3250 | 1.71× |
| reverse | vanilla | 80 | 0.1750 | 0.2000 | 0.82× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000069 | 0.000075 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000081 | 1.09× |
| text | vue | 160000 | 0.000256 | 0.000262 | 3.73× |
| text | vanilla | 160000 | 0.000144 | 0.000150 | 2.09× |
| create | gluon | 24 | 0.4583 | 0.5000 | 1.00× |
| create | lit | 24 | 1.1250 | 1.8750 | 2.45× |
| create | vue | 24 | 0.4167 | 0.8333 | 0.91× |
| create | vanilla | 24 | 0.6667 | 0.8750 | 1.45× |
| update | gluon | 160 | 0.0750 | 0.0813 | 1.00× |
| update | lit | 160 | 0.1000 | 0.1125 | 1.33× |
| update | vue | 160 | 0.2062 | 0.2188 | 2.75× |
| update | vanilla | 160 | 0.1500 | 0.1563 | 2.00× |
| reverse | gluon | 80 | 0.2375 | 0.2625 | 1.00× |
| reverse | lit | 80 | 0.5000 | 0.5250 | 2.11× |
| reverse | vue | 80 | 0.2625 | 0.2750 | 1.11× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.68× |

Every individual measured sample is preserved in the accompanying JSON file.

