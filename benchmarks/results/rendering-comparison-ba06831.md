# Rendering benchmark evidence

Generated: 2026-07-10T20:06:13.753Z

Source: `ba06831469592f3c183d98782f1b8a0566126a50` on `codex/rendering-benchmark-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 0.0.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 40 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 200000 | 0.000266 | 0.000303 | 1.00× |
| text | lit | 200000 | 0.000047 | 0.000053 | 0.17× |
| text | vue | 200000 | 0.000184 | 0.000213 | 0.69× |
| text | vanilla | 200000 | 0.000077 | 0.000087 | 0.29× |
| create | gluon | 42 | 1.8310 | 2.0810 | 1.00× |
| create | lit | 42 | 0.8714 | 1.0238 | 0.48× |
| create | vue | 42 | 0.3262 | 0.4786 | 0.18× |
| create | vanilla | 42 | 0.4571 | 0.5214 | 0.25× |
| update | gluon | 160 | 0.3513 | 0.3900 | 1.00× |
| update | lit | 160 | 0.0819 | 0.0938 | 0.23× |
| update | vue | 160 | 0.1656 | 0.1837 | 0.47× |
| update | vanilla | 160 | 0.0994 | 0.1113 | 0.28× |
| reverse | gluon | 70 | 0.4771 | 0.5357 | 1.00× |
| reverse | lit | 70 | 0.2557 | 0.2829 | 0.54× |
| reverse | vue | 70 | 0.1971 | 0.2157 | 0.41× |
| reverse | vanilla | 70 | 0.1114 | 0.1329 | 0.23× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 192000 | 0.000245 | 0.000271 | 1.00× |
| text | lit | 192000 | 0.000120 | 0.000141 | 0.49× |
| text | vue | 192000 | 0.000302 | 0.000333 | 1.23× |
| text | vanilla | 192000 | 0.000078 | 0.000089 | 0.32× |
| create | gluon | 12 | 3.7500 | 10.3333 | 1.00× |
| create | lit | 12 | 1.5000 | 4.5833 | 0.40× |
| create | vue | 12 | 0.6667 | 1.9167 | 0.18× |
| create | vanilla | 12 | 0.6667 | 1.0833 | 0.18× |
| update | gluon | 160 | 0.7688 | 1.4063 | 1.00× |
| update | lit | 160 | 0.1875 | 0.2188 | 0.24× |
| update | vue | 160 | 0.2313 | 1.1875 | 0.30× |
| update | vanilla | 160 | 0.0938 | 0.1062 | 0.12× |
| reverse | gluon | 80 | 0.9625 | 1.5250 | 1.00× |
| reverse | lit | 80 | 0.4250 | 0.5000 | 0.44× |
| reverse | vue | 80 | 0.3000 | 0.7000 | 0.31× |
| reverse | vanilla | 80 | 0.1875 | 0.2125 | 0.19× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000156 | 0.000181 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000087 | 0.48× |
| text | vue | 160000 | 0.000262 | 0.000294 | 1.68× |
| text | vanilla | 160000 | 0.000150 | 0.000175 | 0.96× |
| create | gluon | 24 | 2.6667 | 3.5417 | 1.00× |
| create | lit | 24 | 1.1667 | 1.7917 | 0.44× |
| create | vue | 24 | 0.4583 | 0.5000 | 0.17× |
| create | vanilla | 24 | 0.7083 | 0.7917 | 0.27× |
| update | gluon | 80 | 0.5875 | 0.6500 | 1.00× |
| update | lit | 80 | 0.1000 | 0.1125 | 0.17× |
| update | vue | 80 | 0.2250 | 0.2375 | 0.38× |
| update | vanilla | 80 | 0.1500 | 0.1625 | 0.26× |
| reverse | gluon | 40 | 0.8750 | 0.9750 | 1.00× |
| reverse | lit | 40 | 0.5000 | 0.5750 | 0.57× |
| reverse | vue | 40 | 0.2750 | 0.3250 | 0.31× |
| reverse | vanilla | 40 | 0.1750 | 0.2000 | 0.20× |

Every individual measured sample is preserved in the accompanying JSON file.

