# Rendering benchmark evidence

Generated: 2026-09-23T07:58:26.300Z

Source: `7c1151f09e734b286e8bc1baca3344d95dff9357` on `codex/493-text-hotpath` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.2, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 10 warm-up rounds, and 64 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 240000 | 0.000046 | 0.000049 | 1.00× |
| text | lit | 240000 | 0.000047 | 0.000049 | 1.03× |
| text | vue | 240000 | 0.000183 | 0.000190 | 3.95× |
| text | vanilla | 240000 | 0.000077 | 0.000094 | 1.67× |
| create | gluon | 21 | 0.3048 | 0.4286 | 1.00× |
| create | lit | 21 | 0.7810 | 0.9190 | 2.56× |
| create | vue | 21 | 0.3286 | 0.6762 | 1.08× |
| create | vanilla | 21 | 0.4524 | 0.5952 | 1.48× |
| update | gluon | 160 | 0.0769 | 0.0888 | 1.00× |
| update | lit | 160 | 0.0944 | 0.1087 | 1.23× |
| update | vue | 160 | 0.1700 | 0.1887 | 2.21× |
| update | vanilla | 160 | 0.1013 | 0.1206 | 1.32× |
| reverse | gluon | 120 | 0.1467 | 0.1583 | 1.00× |
| reverse | lit | 120 | 0.2583 | 0.2692 | 1.76× |
| reverse | vue | 120 | 0.2050 | 0.2142 | 1.40× |
| reverse | vanilla | 120 | 0.1133 | 0.1242 | 0.77× |

Every individual measured sample is preserved in the accompanying JSON file.

