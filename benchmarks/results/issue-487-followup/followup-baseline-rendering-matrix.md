# Rendering benchmark evidence

Generated: 2026-09-22T11:26:59.001Z

Source: `1156f222e2c2bdbd89eb4558ce52c9295acc15ee` on `detached` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 6 warm-up rounds, and 25 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 162000 | 0.000075 | 0.000080 | 1.00× |
| text | lit | 162000 | 0.000049 | 0.000052 | 0.66× |
| text | vue | 162000 | 0.000190 | 0.000210 | 2.52× |
| text | vanilla | 162000 | 0.000078 | 0.000093 | 1.04× |
| create | gluon | 36 | 0.3222 | 0.5389 | 1.00× |
| create | lit | 36 | 0.7722 | 0.8694 | 2.40× |
| create | vue | 36 | 0.3278 | 0.3972 | 1.02× |
| create | vanilla | 36 | 0.5306 | 0.5639 | 1.65× |
| update | gluon | 160 | 0.0800 | 0.0938 | 1.00× |
| update | lit | 160 | 0.0962 | 0.1100 | 1.20× |
| update | vue | 160 | 0.1725 | 0.1894 | 2.16× |
| update | vanilla | 160 | 0.1019 | 0.1144 | 1.27× |
| reverse | gluon | 120 | 0.1517 | 0.1617 | 1.00× |
| reverse | lit | 120 | 0.2642 | 0.2758 | 1.74× |
| reverse | vue | 120 | 0.2092 | 0.2192 | 1.38× |
| reverse | vanilla | 120 | 0.1167 | 0.1317 | 0.77× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 100000 | 0.000170 | 0.000190 | 1.00× |
| text | lit | 100000 | 0.000130 | 0.000140 | 0.76× |
| text | vue | 100000 | 0.000310 | 0.000320 | 1.82× |
| text | vanilla | 100000 | 0.000080 | 0.000100 | 0.47× |
| create | gluon | 24 | 0.7083 | 1.2500 | 1.00× |
| create | lit | 24 | 1.7500 | 4.6250 | 2.47× |
| create | vue | 24 | 0.6667 | 1.7917 | 0.94× |
| create | vanilla | 24 | 0.7500 | 1.1250 | 1.06× |
| update | gluon | 80 | 0.1625 | 0.2875 | 1.00× |
| update | lit | 80 | 0.2250 | 0.4500 | 1.38× |
| update | vue | 80 | 0.2750 | 1.3750 | 1.69× |
| update | vanilla | 80 | 0.1000 | 0.1750 | 0.62× |
| reverse | gluon | 40 | 0.2250 | 0.2750 | 1.00× |
| reverse | lit | 40 | 0.4500 | 0.5500 | 2.00× |
| reverse | vue | 40 | 0.3750 | 1.4250 | 1.67× |
| reverse | vanilla | 40 | 0.1750 | 0.2000 | 0.78× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000100 | 0.000106 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000081 | 0.75× |
| text | vue | 160000 | 0.000269 | 0.000281 | 2.69× |
| text | vanilla | 160000 | 0.000150 | 0.000156 | 1.50× |
| create | gluon | 24 | 0.5000 | 0.9167 | 1.00× |
| create | lit | 24 | 1.2083 | 2.0833 | 2.42× |
| create | vue | 24 | 0.4167 | 0.5000 | 0.83× |
| create | vanilla | 24 | 0.7083 | 0.7917 | 1.42× |
| update | gluon | 120 | 0.1083 | 0.1167 | 1.00× |
| update | lit | 120 | 0.1083 | 0.1083 | 1.00× |
| update | vue | 120 | 0.2167 | 0.2250 | 2.00× |
| update | vanilla | 120 | 0.1500 | 0.1583 | 1.38× |
| reverse | gluon | 80 | 0.2375 | 0.2500 | 1.00× |
| reverse | lit | 80 | 0.5375 | 0.5625 | 2.26× |
| reverse | vue | 80 | 0.2875 | 0.3000 | 1.21× |
| reverse | vanilla | 80 | 0.1750 | 0.1750 | 0.74× |

Every individual measured sample is preserved in the accompanying JSON file.

