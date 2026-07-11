# Rendering benchmark evidence

Generated: 2026-07-11T16:58:56.848Z

Source: `55206f44fbf67f423218b1666108b98fd2fd5ffe` on `codex/issue-81-single-node-insertion` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 0.0.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 20 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 243000 | 0.000053 | 0.000056 | 1.00× |
| text | lit | 243000 | 0.000047 | 0.000053 | 0.87× |
| text | vue | 243000 | 0.000186 | 0.000209 | 3.48× |
| text | vanilla | 243000 | 0.000079 | 0.000102 | 1.47× |
| create | gluon | 36 | 1.1472 | 1.4250 | 1.00× |
| create | lit | 36 | 0.9222 | 1.0556 | 0.80× |
| create | vue | 36 | 0.3306 | 0.4944 | 0.29× |
| create | vanilla | 36 | 0.4361 | 0.4944 | 0.38× |
| update | gluon | 160 | 0.0737 | 0.0825 | 1.00× |
| update | lit | 160 | 0.0900 | 0.1044 | 1.22× |
| update | vue | 160 | 0.1731 | 0.1869 | 2.35× |
| update | vanilla | 160 | 0.1019 | 0.1150 | 1.38× |
| reverse | gluon | 70 | 0.1500 | 0.1757 | 1.00× |
| reverse | lit | 70 | 0.2614 | 0.2900 | 1.74× |
| reverse | vue | 70 | 0.2114 | 0.2429 | 1.41× |
| reverse | vanilla | 70 | 0.1157 | 0.1300 | 0.77× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 120000 | 0.000125 | 0.000133 | 1.00× |
| text | lit | 120000 | 0.000125 | 0.000133 | 1.00× |
| text | vue | 120000 | 0.000300 | 0.000342 | 2.40× |
| text | vanilla | 120000 | 0.000075 | 0.000092 | 0.60× |
| create | gluon | 24 | 1.9167 | 6.0417 | 1.00× |
| create | lit | 24 | 1.5833 | 4.5833 | 0.83× |
| create | vue | 24 | 0.6250 | 1.6250 | 0.33× |
| create | vanilla | 24 | 0.7083 | 1.0833 | 0.37× |
| update | gluon | 80 | 0.1625 | 0.2500 | 1.00× |
| update | lit | 80 | 0.2000 | 0.2625 | 1.23× |
| update | vue | 80 | 0.2750 | 1.1875 | 1.69× |
| update | vanilla | 80 | 0.1000 | 0.1125 | 0.62× |
| reverse | gluon | 80 | 0.2250 | 0.2750 | 1.00× |
| reverse | lit | 80 | 0.4375 | 0.5000 | 1.94× |
| reverse | vue | 80 | 0.3125 | 1.2625 | 1.39× |
| reverse | vanilla | 80 | 0.1750 | 0.1875 | 0.78× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000075 | 0.000087 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000087 | 1.00× |
| text | vue | 160000 | 0.000262 | 0.000281 | 3.50× |
| text | vanilla | 160000 | 0.000144 | 0.000162 | 1.92× |
| create | gluon | 24 | 1.4583 | 2.0833 | 1.00× |
| create | lit | 24 | 1.1667 | 1.7500 | 0.80× |
| create | vue | 24 | 0.4167 | 0.5000 | 0.29× |
| create | vanilla | 24 | 0.6667 | 0.7500 | 0.46× |
| update | gluon | 160 | 0.0875 | 0.0938 | 1.00× |
| update | lit | 160 | 0.1062 | 0.1250 | 1.21× |
| update | vue | 160 | 0.2188 | 0.2313 | 2.50× |
| update | vanilla | 160 | 0.1500 | 0.1625 | 1.71× |
| reverse | gluon | 80 | 0.2625 | 0.2875 | 1.00× |
| reverse | lit | 80 | 0.5250 | 0.5625 | 2.00× |
| reverse | vue | 80 | 0.2625 | 0.2875 | 1.00× |
| reverse | vanilla | 80 | 0.1625 | 0.1875 | 0.62× |

Every individual measured sample is preserved in the accompanying JSON file.

