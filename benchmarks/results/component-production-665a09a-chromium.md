# Component benchmark evidence

Generated: 2026-09-23T06:00:43.180Z

Source: `665a09ade1a0c627c5eb301715b7b7c08bbe1a22` on `codex/492-app-benchmark-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.3, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 40 ms for the fastest framework; 4 warm-up rounds; and 10 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 64 | 0.9813 | 1.0641 | 1.00× |
| lifecycle | lit | 64 | 1.2609 | 1.3125 | 1.29× |
| lifecycle | vue | 64 | 1.0297 | 1.0766 | 1.05× |
| property | gluon | 8000 | 0.0117 | 0.0122 | 1.00× |
| property | lit | 8000 | 0.0126 | 0.0131 | 1.08× |
| property | vue | 8000 | 0.0712 | 0.0718 | 6.10× |
| state | gluon | 1608 | 0.0460 | 0.0480 | 1.00× |
| state | lit | 1608 | 0.0486 | 0.0494 | 1.06× |
| state | vue | 1608 | 0.0603 | 0.0622 | 1.31× |
| list | gluon | 186 | 0.2339 | 0.2409 | 1.00× |
| list | lit | 186 | 0.3699 | 0.3973 | 1.58× |
| list | vue | 186 | 0.3511 | 0.4065 | 1.50× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

