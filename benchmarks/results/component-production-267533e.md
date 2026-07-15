# Component benchmark evidence

Generated: 2026-07-15T12:47:38.462Z

Source: `267533e65cb19d018fa42d4665323871a9205836` on `codex/primitive-property-text-updates` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.0.8, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 8 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 8 | 0.8625 | 1.4875 | 1.00× |
| lifecycle | lit | 8 | 1.1375 | 1.7500 | 1.32× |
| lifecycle | vue | 8 | 0.9000 | 1.4750 | 1.04× |
| property | gluon | 640 | 0.0181 | 0.0195 | 1.00× |
| property | lit | 640 | 0.0155 | 0.0164 | 0.85× |
| property | vue | 640 | 0.0758 | 0.0777 | 4.18× |
| state | gluon | 160 | 0.0531 | 0.0644 | 1.00× |
| state | lit | 160 | 0.0500 | 0.0612 | 0.94× |
| state | vue | 160 | 0.0575 | 0.0675 | 1.08× |
| list | gluon | 36 | 0.2361 | 0.2722 | 1.00× |
| list | lit | 36 | 0.3750 | 0.4111 | 1.59× |
| list | vue | 36 | 0.3722 | 0.4000 | 1.58× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 4 | 1.7500 | 3.2500 | 1.00× |
| lifecycle | lit | 4 | 2.5000 | 4.5000 | 1.43× |
| lifecycle | vue | 4 | 2.0000 | 3.5000 | 1.14× |
| property | gluon | 60 | 0.1667 | 0.2833 | 1.00× |
| property | lit | 60 | 0.1500 | 0.2667 | 0.90× |
| property | vue | 60 | 0.1333 | 0.3000 | 0.80× |
| state | gluon | 80 | 0.3875 | 2.8375 | 1.00× |
| state | lit | 80 | 0.3375 | 2.3875 | 0.87× |
| state | vue | 80 | 0.1875 | 1.4875 | 0.48× |
| list | gluon | 16 | 0.6250 | 0.8125 | 1.00× |
| list | lit | 16 | 1.0000 | 1.1875 | 1.60× |
| list | vue | 16 | 0.6250 | 0.8125 | 1.00× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 8 | 1.2500 | 1.3750 | 1.00× |
| lifecycle | lit | 8 | 1.8750 | 2.0000 | 1.50× |
| lifecycle | vue | 8 | 1.2500 | 1.3750 | 1.00× |
| property | gluon | 400 | 0.0150 | 0.0175 | 1.00× |
| property | lit | 400 | 0.0150 | 0.0150 | 1.00× |
| property | vue | 400 | 0.0700 | 0.0750 | 4.67× |
| state | gluon | 160 | 0.0688 | 0.0750 | 1.00× |
| state | lit | 160 | 0.0688 | 0.0688 | 1.00× |
| state | vue | 160 | 0.0813 | 0.0813 | 1.18× |
| list | gluon | 32 | 0.4063 | 0.4688 | 1.00× |
| list | lit | 32 | 0.7500 | 0.8125 | 1.85× |
| list | vue | 32 | 0.4688 | 0.5625 | 1.15× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

