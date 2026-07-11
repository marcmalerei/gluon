# Rendering benchmark evidence

Generated: 2026-07-11T17:03:27.072Z

Source: `3c17ec41786586a602127c58856e2149ce2c750e` on `codex/issue-81-single-node-insertion` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 0.0.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 12 warm-up rounds, and 40 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 270000 | 0.000054 | 0.000059 | 1.00× |
| text | lit | 270000 | 0.000050 | 0.000056 | 0.93× |
| text | vue | 270000 | 0.000190 | 0.000212 | 3.51× |
| text | vanilla | 270000 | 0.000081 | 0.000096 | 1.49× |
| create | gluon | 24 | 0.9833 | 1.2917 | 1.00× |
| create | lit | 24 | 0.7583 | 1.1583 | 0.77× |
| create | vue | 24 | 0.3250 | 0.4292 | 0.33× |
| create | vanilla | 24 | 0.4417 | 0.6042 | 0.45× |
| update | gluon | 160 | 0.0769 | 0.0881 | 1.00× |
| update | lit | 160 | 0.0838 | 0.0994 | 1.09× |
| update | vue | 160 | 0.1694 | 0.1994 | 2.20× |
| update | vanilla | 160 | 0.1000 | 0.1106 | 1.30× |
| reverse | gluon | 70 | 0.1529 | 0.1800 | 1.00× |
| reverse | lit | 70 | 0.2571 | 0.2843 | 1.68× |
| reverse | vue | 70 | 0.2086 | 0.2329 | 1.36× |
| reverse | vanilla | 70 | 0.1171 | 0.1329 | 0.77× |

Every individual measured sample is preserved in the accompanying JSON file.
