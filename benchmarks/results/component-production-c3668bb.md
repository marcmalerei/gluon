# Component benchmark evidence

Generated: 2026-07-15T10:59:53.148Z

Source: `c3668bb869eda989e70cb4961b9af9e0b609915f` on `codex/component-rendering-benchmarks` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.0.8, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build; 50 autonomous Custom Elements with open Shadow DOM per operation; scenario-specific component surfaces; 20 keyed rows per component in lifecycle/list; batches calibrated to at least 8 ms for the fastest framework; 8 warm-up rounds; and 40 interleaved samples per framework and scenario. Lower latency is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 8 | 0.8750 | 1.4875 | 1.00× |
| lifecycle | lit | 8 | 1.1500 | 1.7625 | 1.31× |
| lifecycle | vue | 8 | 0.8875 | 1.4625 | 1.01× |
| property | gluon | 720 | 0.0238 | 0.0254 | 1.00× |
| property | lit | 720 | 0.0154 | 0.0165 | 0.65× |
| property | vue | 720 | 0.1014 | 0.1026 | 4.27× |
| state | gluon | 164 | 0.0634 | 0.0713 | 1.00× |
| state | lit | 164 | 0.0524 | 0.0622 | 0.83× |
| state | vue | 164 | 0.0634 | 0.0720 | 1.00× |
| list | gluon | 72 | 0.2319 | 0.2486 | 1.00× |
| list | lit | 72 | 0.3681 | 0.3861 | 1.59× |
| list | vue | 72 | 0.3625 | 0.3778 | 1.56× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 4 | 2.2500 | 5.0000 | 1.00× |
| lifecycle | lit | 4 | 2.5000 | 4.5000 | 1.11× |
| lifecycle | vue | 4 | 2.0000 | 3.7500 | 0.89× |
| property | gluon | 80 | 0.2500 | 0.2875 | 1.00× |
| property | lit | 80 | 0.1375 | 0.2125 | 0.55× |
| property | vue | 80 | 0.1500 | 0.2250 | 0.60× |
| state | gluon | 40 | 0.4500 | 0.5750 | 1.00× |
| state | lit | 40 | 0.3500 | 0.4000 | 0.78× |
| state | vue | 40 | 0.1500 | 0.3000 | 0.33× |
| list | gluon | 8 | 1.5000 | 13.2500 | 1.00× |
| list | lit | 8 | 1.7500 | 9.8750 | 1.17× |
| list | vue | 8 | 2.2500 | 14.3750 | 1.50× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/50 components | p95 ms/50 components | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| lifecycle | gluon | 8 | 1.2500 | 1.5000 | 1.00× |
| lifecycle | lit | 8 | 1.8750 | 2.0000 | 1.50× |
| lifecycle | vue | 8 | 1.2500 | 1.3750 | 1.00× |
| property | gluon | 600 | 0.0183 | 0.0200 | 1.00× |
| property | lit | 600 | 0.0133 | 0.0200 | 0.73× |
| property | vue | 600 | 0.0833 | 0.0867 | 4.55× |
| state | gluon | 160 | 0.0750 | 0.0813 | 1.00× |
| state | lit | 160 | 0.0688 | 0.0750 | 0.92× |
| state | vue | 160 | 0.0875 | 0.0875 | 1.17× |
| list | gluon | 32 | 0.4063 | 0.4375 | 1.00× |
| list | lit | 32 | 0.7813 | 0.8438 | 1.92× |
| list | vue | 32 | 0.4688 | 0.5313 | 1.15× |

Every individual measured sample and validated output snapshot is preserved in the accompanying JSON file.

