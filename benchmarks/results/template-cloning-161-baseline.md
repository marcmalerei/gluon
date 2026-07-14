# Rendering benchmark evidence

Generated: 2026-07-14T18:02:15.293Z

Source: `835c8d13295da1ea63508156b86bd88bb7737b59` on `codex/optimize-template-cloning` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.0.7, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 20 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 200000 | 0.000147 | 0.000150 | 1.00× |
| text | lit | 200000 | 0.000046 | 0.000048 | 0.32× |
| text | vue | 200000 | 0.000184 | 0.000197 | 1.25× |
| text | vanilla | 200000 | 0.000075 | 0.000089 | 0.51× |
| create | gluon | 24 | 1.1625 | 1.3292 | 1.00× |
| create | lit | 24 | 0.7708 | 1.0125 | 0.66× |
| create | vue | 24 | 0.3125 | 0.5542 | 0.27× |
| create | vanilla | 24 | 0.4333 | 0.4667 | 0.37× |
| update | gluon | 160 | 0.1050 | 0.1125 | 1.00× |
| update | lit | 160 | 0.0888 | 0.0925 | 0.85× |
| update | vue | 160 | 0.1675 | 0.1837 | 1.60× |
| update | vanilla | 160 | 0.0987 | 0.1056 | 0.94× |
| reverse | gluon | 70 | 0.1900 | 0.1986 | 1.00× |
| reverse | lit | 70 | 0.2543 | 0.2757 | 1.34× |
| reverse | vue | 70 | 0.2043 | 0.2214 | 1.08× |
| reverse | vanilla | 70 | 0.1143 | 0.1314 | 0.60× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 120000 | 0.000242 | 0.000250 | 1.00× |
| text | lit | 120000 | 0.000117 | 0.000125 | 0.48× |
| text | vue | 120000 | 0.000308 | 0.000317 | 1.28× |
| text | vanilla | 120000 | 0.000075 | 0.000083 | 0.31× |
| create | gluon | 24 | 1.8333 | 5.6667 | 1.00× |
| create | lit | 24 | 1.5833 | 3.3750 | 0.86× |
| create | vue | 24 | 0.5833 | 0.8333 | 0.32× |
| create | vanilla | 24 | 0.6667 | 0.7917 | 0.36× |
| update | gluon | 80 | 0.2625 | 0.3375 | 1.00× |
| update | lit | 80 | 0.1875 | 0.2125 | 0.71× |
| update | vue | 80 | 0.2500 | 1.1875 | 0.95× |
| update | vanilla | 80 | 0.1000 | 0.1125 | 0.38× |
| reverse | gluon | 80 | 0.3250 | 0.4000 | 1.00× |
| reverse | lit | 80 | 0.4250 | 0.4625 | 1.31× |
| reverse | vue | 80 | 0.3000 | 1.2500 | 0.92× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.50× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000156 | 0.000162 | 1.00× |
| text | lit | 160000 | 0.000069 | 0.000075 | 0.44× |
| text | vue | 160000 | 0.000256 | 0.000256 | 1.64× |
| text | vanilla | 160000 | 0.000138 | 0.000150 | 0.88× |
| create | gluon | 24 | 1.2917 | 1.9167 | 1.00× |
| create | lit | 24 | 1.0833 | 1.2083 | 0.84× |
| create | vue | 24 | 0.4167 | 0.4583 | 0.32× |
| create | vanilla | 24 | 0.6667 | 0.7917 | 0.52× |
| update | gluon | 80 | 0.1500 | 0.1625 | 1.00× |
| update | lit | 80 | 0.1000 | 0.1000 | 0.67× |
| update | vue | 80 | 0.2000 | 0.2125 | 1.33× |
| update | vanilla | 80 | 0.1500 | 0.1625 | 1.00× |
| reverse | gluon | 80 | 0.3125 | 0.3500 | 1.00× |
| reverse | lit | 80 | 0.5125 | 0.5250 | 1.64× |
| reverse | vue | 80 | 0.2625 | 0.2875 | 0.84× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.52× |

Every individual measured sample is preserved in the accompanying JSON file.

