# Rendering benchmark evidence

Generated: 2026-10-04T13:48:16.262Z

Source: `0935bc295f526d8b5a4606a05727753409edd8af` on `detached` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.13.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 30 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 246000 | 0.000047 | 0.000049 | 1.00× |
| text | lit | 246000 | 0.000047 | 0.000049 | 1.00× |
| text | vue | 246000 | 0.000188 | 0.000201 | 3.98× |
| text | vanilla | 246000 | 0.000076 | 0.000096 | 1.62× |
| create | gluon | 42 | 0.3048 | 0.5167 | 1.00× |
| create | lit | 42 | 0.8905 | 1.1238 | 2.92× |
| create | vue | 42 | 0.3143 | 0.4405 | 1.03× |
| create | vanilla | 42 | 0.4381 | 0.5143 | 1.44× |
| update | gluon | 160 | 0.0763 | 0.0925 | 1.00× |
| update | lit | 160 | 0.0875 | 0.0950 | 1.15× |
| update | vue | 160 | 0.1694 | 0.1869 | 2.22× |
| update | vanilla | 160 | 0.1013 | 0.1119 | 1.33× |
| reverse | gluon | 70 | 0.1400 | 0.1543 | 1.00× |
| reverse | lit | 70 | 0.2571 | 0.2771 | 1.84× |
| reverse | vue | 70 | 0.1986 | 0.2186 | 1.42× |
| reverse | vanilla | 70 | 0.1157 | 0.1357 | 0.83× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 120000 | 0.000117 | 0.000125 | 1.00× |
| text | lit | 120000 | 0.000117 | 0.000125 | 1.00× |
| text | vue | 120000 | 0.000300 | 0.000308 | 2.57× |
| text | vanilla | 120000 | 0.000075 | 0.000083 | 0.64× |
| create | gluon | 24 | 0.5417 | 0.9167 | 1.00× |
| create | lit | 24 | 1.5417 | 4.5417 | 2.85× |
| create | vue | 24 | 0.5833 | 1.6667 | 1.08× |
| create | vanilla | 24 | 0.6667 | 1.1250 | 1.23× |
| update | gluon | 80 | 0.1500 | 0.2000 | 1.00× |
| update | lit | 80 | 0.2000 | 0.2625 | 1.33× |
| update | vue | 80 | 0.2375 | 1.2000 | 1.58× |
| update | vanilla | 80 | 0.1000 | 0.1000 | 0.67× |
| reverse | gluon | 80 | 0.1875 | 0.2250 | 1.00× |
| reverse | lit | 80 | 0.4375 | 0.4750 | 2.33× |
| reverse | vue | 80 | 0.3000 | 1.2500 | 1.60× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.87× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000075 | 0.000081 | 1.00× |
| text | lit | 160000 | 0.000081 | 0.000087 | 1.08× |
| text | vue | 160000 | 0.000256 | 0.000262 | 3.42× |
| text | vanilla | 160000 | 0.000144 | 0.000150 | 1.92× |
| create | gluon | 24 | 0.4583 | 0.8333 | 1.00× |
| create | lit | 24 | 1.1250 | 1.5833 | 2.45× |
| create | vue | 24 | 0.4167 | 0.8750 | 0.91× |
| create | vanilla | 24 | 0.7083 | 1.1667 | 1.55× |
| update | gluon | 160 | 0.0875 | 0.0938 | 1.00× |
| update | lit | 160 | 0.1000 | 0.1062 | 1.14× |
| update | vue | 160 | 0.2062 | 0.2125 | 2.36× |
| update | vanilla | 160 | 0.1500 | 0.1563 | 1.71× |
| reverse | gluon | 80 | 0.2000 | 0.2250 | 1.00× |
| reverse | lit | 80 | 0.5125 | 0.5250 | 2.56× |
| reverse | vue | 80 | 0.2625 | 0.2875 | 1.31× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.81× |

Every individual measured sample is preserved in the accompanying JSON file.

