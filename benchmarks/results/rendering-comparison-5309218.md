# Rendering benchmark evidence

Generated: 2026-07-11T17:17:52.074Z

Source: `530921806624cc2e050d0832c61a8628e87a70e6` on `codex/issue-83-single-binding-traversal` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 0.0.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 12 warm-up rounds, and 40 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 320000 | 0.000054 | 0.000056 | 1.00× |
| text | lit | 320000 | 0.000046 | 0.000053 | 0.86× |
| text | vue | 320000 | 0.000186 | 0.000209 | 3.44× |
| text | vanilla | 320000 | 0.000077 | 0.000098 | 1.42× |
| create | gluon | 42 | 0.9405 | 1.0929 | 1.00× |
| create | lit | 42 | 0.8238 | 1.0667 | 0.88× |
| create | vue | 42 | 0.3262 | 0.5048 | 0.35× |
| create | vanilla | 42 | 0.5048 | 0.5405 | 0.54× |
| update | gluon | 160 | 0.0756 | 0.0913 | 1.00× |
| update | lit | 160 | 0.0944 | 0.1081 | 1.25× |
| update | vue | 160 | 0.1681 | 0.1894 | 2.22× |
| update | vanilla | 160 | 0.1006 | 0.1125 | 1.33× |
| reverse | gluon | 70 | 0.1486 | 0.1629 | 1.00× |
| reverse | lit | 70 | 0.2586 | 0.2857 | 1.74× |
| reverse | vue | 70 | 0.2014 | 0.2271 | 1.36× |
| reverse | vanilla | 70 | 0.1171 | 0.1343 | 0.79× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 100000 | 0.000130 | 0.000150 | 1.00× |
| text | lit | 100000 | 0.000120 | 0.000140 | 0.92× |
| text | vue | 100000 | 0.000300 | 0.000340 | 2.31× |
| text | vanilla | 100000 | 0.000080 | 0.000090 | 0.62× |
| create | gluon | 24 | 1.7500 | 6.2500 | 1.00× |
| create | lit | 24 | 1.5833 | 4.2917 | 0.90× |
| create | vue | 24 | 0.5833 | 1.6250 | 0.33× |
| create | vanilla | 24 | 0.6667 | 0.8333 | 0.38× |
| update | gluon | 120 | 0.1667 | 0.2250 | 1.00× |
| update | lit | 120 | 0.1917 | 0.2417 | 1.15× |
| update | vue | 120 | 0.2500 | 1.3333 | 1.50× |
| update | vanilla | 120 | 0.1000 | 0.1083 | 0.60× |
| reverse | gluon | 80 | 0.2375 | 0.3375 | 1.00× |
| reverse | lit | 80 | 0.4500 | 0.5625 | 1.89× |
| reverse | vue | 80 | 0.3250 | 0.5375 | 1.37× |
| reverse | vanilla | 80 | 0.1750 | 0.1875 | 0.74× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000081 | 0.000087 | 1.00× |
| text | lit | 160000 | 0.000075 | 0.000081 | 0.92× |
| text | vue | 160000 | 0.000262 | 0.000287 | 3.23× |
| text | vanilla | 160000 | 0.000144 | 0.000169 | 1.77× |
| create | gluon | 24 | 1.2917 | 2.0417 | 1.00× |
| create | lit | 24 | 1.1667 | 1.7083 | 0.90× |
| create | vue | 24 | 0.4583 | 0.5000 | 0.35× |
| create | vanilla | 24 | 0.7083 | 0.8333 | 0.55× |
| update | gluon | 80 | 0.0875 | 0.1000 | 1.00× |
| update | lit | 80 | 0.1000 | 0.1125 | 1.14× |
| update | vue | 80 | 0.2125 | 0.2375 | 2.43× |
| update | vanilla | 80 | 0.1500 | 0.1625 | 1.71× |
| reverse | gluon | 80 | 0.2625 | 0.3000 | 1.00× |
| reverse | lit | 80 | 0.5250 | 0.5875 | 2.00× |
| reverse | vue | 80 | 0.2625 | 0.2875 | 1.00× |
| reverse | vanilla | 80 | 0.1625 | 0.1875 | 0.62× |

Every individual measured sample is preserved in the accompanying JSON file.
