# Application benchmark evidence

Generated: 2026-09-23T06:01:09.054Z

Source: `665a09ade1a0c627c5eb301715b7b7c08bbe1a22` on `codex/492-app-benchmark-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.1, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, 3 warm-up rounds, 8 samples, three-action update batches, and correctness checks over 120 keyed product records with navigation landmarks, filtering, sorting, conditional product detail, configuration events, bag state, and teardown. Lower milliseconds per action is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster.

## firefox 151.0

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 2.0000 | 2.0000 | 1.00× |
| mount | lit | 1 | 1.0000 | 2.0000 | 0.50× |
| mount | vue | 1 | 1.0000 | 2.0000 | 0.50× |
| filter | gluon | 3 | 0.3333 | 1.0000 | 1.00× |
| filter | lit | 3 | 0.3333 | 1.0000 | 1.00× |
| filter | vue | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | gluon | 3 | 0.3333 | 0.6667 | 1.00× |
| sort | lit | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| teardown | gluon | 1 | 1.0000 | 2.0000 | 1.00× |
| teardown | lit | 1 | 1.0000 | 1.0000 | 1.00× |
| teardown | vue | 1 | 1.0000 | 4.0000 | 1.00× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 1.0000 | 2.0000 | 1.00× |
| mount | lit | 1 | 1.0000 | 1.0000 | 1.00× |
| mount | vue | 1 | 1.0000 | 1.0000 | 1.00× |
| filter | gluon | 3 | 0.3333 | 0.6667 | 1.00× |
| filter | lit | 3 | 0.3333 | 1.0000 | 1.00× |
| filter | vue | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| sort | lit | 3 | 0.3333 | 0.3333 | n/a (timer resolution) |
| sort | vue | 3 | 0.3333 | 0.3333 | n/a (timer resolution) |
| configure | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | lit | 3 | 0.000000 | 0.000000 | n/a (timer resolution) |
| configure | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| teardown | gluon | 1 | 0.000000 | 1.0000 | n/a (timer resolution) |
| teardown | lit | 1 | 1.0000 | 1.0000 | n/a (timer resolution) |
| teardown | vue | 1 | 1.0000 | 1.0000 | n/a (timer resolution) |

Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

