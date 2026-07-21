# Component benchmark evidence

Generated: 2026-07-21T09:27:28.933Z

Source: `6ee04e7da82c9501959618986fe68f4342fe7cc1` on `codex/218-lit-property-state-parity` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.1.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 8 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 8 | 1.0750 | 2.0500 | 1.00× |
| lifecycle | lit | 8 | 1.3125 | 2.7125 | 1.22× |
| lifecycle | vue | 8 | 1.1375 | 2.5000 | 1.06× |
| property | gluon | 972 | 0.0147 | 0.0159 | 1.00× |
| property | lit | 972 | 0.0143 | 0.0151 | 0.97× |
| property | vue | 972 | 0.0776 | 0.0808 | 5.27× |
| state | gluon | 160 | 0.0556 | 0.0681 | 1.00× |
| state | lit | 160 | 0.0556 | 0.0681 | 1.00× |
| state | vue | 160 | 0.0688 | 0.0819 | 1.24× |
| list | gluon | 36 | 0.2611 | 0.3111 | 1.00× |
| list | lit | 36 | 0.4083 | 0.4778 | 1.56× |
| list | vue | 36 | 0.4361 | 0.5222 | 1.67× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 4 | 4.0000 | 6.7500 | 1.00× |
| lifecycle | lit | 4 | 4.0000 | 7.0000 | 1.00× |
| lifecycle | vue | 4 | 3.2500 | 9.5000 | 0.81× |
| property | gluon | 128 | 0.2813 | 1.5859 | 1.00× |
| property | lit | 128 | 0.3125 | 2.0234 | 1.11× |
| property | vue | 128 | 0.3203 | 2.8906 | 1.14× |
| state | gluon | 32 | 0.3438 | 0.5313 | 1.00× |
| state | lit | 32 | 0.3438 | 0.5625 | 1.00× |
| state | vue | 32 | 0.2188 | 0.4063 | 0.64× |
| list | gluon | 8 | 1.3750 | 1.7500 | 1.00× |
| list | lit | 8 | 1.7500 | 2.8750 | 1.27× |
| list | vue | 8 | 1.3750 | 1.8750 | 1.00× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 6 | 1.8333 | 2.3333 | 1.00× |
| lifecycle | lit | 6 | 2.3333 | 3.0000 | 1.27× |
| lifecycle | vue | 6 | 1.6667 | 2.3333 | 0.91× |
| property | gluon | 960 | 0.0146 | 0.0177 | 1.00× |
| property | lit | 960 | 0.0167 | 0.0208 | 1.14× |
| property | vue | 960 | 0.0896 | 0.1083 | 6.14× |
| state | gluon | 128 | 0.0781 | 0.0859 | 1.00× |
| state | lit | 128 | 0.0781 | 0.0859 | 1.00× |
| state | vue | 128 | 0.0938 | 0.1094 | 1.20× |
| list | gluon | 16 | 0.6250 | 0.9375 | 1.00× |
| list | lit | 16 | 1.0000 | 1.1875 | 1.60× |
| list | vue | 16 | 0.6875 | 1.0000 | 1.10× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

