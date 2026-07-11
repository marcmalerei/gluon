# Rendering benchmark evidence

Generated: 2026-07-11T06:06:51.306Z

Source: `4c0f0b9aec151ce89a2d2ea2190bd4634212479a` on `codex/rendering-benchmark-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 0.0.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 20 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 320000 | 0.000054 | 0.000060 | 1.00× |
| text | lit | 320000 | 0.000047 | 0.000052 | 0.87× |
| text | vue | 320000 | 0.000185 | 0.000193 | 3.44× |
| text | vanilla | 320000 | 0.000081 | 0.000103 | 1.50× |
| create | gluon | 36 | 1.2083 | 1.3694 | 1.00× |
| create | lit | 36 | 0.9333 | 1.1139 | 0.77× |
| create | vue | 36 | 0.3194 | 0.5472 | 0.26× |
| create | vanilla | 36 | 0.4389 | 0.6417 | 0.36× |
| update | gluon | 160 | 0.0794 | 0.0956 | 1.00× |
| update | lit | 160 | 0.0869 | 0.0994 | 1.09× |
| update | vue | 160 | 0.1694 | 0.1913 | 2.13× |
| update | vanilla | 160 | 0.1000 | 0.1187 | 1.26× |
| reverse | gluon | 70 | 0.1500 | 0.1729 | 1.00× |
| reverse | lit | 70 | 0.2543 | 0.2814 | 1.70× |
| reverse | vue | 70 | 0.2057 | 0.2257 | 1.37× |
| reverse | vanilla | 70 | 0.1114 | 0.1371 | 0.74× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000131 | 0.000156 | 1.00× |
| text | lit | 160000 | 0.000131 | 0.000144 | 1.00× |
| text | vue | 160000 | 0.000313 | 0.000356 | 2.38× |
| text | vanilla | 160000 | 0.000081 | 0.000094 | 0.62× |
| create | gluon | 24 | 2.0417 | 6.6250 | 1.00× |
| create | lit | 24 | 1.5833 | 3.5833 | 0.78× |
| create | vue | 24 | 0.5833 | 1.9167 | 0.29× |
| create | vanilla | 24 | 0.6667 | 1.0833 | 0.33× |
| update | gluon | 160 | 0.1563 | 0.1688 | 1.00× |
| update | lit | 160 | 0.2000 | 0.2687 | 1.28× |
| update | vue | 160 | 0.2188 | 1.1938 | 1.40× |
| update | vanilla | 160 | 0.0938 | 0.1062 | 0.60× |
| reverse | gluon | 80 | 0.2250 | 0.2750 | 1.00× |
| reverse | lit | 80 | 0.4125 | 0.5000 | 1.83× |
| reverse | vue | 80 | 0.3000 | 0.4250 | 1.33× |
| reverse | vanilla | 80 | 0.1625 | 0.2000 | 0.72× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000075 | 0.000087 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000081 | 1.00× |
| text | vue | 160000 | 0.000256 | 0.000294 | 3.42× |
| text | vanilla | 160000 | 0.000144 | 0.000169 | 1.92× |
| create | gluon | 24 | 1.7083 | 2.2500 | 1.00× |
| create | lit | 24 | 1.1250 | 1.7917 | 0.66× |
| create | vue | 24 | 0.4167 | 0.4583 | 0.24× |
| create | vanilla | 24 | 0.6667 | 0.8333 | 0.39× |
| update | gluon | 80 | 0.0875 | 0.1000 | 1.00× |
| update | lit | 80 | 0.1000 | 0.1125 | 1.14× |
| update | vue | 80 | 0.2250 | 0.2500 | 2.57× |
| update | vanilla | 80 | 0.1500 | 0.1750 | 1.71× |
| reverse | gluon | 80 | 0.2750 | 0.2875 | 1.00× |
| reverse | lit | 80 | 0.5250 | 0.5875 | 1.91× |
| reverse | vue | 80 | 0.2750 | 0.3125 | 1.00× |
| reverse | vanilla | 80 | 0.1750 | 0.2000 | 0.64× |

Every individual measured sample is preserved in the accompanying JSON file.

