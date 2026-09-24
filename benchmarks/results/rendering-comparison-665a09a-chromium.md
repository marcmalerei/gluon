# Rendering benchmark evidence

Generated: 2026-09-23T06:00:09.741Z

Source: `665a09ade1a0c627c5eb301715b7b7c08bbe1a22` on `codex/492-app-benchmark-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.3, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 4 warm-up rounds, and 10 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 270000 | 0.000059 | 0.000060 | 1.00× |
| text | lit | 270000 | 0.000048 | 0.000050 | 0.82× |
| text | vue | 270000 | 0.000187 | 0.000201 | 3.18× |
| text | vanilla | 270000 | 0.000083 | 0.000094 | 1.40× |
| create | gluon | 42 | 0.3095 | 0.3548 | 1.00× |
| create | lit | 42 | 0.8310 | 0.9524 | 2.68× |
| create | vue | 42 | 0.3167 | 0.3833 | 1.02× |
| create | vanilla | 42 | 0.4881 | 0.5452 | 1.58× |
| update | gluon | 160 | 0.0775 | 0.0875 | 1.00× |
| update | lit | 160 | 0.0913 | 0.0981 | 1.18× |
| update | vue | 160 | 0.1744 | 0.1981 | 2.25× |
| update | vanilla | 160 | 0.1012 | 0.1200 | 1.31× |
| reverse | gluon | 70 | 0.1486 | 0.1586 | 1.00× |
| reverse | lit | 70 | 0.2614 | 0.2871 | 1.76× |
| reverse | vue | 70 | 0.2057 | 0.2243 | 1.38× |
| reverse | vanilla | 70 | 0.1200 | 0.1371 | 0.81× |

Every individual measured sample is preserved in the accompanying JSON file.

