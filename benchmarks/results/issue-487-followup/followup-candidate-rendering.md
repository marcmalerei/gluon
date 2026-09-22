# Rendering benchmark evidence

Generated: 2026-09-22T11:24:08.085Z

Source: `4f1cbd67f21eea5d2269154fc08ba227841231ed` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 6 warm-up rounds, and 25 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000059 | 0.000061 | 1.00× |
| text | lit | 160000 | 0.000049 | 0.000051 | 0.83× |
| text | vue | 160000 | 0.000191 | 0.000218 | 3.24× |
| text | vanilla | 160000 | 0.000081 | 0.000104 | 1.38× |
| create | gluon | 42 | 0.3095 | 0.3738 | 1.00× |
| create | lit | 42 | 0.7929 | 0.9452 | 2.56× |
| create | vue | 42 | 0.3238 | 0.5143 | 1.05× |
| create | vanilla | 42 | 0.4690 | 0.5286 | 1.52× |
| update | gluon | 160 | 0.0775 | 0.0888 | 1.00× |
| update | lit | 160 | 0.0950 | 0.1031 | 1.23× |
| update | vue | 160 | 0.1744 | 0.2019 | 2.25× |
| update | vanilla | 160 | 0.1019 | 0.1106 | 1.31× |
| reverse | gluon | 70 | 0.1414 | 0.1686 | 1.00× |
| reverse | lit | 70 | 0.2657 | 0.2943 | 1.88× |
| reverse | vue | 70 | 0.2086 | 0.2300 | 1.47× |
| reverse | vanilla | 70 | 0.1143 | 0.1271 | 0.81× |

Every individual measured sample is preserved in the accompanying JSON file.

