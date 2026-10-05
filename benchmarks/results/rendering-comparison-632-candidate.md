# Rendering benchmark evidence

Generated: 2026-10-04T13:49:43.063Z

Source: `97f3cb073554e4b58db0c472eff1c5c6f15dbbb1` on `codex/632-single-root-render` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.13.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 30 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 324000 | 0.000048 | 0.000050 | 1.00× |
| text | lit | 324000 | 0.000047 | 0.000049 | 0.98× |
| text | vue | 324000 | 0.000185 | 0.000203 | 3.86× |
| text | vanilla | 324000 | 0.000076 | 0.000095 | 1.58× |
| create | gluon | 42 | 0.2905 | 0.4333 | 1.00× |
| create | lit | 42 | 0.8238 | 1.1048 | 2.84× |
| create | vue | 42 | 0.3214 | 0.5000 | 1.11× |
| create | vanilla | 42 | 0.4452 | 0.5190 | 1.53× |
| update | gluon | 160 | 0.0788 | 0.0925 | 1.00× |
| update | lit | 160 | 0.0919 | 0.1025 | 1.17× |
| update | vue | 160 | 0.1700 | 0.1894 | 2.16× |
| update | vanilla | 160 | 0.1006 | 0.1112 | 1.28× |
| reverse | gluon | 70 | 0.1400 | 0.1614 | 1.00× |
| reverse | lit | 70 | 0.2614 | 0.2829 | 1.87× |
| reverse | vue | 70 | 0.2000 | 0.2186 | 1.43× |
| reverse | vanilla | 70 | 0.1143 | 0.1329 | 0.82× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000119 | 0.000125 | 1.00× |
| text | lit | 160000 | 0.000119 | 0.000125 | 1.00× |
| text | vue | 160000 | 0.000300 | 0.000306 | 2.53× |
| text | vanilla | 160000 | 0.000081 | 0.000087 | 0.68× |
| create | gluon | 24 | 0.5417 | 1.1667 | 1.00× |
| create | lit | 24 | 1.5417 | 4.2500 | 2.85× |
| create | vue | 24 | 0.5833 | 1.8750 | 1.08× |
| create | vanilla | 24 | 0.6667 | 1.0417 | 1.23× |
| update | gluon | 80 | 0.1375 | 0.1750 | 1.00× |
| update | lit | 80 | 0.1875 | 0.2250 | 1.36× |
| update | vue | 80 | 0.2375 | 1.0500 | 1.73× |
| update | vanilla | 80 | 0.1000 | 0.1000 | 0.73× |
| reverse | gluon | 80 | 0.2000 | 0.2500 | 1.00× |
| reverse | lit | 80 | 0.4250 | 0.5000 | 2.13× |
| reverse | vue | 80 | 0.3000 | 1.2625 | 1.50× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.81× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 100000 | 0.000070 | 0.000080 | 1.00× |
| text | lit | 100000 | 0.000070 | 0.000080 | 1.00× |
| text | vue | 100000 | 0.000260 | 0.000270 | 3.71× |
| text | vanilla | 100000 | 0.000150 | 0.000160 | 2.14× |
| create | gluon | 24 | 0.4583 | 0.8750 | 1.00× |
| create | lit | 24 | 1.1667 | 1.9583 | 2.55× |
| create | vue | 24 | 0.4167 | 0.4583 | 0.91× |
| create | vanilla | 24 | 0.7083 | 1.2917 | 1.55× |
| update | gluon | 160 | 0.0875 | 0.0938 | 1.00× |
| update | lit | 160 | 0.1000 | 0.1062 | 1.14× |
| update | vue | 160 | 0.2062 | 0.2188 | 2.36× |
| update | vanilla | 160 | 0.1500 | 0.1625 | 1.71× |
| reverse | gluon | 80 | 0.2000 | 0.2250 | 1.00× |
| reverse | lit | 80 | 0.5125 | 0.5375 | 2.56× |
| reverse | vue | 80 | 0.2625 | 0.2875 | 1.31× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.81× |

Every individual measured sample is preserved in the accompanying JSON file.

