# Component benchmark evidence

Generated: 2026-07-15T11:05:06.871Z

Source: `47b1a0a16abf028ad00b0dceea2619dee2748b88` on `codex/component-rendering-benchmarks` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.0.8, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 8 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 10 | 0.8800 | 1.7500 | 1.00× |
| lifecycle | lit | 10 | 1.1500 | 1.7500 | 1.31× |
| lifecycle | vue | 10 | 0.9300 | 1.4800 | 1.06× |
| property | gluon | 640 | 0.0236 | 0.0247 | 1.00× |
| property | lit | 640 | 0.0156 | 0.0167 | 0.66× |
| property | vue | 640 | 0.1037 | 0.1056 | 4.40× |
| state | gluon | 160 | 0.0638 | 0.0725 | 1.00× |
| state | lit | 160 | 0.0525 | 0.0625 | 0.82× |
| state | vue | 160 | 0.0631 | 0.0737 | 0.99× |
| list | gluon | 72 | 0.2347 | 0.2569 | 1.00× |
| list | lit | 72 | 0.3736 | 0.3958 | 1.59× |
| list | vue | 72 | 0.3667 | 0.3819 | 1.56× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 4 | 2.0000 | 3.7500 | 1.00× |
| lifecycle | lit | 4 | 2.7500 | 4.2500 | 1.38× |
| lifecycle | vue | 4 | 2.0000 | 4.0000 | 1.00× |
| property | gluon | 60 | 0.2000 | 0.3000 | 1.00× |
| property | lit | 60 | 0.1500 | 0.2500 | 0.75× |
| property | vue | 60 | 0.1500 | 0.2667 | 0.75× |
| state | gluon | 40 | 0.5750 | 0.7250 | 1.00× |
| state | lit | 40 | 0.3750 | 0.5000 | 0.65× |
| state | vue | 40 | 0.2750 | 0.3000 | 0.48× |
| list | gluon | 8 | 2.0000 | 2.2500 | 1.00× |
| list | lit | 8 | 1.7500 | 2.3750 | 0.88× |
| list | vue | 8 | 2.2500 | 5.5000 | 1.13× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 6 | 1.3333 | 1.5000 | 1.00× |
| lifecycle | lit | 6 | 1.8333 | 2.0000 | 1.38× |
| lifecycle | vue | 6 | 1.3333 | 1.5000 | 1.00× |
| property | gluon | 600 | 0.0183 | 0.0217 | 1.00× |
| property | lit | 600 | 0.0133 | 0.0183 | 0.73× |
| property | vue | 600 | 0.0833 | 0.0867 | 4.55× |
| state | gluon | 160 | 0.0750 | 0.0813 | 1.00× |
| state | lit | 160 | 0.0688 | 0.0688 | 0.92× |
| state | vue | 160 | 0.0875 | 0.0875 | 1.17× |
| list | gluon | 16 | 0.4375 | 0.5000 | 1.00× |
| list | lit | 16 | 0.8125 | 0.8750 | 1.86× |
| list | vue | 16 | 0.5000 | 0.6250 | 1.14× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

