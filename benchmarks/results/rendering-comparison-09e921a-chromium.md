# Rendering benchmark evidence

Generated: 2026-07-11T16:53:04.485Z

Source: `09e921a67d0eab9cf8ec5d02340d4598f24e74b9` on `main` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 0.0.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 12 warm-up rounds, and 40 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 240000 | 0.000055 | 0.000059 | 1.00× |
| text | lit | 240000 | 0.000046 | 0.000052 | 0.85× |
| text | vue | 240000 | 0.000185 | 0.000210 | 3.40× |
| text | vanilla | 240000 | 0.000075 | 0.000092 | 1.37× |
| create | gluon | 18 | 1.1333 | 1.5611 | 1.00× |
| create | lit | 18 | 0.8000 | 1.2333 | 0.71× |
| create | vue | 18 | 0.3444 | 0.6667 | 0.30× |
| create | vanilla | 18 | 0.4556 | 0.6111 | 0.40× |
| update | gluon | 160 | 0.0775 | 0.0938 | 1.00× |
| update | lit | 160 | 0.0850 | 0.1044 | 1.10× |
| update | vue | 160 | 0.1694 | 0.1956 | 2.19× |
| update | vanilla | 160 | 0.1006 | 0.1175 | 1.30× |
| reverse | gluon | 70 | 0.1586 | 0.1800 | 1.00× |
| reverse | lit | 70 | 0.2586 | 0.2814 | 1.63× |
| reverse | vue | 70 | 0.2114 | 0.2343 | 1.33× |
| reverse | vanilla | 70 | 0.1157 | 0.1257 | 0.73× |

Every individual measured sample is preserved in the accompanying JSON file.
