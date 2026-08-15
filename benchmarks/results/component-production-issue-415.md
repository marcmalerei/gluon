# Component benchmark evidence

Generated: 2026-08-15T15:45:10.036Z

Source: `d9d16eedd43cdebf43c8bd984d3228c5144d31cb` on `codex/issue-415-lit-performance` (working tree dirty)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.9.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 8 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 10 | 0.9100 | 1.4700 | 1.00× |
| lifecycle | lit | 10 | 1.2200 | 1.7100 | 1.34× |
| lifecycle | vue | 10 | 0.9600 | 1.5000 | 1.05× |
| property | gluon | 1200 | 0.0122 | 0.0132 | 1.00× |
| property | lit | 1200 | 0.0130 | 0.0138 | 1.06× |
| property | vue | 1200 | 0.0719 | 0.0758 | 5.87× |
| state | gluon | 162 | 0.0475 | 0.0617 | 1.00× |
| state | lit | 162 | 0.0543 | 0.0636 | 1.14× |
| state | vue | 162 | 0.0611 | 0.0772 | 1.29× |
| list | gluon | 40 | 0.2250 | 0.2775 | 1.00× |
| list | lit | 40 | 0.3825 | 0.4050 | 1.70× |
| list | vue | 40 | 0.3775 | 0.4075 | 1.68× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 4 | 2.2500 | 6.0000 | 1.00× |
| lifecycle | lit | 4 | 3.0000 | 5.5000 | 1.33× |
| lifecycle | vue | 4 | 2.2500 | 4.7500 | 1.00× |
| property | gluon | 64 | 0.1250 | 0.3125 | 1.00× |
| property | lit | 64 | 0.1406 | 0.2500 | 1.13× |
| property | vue | 64 | 0.1094 | 0.3281 | 0.88× |
| state | gluon | 64 | 0.2500 | 0.5156 | 1.00× |
| state | lit | 64 | 0.2344 | 0.5469 | 0.94× |
| state | vue | 64 | 0.1406 | 0.3125 | 0.56× |
| list | gluon | 16 | 0.6250 | 0.8750 | 1.00× |
| list | lit | 16 | 1.0000 | 1.1875 | 1.60× |
| list | vue | 16 | 0.6875 | 0.9375 | 1.10× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 4 | 1.5000 | 1.7500 | 1.00× |
| lifecycle | lit | 4 | 2.0000 | 2.2500 | 1.33× |
| lifecycle | vue | 4 | 1.5000 | 1.5000 | 1.00× |
| property | gluon | 960 | 0.0104 | 0.0125 | 1.00× |
| property | lit | 960 | 0.0125 | 0.0135 | 1.20× |
| property | vue | 960 | 0.0719 | 0.0771 | 6.90× |
| state | gluon | 128 | 0.0625 | 0.0703 | 1.00× |
| state | lit | 128 | 0.0625 | 0.0703 | 1.00× |
| state | vue | 128 | 0.0781 | 0.0859 | 1.25× |
| list | gluon | 32 | 0.3750 | 0.4063 | 1.00× |
| list | lit | 32 | 0.7813 | 0.8125 | 2.08× |
| list | vue | 32 | 0.5000 | 0.5625 | 1.33× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

