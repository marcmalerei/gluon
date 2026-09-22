# Rendering benchmark evidence

Generated: 2026-09-22T11:32:15.761Z

Source: `1156f222e2c2bdbd89eb4558ce52c9295acc15ee` on `detached` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 40 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000106 | 0.000112 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000087 | 0.71× |
| text | vue | 160000 | 0.000269 | 0.000369 | 2.53× |
| text | vanilla | 160000 | 0.000156 | 0.000162 | 1.47× |
| create | gluon | 24 | 0.5000 | 0.8333 | 1.00× |
| create | lit | 24 | 1.2083 | 2.2917 | 2.42× |
| create | vue | 24 | 0.4583 | 0.9167 | 0.92× |
| create | vanilla | 24 | 0.7500 | 0.9583 | 1.50× |
| update | gluon | 120 | 0.1000 | 0.1250 | 1.00× |
| update | lit | 120 | 0.1000 | 0.1083 | 1.00× |
| update | vue | 120 | 0.2083 | 0.2167 | 2.08× |
| update | vanilla | 120 | 0.1500 | 0.1583 | 1.50× |
| reverse | gluon | 80 | 0.2250 | 0.2500 | 1.00× |
| reverse | lit | 80 | 0.5250 | 0.5375 | 2.33× |
| reverse | vue | 80 | 0.2750 | 0.3000 | 1.22× |
| reverse | vanilla | 80 | 0.1625 | 0.1875 | 0.72× |

Every individual measured sample is preserved in the accompanying JSON file.
