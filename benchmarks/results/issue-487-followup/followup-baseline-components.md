# Component benchmark evidence

Generated: 2026-09-22T11:27:49.512Z

Source: `1156f222e2c2bdbd89eb4558ce52c9295acc15ee` on `detached` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 40 ms for the fastest framework; 6 warm-up rounds; and 25 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 54 | 0.9667 | 1.1444 | 1.00× |
| lifecycle | lit | 54 | 1.3130 | 1.4815 | 1.36× |
| lifecycle | vue | 54 | 1.0185 | 1.1315 | 1.05× |
| property | gluon | 6400 | 0.0120 | 0.0124 | 1.00× |
| property | lit | 6400 | 0.0128 | 0.0132 | 1.07× |
| property | vue | 6400 | 0.0709 | 0.0735 | 5.92× |
| state | gluon | 804 | 0.0480 | 0.0499 | 1.00× |
| state | lit | 804 | 0.0501 | 0.0516 | 1.04× |
| state | vue | 804 | 0.0618 | 0.0642 | 1.29× |
| list | gluon | 306 | 0.2461 | 0.2627 | 1.00× |
| list | lit | 306 | 0.3712 | 0.3856 | 1.51× |
| list | vue | 306 | 0.3614 | 0.3752 | 1.47× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.
