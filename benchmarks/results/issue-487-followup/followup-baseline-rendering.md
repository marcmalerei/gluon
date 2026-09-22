# Rendering benchmark evidence

Generated: 2026-09-22T11:17:31.798Z

Source: `1156f222e2c2bdbd89eb4558ce52c9295acc15ee` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 6 warm-up rounds, and 25 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 270000 | 0.000076 | 0.000079 | 1.00× |
| text | lit | 270000 | 0.000048 | 0.000050 | 0.64× |
| text | vue | 270000 | 0.000190 | 0.000196 | 2.51× |
| text | vanilla | 270000 | 0.000079 | 0.000098 | 1.05× |
| create | gluon | 36 | 0.3222 | 0.4972 | 1.00× |
| create | lit | 36 | 0.8833 | 1.2278 | 2.74× |
| create | vue | 36 | 0.3222 | 0.5472 | 1.00× |
| create | vanilla | 36 | 0.4500 | 0.5528 | 1.40× |
| update | gluon | 160 | 0.0831 | 0.0975 | 1.00× |
| update | lit | 160 | 0.0938 | 0.1050 | 1.13× |
| update | vue | 160 | 0.1775 | 0.2100 | 2.14× |
| update | vanilla | 160 | 0.1044 | 0.1194 | 1.26× |
| reverse | gluon | 70 | 0.1386 | 0.1600 | 1.00× |
| reverse | lit | 70 | 0.2543 | 0.2800 | 1.84× |
| reverse | vue | 70 | 0.2043 | 0.2186 | 1.47× |
| reverse | vanilla | 70 | 0.1129 | 0.1214 | 0.81× |

Every individual measured sample is preserved in the accompanying JSON file.

