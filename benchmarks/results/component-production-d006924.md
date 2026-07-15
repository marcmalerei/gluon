# Component benchmark evidence

Generated: 2026-07-15T13:05:22.127Z

Source: `d00692440894d8d67c658293241ce3e926bd9b09` on `codex/primitive-property-text-updates` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.0.8, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 8 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 8 | 0.8750 | 1.5000 | 1.00× |
| lifecycle | lit | 8 | 1.1625 | 1.7500 | 1.33× |
| lifecycle | vue | 8 | 0.8875 | 1.4875 | 1.01× |
| property | gluon | 972 | 0.0181 | 0.0192 | 1.00× |
| property | lit | 972 | 0.0132 | 0.0143 | 0.73× |
| property | vue | 972 | 0.0697 | 0.0713 | 3.85× |
| state | gluon | 168 | 0.0530 | 0.0595 | 1.00× |
| state | lit | 168 | 0.0482 | 0.0542 | 0.91× |
| state | vue | 168 | 0.0625 | 0.0673 | 1.18× |
| list | gluon | 56 | 0.2268 | 0.2429 | 1.00× |
| list | lit | 56 | 0.3679 | 0.3839 | 1.62× |
| list | vue | 56 | 0.3571 | 0.3768 | 1.57× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 4 | 2.0000 | 3.2500 | 1.00× |
| lifecycle | lit | 4 | 2.5000 | 4.2500 | 1.25× |
| lifecycle | vue | 4 | 2.0000 | 3.2500 | 1.00× |
| property | gluon | 64 | 0.1563 | 0.2500 | 1.00× |
| property | lit | 64 | 0.1250 | 0.2813 | 0.80× |
| property | vue | 64 | 0.1094 | 0.1875 | 0.70× |
| state | gluon | 64 | 0.2656 | 0.3594 | 1.00× |
| state | lit | 64 | 0.2188 | 0.3281 | 0.82× |
| state | vue | 64 | 0.1250 | 0.2188 | 0.47× |
| list | gluon | 16 | 0.5625 | 0.6875 | 1.00× |
| list | lit | 16 | 0.9375 | 1.0625 | 1.67× |
| list | vue | 16 | 0.6250 | 0.9375 | 1.11× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 6 | 1.1667 | 1.5000 | 1.00× |
| lifecycle | lit | 6 | 1.8333 | 2.0000 | 1.57× |
| lifecycle | vue | 6 | 1.1667 | 1.3333 | 1.00× |
| property | gluon | 960 | 0.0167 | 0.0177 | 1.00× |
| property | lit | 960 | 0.0125 | 0.0135 | 0.75× |
| property | vue | 960 | 0.0677 | 0.0698 | 4.06× |
| state | gluon | 120 | 0.0667 | 0.0750 | 1.00× |
| state | lit | 120 | 0.0583 | 0.0667 | 0.88× |
| state | vue | 120 | 0.0833 | 0.0833 | 1.25× |
| list | gluon | 32 | 0.3750 | 0.4063 | 1.00× |
| list | lit | 32 | 0.7188 | 0.7500 | 1.92× |
| list | vue | 32 | 0.4375 | 0.4688 | 1.17× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

