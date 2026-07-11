# Rendering benchmark evidence

Generated: 2026-07-11T17:26:55.348Z

Source: `e8c4e9add433cb6629d3768d73e96cc32826f956` on `codex/issue-83-reviewed-traversal` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 0.0.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 20 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 240000 | 0.000054 | 0.000060 | 1.00× |
| text | lit | 240000 | 0.000046 | 0.000051 | 0.85× |
| text | vue | 240000 | 0.000189 | 0.000207 | 3.48× |
| text | vanilla | 240000 | 0.000076 | 0.000085 | 1.40× |
| create | gluon | 42 | 1.0405 | 1.2667 | 1.00× |
| create | lit | 42 | 0.9548 | 1.1738 | 0.92× |
| create | vue | 42 | 0.3214 | 0.4810 | 0.31× |
| create | vanilla | 42 | 0.4452 | 0.4857 | 0.43× |
| update | gluon | 160 | 0.0763 | 0.0856 | 1.00× |
| update | lit | 160 | 0.0881 | 0.0969 | 1.16× |
| update | vue | 160 | 0.1681 | 0.1831 | 2.20× |
| update | vanilla | 160 | 0.1069 | 0.1206 | 1.40× |
| reverse | gluon | 140 | 0.1471 | 0.1714 | 1.00× |
| reverse | lit | 140 | 0.2564 | 0.2850 | 1.74× |
| reverse | vue | 140 | 0.2093 | 0.2279 | 1.42× |
| reverse | vanilla | 140 | 0.1093 | 0.1221 | 0.74× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000125 | 0.000138 | 1.00× |
| text | lit | 160000 | 0.000125 | 0.000138 | 1.00× |
| text | vue | 160000 | 0.000313 | 0.000338 | 2.50× |
| text | vanilla | 160000 | 0.000081 | 0.000087 | 0.65× |
| create | gluon | 24 | 1.6250 | 3.3750 | 1.00× |
| create | lit | 24 | 1.5833 | 4.7083 | 0.97× |
| create | vue | 24 | 0.5833 | 1.7500 | 0.36× |
| create | vanilla | 24 | 0.6667 | 1.1250 | 0.41× |
| update | gluon | 80 | 0.1625 | 0.2250 | 1.00× |
| update | lit | 80 | 0.2000 | 0.2500 | 1.23× |
| update | vue | 80 | 0.2500 | 1.1875 | 1.54× |
| update | vanilla | 80 | 0.1000 | 0.1125 | 0.62× |
| reverse | gluon | 80 | 0.2250 | 0.2625 | 1.00× |
| reverse | lit | 80 | 0.4375 | 0.5250 | 1.94× |
| reverse | vue | 80 | 0.3000 | 1.2750 | 1.33× |
| reverse | vanilla | 80 | 0.1750 | 0.1875 | 0.78× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000075 | 0.000087 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000087 | 1.00× |
| text | vue | 160000 | 0.000275 | 0.000306 | 3.67× |
| text | vanilla | 160000 | 0.000144 | 0.000156 | 1.92× |
| create | gluon | 24 | 1.2500 | 1.9167 | 1.00× |
| create | lit | 24 | 1.1667 | 1.3750 | 0.93× |
| create | vue | 24 | 0.4167 | 0.5000 | 0.33× |
| create | vanilla | 24 | 0.7083 | 0.7917 | 0.57× |
| update | gluon | 160 | 0.0875 | 0.0938 | 1.00× |
| update | lit | 160 | 0.1000 | 0.1062 | 1.14× |
| update | vue | 160 | 0.2125 | 0.2500 | 2.43× |
| update | vanilla | 160 | 0.1563 | 0.1688 | 1.79× |
| reverse | gluon | 80 | 0.2500 | 0.3125 | 1.00× |
| reverse | lit | 80 | 0.5125 | 0.5500 | 2.05× |
| reverse | vue | 80 | 0.2625 | 0.2875 | 1.05× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.65× |

Every individual measured sample is preserved in the accompanying JSON file.
