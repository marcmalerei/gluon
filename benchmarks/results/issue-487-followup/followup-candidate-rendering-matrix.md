# Rendering benchmark evidence

Generated: 2026-09-22T11:30:32.961Z

Source: `4f1cbd67f21eea5d2269154fc08ba227841231ed` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 6 warm-up rounds, and 25 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 243000 | 0.000060 | 0.000084 | 1.00× |
| text | lit | 243000 | 0.000049 | 0.000051 | 0.81× |
| text | vue | 243000 | 0.000193 | 0.000212 | 3.19× |
| text | vanilla | 243000 | 0.000080 | 0.000091 | 1.33× |
| create | gluon | 42 | 0.3095 | 0.5119 | 1.00× |
| create | lit | 42 | 0.9048 | 1.1524 | 2.92× |
| create | vue | 42 | 0.3190 | 0.5405 | 1.03× |
| create | vanilla | 42 | 0.4524 | 0.5238 | 1.46× |
| update | gluon | 160 | 0.0806 | 0.1000 | 1.00× |
| update | lit | 160 | 0.0913 | 0.1000 | 1.13× |
| update | vue | 160 | 0.1725 | 0.1913 | 2.14× |
| update | vanilla | 160 | 0.1025 | 0.1212 | 1.27× |
| reverse | gluon | 70 | 0.1529 | 0.1929 | 1.00× |
| reverse | lit | 70 | 0.2657 | 0.3057 | 1.74× |
| reverse | vue | 70 | 0.2086 | 0.2786 | 1.36× |
| reverse | vanilla | 70 | 0.1200 | 0.1500 | 0.79× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 100000 | 0.000140 | 0.000180 | 1.00× |
| text | lit | 100000 | 0.000130 | 0.000140 | 0.93× |
| text | vue | 100000 | 0.000310 | 0.000330 | 2.21× |
| text | vanilla | 100000 | 0.000080 | 0.000090 | 0.57× |
| create | gluon | 12 | 0.6667 | 1.1667 | 1.00× |
| create | lit | 12 | 1.8333 | 4.2500 | 2.75× |
| create | vue | 12 | 0.6667 | 1.9167 | 1.00× |
| create | vanilla | 12 | 0.7500 | 1.1667 | 1.13× |
| update | gluon | 80 | 0.1500 | 0.2000 | 1.00× |
| update | lit | 80 | 0.1875 | 0.2375 | 1.25× |
| update | vue | 80 | 0.2375 | 1.2125 | 1.58× |
| update | vanilla | 80 | 0.1000 | 0.1250 | 0.67× |
| reverse | gluon | 80 | 0.2125 | 0.2625 | 1.00× |
| reverse | lit | 80 | 0.4375 | 0.5000 | 2.06× |
| reverse | vue | 80 | 0.3125 | 0.4000 | 1.47× |
| reverse | vanilla | 80 | 0.1750 | 0.2000 | 0.82× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000081 | 0.000087 | 1.00× |
| text | lit | 160000 | 0.000081 | 0.000087 | 1.00× |
| text | vue | 160000 | 0.000269 | 0.000275 | 3.31× |
| text | vanilla | 160000 | 0.000150 | 0.000156 | 1.85× |
| create | gluon | 24 | 0.5417 | 1.0000 | 1.00× |
| create | lit | 24 | 1.1667 | 1.2917 | 2.15× |
| create | vue | 24 | 0.4583 | 1.3750 | 0.85× |
| create | vanilla | 24 | 0.7083 | 0.8333 | 1.31× |
| update | gluon | 120 | 0.1000 | 0.1083 | 1.00× |
| update | lit | 120 | 0.1083 | 0.1167 | 1.08× |
| update | vue | 120 | 0.2167 | 0.2333 | 2.17× |
| update | vanilla | 120 | 0.1583 | 0.1583 | 1.58× |
| reverse | gluon | 80 | 0.2375 | 0.3000 | 1.00× |
| reverse | lit | 80 | 0.5500 | 0.6250 | 2.32× |
| reverse | vue | 80 | 0.3000 | 0.3250 | 1.26× |
| reverse | vanilla | 80 | 0.1750 | 0.2000 | 0.74× |

Every individual measured sample is preserved in the accompanying JSON file.
