# Rendering benchmark evidence

Generated: 2026-09-23T07:57:24.621Z

Source: `d42ab8c05c6a10c15cd866dd30ae9e49826259bd` on `codex/release-1-12-2-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.2, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 10 warm-up rounds, and 64 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 320000 | 0.000058 | 0.000060 | 1.00× |
| text | lit | 320000 | 0.000047 | 0.000050 | 0.82× |
| text | vue | 320000 | 0.000186 | 0.000205 | 3.21× |
| text | vanilla | 320000 | 0.000078 | 0.000091 | 1.36× |
| create | gluon | 36 | 0.3028 | 0.4694 | 1.00× |
| create | lit | 36 | 0.7583 | 0.8500 | 2.50× |
| create | vue | 36 | 0.3139 | 0.4139 | 1.04× |
| create | vanilla | 36 | 0.5056 | 0.5528 | 1.67× |
| update | gluon | 160 | 0.0762 | 0.0856 | 1.00× |
| update | lit | 160 | 0.0906 | 0.0987 | 1.19× |
| update | vue | 160 | 0.1681 | 0.1869 | 2.20× |
| update | vanilla | 160 | 0.1019 | 0.1138 | 1.34× |
| reverse | gluon | 70 | 0.1386 | 0.1600 | 1.00× |
| reverse | lit | 70 | 0.2600 | 0.2843 | 1.88× |
| reverse | vue | 70 | 0.1986 | 0.2200 | 1.43× |
| reverse | vanilla | 70 | 0.1057 | 0.1243 | 0.76× |

Every individual measured sample is preserved in the accompanying JSON file.

