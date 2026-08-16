# Component benchmark evidence

Generated: 2026-08-16T01:22:34.825Z

Source: `2fe4f40ad1b07c7ea863e574a1985bb015a753a9` on `codex/issue-415-baseline-methodology` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.9.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 40 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 80 | 1.0087 | 1.1475 | 1.00× |
| lifecycle | lit | 80 | 1.2900 | 1.4425 | 1.28× |
| lifecycle | vue | 80 | 1.0337 | 1.1363 | 1.02× |
| property | gluon | 6400 | 0.0130 | 0.0135 | 1.00× |
| property | lit | 6400 | 0.0131 | 0.0138 | 1.00× |
| property | vue | 6400 | 0.0702 | 0.0725 | 5.39× |
| state | gluon | 804 | 0.0527 | 0.0556 | 1.00× |
| state | lit | 804 | 0.0515 | 0.0537 | 0.98× |
| state | vue | 804 | 0.0643 | 0.0667 | 1.22× |
| list | gluon | 300 | 0.2400 | 0.2493 | 1.00× |
| list | lit | 300 | 0.3790 | 0.4003 | 1.58× |
| list | vue | 300 | 0.3623 | 0.3847 | 1.51× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 16 | 2.8125 | 5.6875 | 1.00× |
| lifecycle | lit | 16 | 3.4375 | 7.5625 | 1.22× |
| lifecycle | vue | 16 | 2.6875 | 5.5000 | 0.96× |
| property | gluon | 320 | 0.1938 | 1.8719 | 1.00× |
| property | lit | 320 | 0.2281 | 2.3031 | 1.18× |
| property | vue | 320 | 0.2094 | 3.6531 | 1.08× |
| state | gluon | 320 | 2.6344 | 4.5031 | 1.00× |
| state | lit | 320 | 2.7938 | 4.8375 | 1.06× |
| state | vue | 320 | 3.0281 | 5.3531 | 1.15× |
| list | gluon | 120 | 0.6667 | 1.0333 | 1.00× |
| list | lit | 120 | 0.9083 | 1.0833 | 1.36× |
| list | vue | 120 | 0.7250 | 1.7000 | 1.09× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 40 | 1.3750 | 2.3750 | 1.00× |
| lifecycle | lit | 40 | 1.9000 | 2.8250 | 1.38× |
| lifecycle | vue | 40 | 1.3000 | 2.0750 | 0.95× |
| property | gluon | 4800 | 0.0117 | 0.0123 | 1.00× |
| property | lit | 4800 | 0.0127 | 0.0133 | 1.09× |
| property | vue | 4800 | 0.0719 | 0.0744 | 6.16× |
| state | gluon | 1120 | 0.0634 | 0.0661 | 1.00× |
| state | lit | 1120 | 0.0634 | 0.0652 | 1.00× |
| state | vue | 1120 | 0.0804 | 0.0857 | 1.27× |
| list | gluon | 160 | 0.3250 | 0.3438 | 1.00× |
| list | lit | 160 | 0.7000 | 0.7188 | 2.15× |
| list | vue | 160 | 0.4313 | 0.4437 | 1.33× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

