# Rendering benchmark evidence

Generated: 2026-07-14T18:11:45.511Z

Source: `c52a25490903941dc7b7f02ac21d50dbc6d7b0cd` on `codex/optimize-template-cloning` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.0.7, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 20 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 270000 | 0.000149 | 0.000152 | 1.00× |
| text | lit | 270000 | 0.000047 | 0.000049 | 0.32× |
| text | vue | 270000 | 0.000186 | 0.000189 | 1.25× |
| text | vanilla | 270000 | 0.000078 | 0.000094 | 0.52× |
| create | gluon | 36 | 1.0556 | 1.3028 | 1.00× |
| create | lit | 36 | 0.9028 | 1.0028 | 0.86× |
| create | vue | 36 | 0.3278 | 0.4806 | 0.31× |
| create | vanilla | 36 | 0.4361 | 0.5056 | 0.41× |
| update | gluon | 160 | 0.1087 | 0.1194 | 1.00× |
| update | lit | 160 | 0.0919 | 0.0950 | 0.84× |
| update | vue | 160 | 0.1694 | 0.1888 | 1.56× |
| update | vanilla | 160 | 0.0987 | 0.1163 | 0.91× |
| reverse | gluon | 70 | 0.1800 | 0.2000 | 1.00× |
| reverse | lit | 70 | 0.2543 | 0.2743 | 1.41× |
| reverse | vue | 70 | 0.2029 | 0.2186 | 1.13× |
| reverse | vanilla | 70 | 0.1114 | 0.1343 | 0.62× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000244 | 0.000250 | 1.00× |
| text | lit | 160000 | 0.000125 | 0.000131 | 0.51× |
| text | vue | 160000 | 0.000300 | 0.000313 | 1.23× |
| text | vanilla | 160000 | 0.000075 | 0.000087 | 0.31× |
| create | gluon | 12 | 1.8333 | 2.1667 | 1.00× |
| create | lit | 12 | 1.4167 | 1.8333 | 0.77× |
| create | vue | 12 | 0.5833 | 0.8333 | 0.32× |
| create | vanilla | 12 | 0.6667 | 0.7500 | 0.36× |
| update | gluon | 80 | 0.2500 | 0.2875 | 1.00× |
| update | lit | 80 | 0.2000 | 0.2625 | 0.80× |
| update | vue | 80 | 0.2250 | 1.1750 | 0.90× |
| update | vanilla | 80 | 0.1000 | 0.1000 | 0.40× |
| reverse | gluon | 80 | 0.3250 | 0.3875 | 1.00× |
| reverse | lit | 80 | 0.4000 | 0.4000 | 1.23× |
| reverse | vue | 80 | 0.3375 | 0.5625 | 1.04× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.50× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000162 | 0.000169 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000075 | 0.46× |
| text | vue | 160000 | 0.000256 | 0.000256 | 1.58× |
| text | vanilla | 160000 | 0.000144 | 0.000150 | 0.88× |
| create | gluon | 24 | 1.2917 | 1.9583 | 1.00× |
| create | lit | 24 | 1.1250 | 1.1667 | 0.87× |
| create | vue | 24 | 0.4167 | 0.5000 | 0.32× |
| create | vanilla | 24 | 0.6667 | 0.7917 | 0.52× |
| update | gluon | 120 | 0.1500 | 0.1583 | 1.00× |
| update | lit | 120 | 0.1083 | 0.1167 | 0.72× |
| update | vue | 120 | 0.2083 | 0.2083 | 1.39× |
| update | vanilla | 120 | 0.1500 | 0.1583 | 1.00× |
| reverse | gluon | 80 | 0.3000 | 0.3250 | 1.00× |
| reverse | lit | 80 | 0.5125 | 0.5250 | 1.71× |
| reverse | vue | 80 | 0.2625 | 0.2750 | 0.88× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.54× |

Every individual measured sample is preserved in the accompanying JSON file.

