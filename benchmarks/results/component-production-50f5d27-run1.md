# Component benchmark evidence

Generated: 2026-08-16T01:28:56.136Z

Source: `50f5d27aac57ca803ebf3b795e83fb5e652eaa97` on `codex/issue-415-lit-performance` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.9.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 40 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 29 | 1.0172 | 1.1276 | 1.00× |
| lifecycle | lit | 29 | 1.3448 | 1.5966 | 1.32× |
| lifecycle | vue | 29 | 1.0448 | 1.2552 | 1.03× |
| property | gluon | 4020 | 0.0122 | 0.0127 | 1.00× |
| property | lit | 4020 | 0.0129 | 0.0134 | 1.06× |
| property | vue | 4020 | 0.0727 | 0.0743 | 5.96× |
| state | gluon | 1160 | 0.0474 | 0.0487 | 1.00× |
| state | lit | 1160 | 0.0496 | 0.0509 | 1.05× |
| state | vue | 1160 | 0.0620 | 0.0652 | 1.31× |
| list | gluon | 186 | 0.2387 | 0.2511 | 1.00× |
| list | lit | 186 | 0.3710 | 0.3866 | 1.55× |
| list | vue | 186 | 0.3591 | 0.3720 | 1.50× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 20 | 3.2000 | 5.1500 | 1.00× |
| lifecycle | lit | 20 | 3.6500 | 7.1000 | 1.14× |
| lifecycle | vue | 20 | 3.1000 | 5.5500 | 0.97× |
| property | gluon | 480 | 1.8625 | 3.6854 | 1.00× |
| property | lit | 480 | 2.5542 | 5.0792 | 1.37× |
| property | vue | 480 | 3.9688 | 7.9813 | 2.13× |
| state | gluon | 320 | 1.8906 | 3.1313 | 1.00× |
| state | lit | 320 | 2.8875 | 4.8219 | 1.53× |
| state | vue | 320 | 3.0344 | 5.3781 | 1.60× |
| list | gluon | 120 | 0.6500 | 0.8000 | 1.00× |
| list | lit | 120 | 0.8917 | 0.9750 | 1.37× |
| list | vue | 120 | 0.7000 | 1.6500 | 1.08× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 56 | 1.3929 | 2.1429 | 1.00× |
| lifecycle | lit | 56 | 1.9107 | 2.7500 | 1.37× |
| lifecycle | vue | 56 | 1.3214 | 1.9464 | 0.95× |
| property | gluon | 4000 | 0.0107 | 0.0112 | 1.00× |
| property | lit | 4000 | 0.0125 | 0.0130 | 1.16× |
| property | vue | 4000 | 0.0710 | 0.0732 | 6.60× |
| state | gluon | 800 | 0.0587 | 0.0625 | 1.00× |
| state | lit | 800 | 0.0612 | 0.0650 | 1.04× |
| state | vue | 800 | 0.0800 | 0.0825 | 1.36× |
| list | gluon | 160 | 0.3250 | 0.3375 | 1.00× |
| list | lit | 160 | 0.7000 | 0.7188 | 2.15× |
| list | vue | 160 | 0.4313 | 0.4625 | 1.33× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

