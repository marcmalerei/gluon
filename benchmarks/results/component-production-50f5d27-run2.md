# Component benchmark evidence

Generated: 2026-08-16T01:36:59.179Z

Source: `50f5d27aac57ca803ebf3b795e83fb5e652eaa97` on `codex/issue-415-lit-performance` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.9.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 40 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 44 | 0.9159 | 1.0455 | 1.00× |
| lifecycle | lit | 44 | 1.3932 | 1.4773 | 1.52× |
| lifecycle | vue | 44 | 1.1045 | 1.2386 | 1.21× |
| property | gluon | 5400 | 0.0122 | 0.0124 | 1.00× |
| property | lit | 5400 | 0.0132 | 0.0138 | 1.08× |
| property | vue | 5400 | 0.0702 | 0.0719 | 5.76× |
| state | gluon | 1280 | 0.0476 | 0.0487 | 1.00× |
| state | lit | 1280 | 0.0490 | 0.0519 | 1.03× |
| state | vue | 1280 | 0.0608 | 0.0626 | 1.28× |
| list | gluon | 260 | 0.2427 | 0.2496 | 1.00× |
| list | lit | 260 | 0.3708 | 0.4000 | 1.53× |
| list | vue | 260 | 0.3554 | 0.3777 | 1.46× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 20 | 3.7000 | 4.8000 | 1.00× |
| lifecycle | lit | 20 | 3.8000 | 7.8500 | 1.03× |
| lifecycle | vue | 20 | 3.1500 | 6.4500 | 0.85× |
| property | gluon | 560 | 1.7500 | 3.6304 | 1.00× |
| property | lit | 560 | 2.4571 | 5.1286 | 1.40× |
| property | vue | 560 | 3.6661 | 8.0643 | 2.09× |
| state | gluon | 480 | 1.9063 | 3.7208 | 1.00× |
| state | lit | 480 | 2.9229 | 5.7500 | 1.53× |
| state | vue | 480 | 3.1125 | 6.2146 | 1.63× |
| list | gluon | 120 | 0.6500 | 0.8750 | 1.00× |
| list | lit | 120 | 0.9000 | 1.0083 | 1.38× |
| list | vue | 120 | 0.7250 | 1.6250 | 1.12× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 40 | 1.3500 | 2.2000 | 1.00× |
| lifecycle | lit | 40 | 1.8500 | 2.8750 | 1.37× |
| lifecycle | vue | 40 | 1.2750 | 2.0500 | 0.94× |
| property | gluon | 6400 | 0.0111 | 0.0114 | 1.00× |
| property | lit | 6400 | 0.0127 | 0.0133 | 1.14× |
| property | vue | 6400 | 0.0697 | 0.0720 | 6.28× |
| state | gluon | 960 | 0.0615 | 0.0635 | 1.00× |
| state | lit | 960 | 0.0625 | 0.0646 | 1.02× |
| state | vue | 960 | 0.0813 | 0.0854 | 1.32× |
| list | gluon | 120 | 0.3333 | 0.3500 | 1.00× |
| list | lit | 120 | 0.7083 | 0.7417 | 2.13× |
| list | vue | 120 | 0.4417 | 0.4583 | 1.32× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

