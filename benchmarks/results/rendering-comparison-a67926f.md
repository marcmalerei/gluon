# Rendering benchmark evidence

Generated: 2026-07-10T20:30:35.791Z

Source: `a67926ff58adec9b3fb0116bfd09dfa439737465` on `codex/rendering-benchmark-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 0.0.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 20 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 164000 | 0.000054 | 0.000061 | 1.00× |
| text | lit | 164000 | 0.000048 | 0.000052 | 0.88× |
| text | vue | 164000 | 0.000186 | 0.000207 | 3.43× |
| text | vanilla | 164000 | 0.000077 | 0.000092 | 1.42× |
| create | gluon | 21 | 1.8476 | 2.2762 | 1.00× |
| create | lit | 21 | 0.8619 | 1.0000 | 0.47× |
| create | vue | 21 | 0.3095 | 0.3429 | 0.17× |
| create | vanilla | 21 | 0.4429 | 0.6095 | 0.24× |
| update | gluon | 80 | 0.2088 | 0.2175 | 1.00× |
| update | lit | 80 | 0.0850 | 0.0938 | 0.41× |
| update | vue | 80 | 0.1563 | 0.1750 | 0.75× |
| update | vanilla | 80 | 0.0987 | 0.1038 | 0.47× |
| reverse | gluon | 70 | 0.4114 | 0.4657 | 1.00× |
| reverse | lit | 70 | 0.2586 | 0.2857 | 0.63× |
| reverse | vue | 70 | 0.2000 | 0.2257 | 0.49× |
| reverse | vanilla | 70 | 0.1129 | 0.1257 | 0.27× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000131 | 0.000144 | 1.00× |
| text | lit | 160000 | 0.000125 | 0.000138 | 0.95× |
| text | vue | 160000 | 0.000306 | 0.000338 | 2.33× |
| text | vanilla | 160000 | 0.000075 | 0.000087 | 0.57× |
| create | gluon | 24 | 3.5417 | 9.2083 | 1.00× |
| create | lit | 24 | 1.5417 | 4.4583 | 0.44× |
| create | vue | 24 | 0.5833 | 1.8750 | 0.16× |
| create | vanilla | 24 | 0.6250 | 1.1250 | 0.18× |
| update | gluon | 160 | 0.5000 | 0.7813 | 1.00× |
| update | lit | 160 | 0.2125 | 0.2625 | 0.42× |
| update | vue | 160 | 0.2313 | 1.2312 | 0.46× |
| update | vanilla | 160 | 0.0938 | 0.1062 | 0.19× |
| reverse | gluon | 80 | 0.9000 | 1.2000 | 1.00× |
| reverse | lit | 80 | 0.4375 | 0.5000 | 0.49× |
| reverse | vue | 80 | 0.3250 | 1.2625 | 0.36× |
| reverse | vanilla | 80 | 0.1875 | 0.1875 | 0.21× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000075 | 0.000081 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000087 | 1.00× |
| text | vue | 160000 | 0.000262 | 0.000294 | 3.50× |
| text | vanilla | 160000 | 0.000144 | 0.000150 | 1.92× |
| create | gluon | 24 | 2.5833 | 3.4167 | 1.00× |
| create | lit | 24 | 1.1250 | 1.2083 | 0.44× |
| create | vue | 24 | 0.4583 | 0.5000 | 0.18× |
| create | vanilla | 24 | 0.6667 | 0.7500 | 0.26× |
| update | gluon | 80 | 0.3000 | 0.3250 | 1.00× |
| update | lit | 80 | 0.1000 | 0.1000 | 0.33× |
| update | vue | 80 | 0.2125 | 0.2375 | 0.71× |
| update | vanilla | 80 | 0.1500 | 0.1750 | 0.50× |
| reverse | gluon | 80 | 0.7875 | 0.8625 | 1.00× |
| reverse | lit | 80 | 0.5000 | 0.5750 | 0.63× |
| reverse | vue | 80 | 0.2625 | 0.3000 | 0.33× |
| reverse | vanilla | 80 | 0.1625 | 0.1875 | 0.21× |

Every individual measured sample is preserved in the accompanying JSON file.

