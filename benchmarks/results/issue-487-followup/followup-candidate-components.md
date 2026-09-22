# Component benchmark evidence

Generated: 2026-09-22T11:31:17.271Z

Source: `4f1cbd67f21eea5d2269154fc08ba227841231ed` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 40 ms for the fastest framework; 6 warm-up rounds; and 25 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 29 | 1.0000 | 1.2000 | 1.00× |
| lifecycle | lit | 29 | 1.3621 | 1.5862 | 1.36× |
| lifecycle | vue | 29 | 1.0448 | 1.2517 | 1.04× |
| property | gluon | 6960 | 0.0123 | 0.0130 | 1.00× |
| property | lit | 6960 | 0.0132 | 0.0143 | 1.07× |
| property | vue | 6960 | 0.0719 | 0.0764 | 5.82× |
| state | gluon | 800 | 0.0485 | 0.0499 | 1.00× |
| state | lit | 800 | 0.0499 | 0.0521 | 1.03× |
| state | vue | 800 | 0.0611 | 0.0660 | 1.26× |
| list | gluon | 232 | 0.2422 | 0.2526 | 1.00× |
| list | lit | 232 | 0.3759 | 0.3849 | 1.55× |
| list | vue | 232 | 0.3599 | 0.3720 | 1.49× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.
