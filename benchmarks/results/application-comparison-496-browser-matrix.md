# Application benchmark evidence

Generated: 2026-09-23T17:16:00.157Z

Source: `855a453e6cfba5aa1e4e7f22125a31511719b375` on `codex/496-application-update-path` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.2, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, 5 warm-up rounds, 20 samples, three-action update batches, and correctness checks over 120 keyed product records with navigation landmarks, filtering, sorting, conditional product detail, configuration events, bag state, and teardown. Lower milliseconds per action is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 0.7000 | 1.3000 | 1.00× |
| mount | lit | 1 | 0.5000 | 0.5000 | 0.71× |
| mount | vue | 1 | 0.4000 | 0.6000 | 0.57× |
| filter | gluon | 3 | 0.1667 | 0.5333 | 1.00× |
| filter | lit | 3 | 0.1667 | 0.2333 | 1.00× |
| filter | vue | 3 | 0.1667 | 0.2333 | 1.00× |
| sort | gluon | 3 | 0.1000 | 0.1333 | 1.00× |
| sort | lit | 3 | 0.1000 | 0.1333 | 1.00× |
| sort | vue | 3 | 0.1000 | 0.1333 | 1.00× |
| configure | gluon | 3 | 0.0667 | 0.1000 | 1.00× |
| configure | lit | 3 | 0.0333 | 0.0667 | 0.50× |
| configure | vue | 3 | 0.1000 | 0.1000 | 1.50× |
| bag | gluon | 3 | 0.0333 | 0.0667 | 1.00× |
| bag | lit | 3 | 0.0333 | 0.0667 | 1.00× |
| bag | vue | 3 | 0.1000 | 0.1000 | 3.00× |
| teardown | gluon | 1 | 0.5000 | 0.6000 | 1.00× |
| teardown | lit | 1 | 0.4000 | 0.5000 | 0.80× |
| teardown | vue | 1 | 0.3000 | 0.4000 | 0.60× |

## firefox 151.0

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 2.0000 | 2.0000 | 1.00× |
| mount | lit | 1 | 1.0000 | 1.0000 | 0.50× |
| mount | vue | 1 | 1.0000 | 2.0000 | 0.50× |
| filter | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| filter | lit | 3 | 0.3333 | 0.6667 | 1.00× |
| filter | vue | 3 | 0.3333 | 0.6667 | 1.00× |
| sort | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| sort | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| sort | vue | 3 | 0.3333 | 0.6667 | n/a (timer resolution) |
| configure | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | vue | 3 | 0.000000 | 1.6667 | n/a (timer resolution) |
| bag | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| teardown | gluon | 1 | 1.0000 | 2.0000 | 1.00× |
| teardown | lit | 1 | 1.0000 | 1.0000 | 1.00× |
| teardown | vue | 1 | 1.0000 | 2.0000 | 1.00× |

## webkit 26.5

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 1.0000 | 2.0000 | 1.00× |
| mount | lit | 1 | 1.0000 | 1.0000 | 1.00× |
| mount | vue | 1 | 1.0000 | 1.0000 | 1.00× |
| filter | gluon | 3 | 0.3333 | 0.3333 | 1.00× |
| filter | lit | 3 | 0.3333 | 0.6667 | 1.00× |
| filter | vue | 3 | 0.3333 | 0.3333 | 1.00× |
| sort | gluon | 3 | 0.000000 | 0.6667 | n/a (timer resolution) |
| sort | lit | 3 | 0.3333 | 1.0000 | n/a (timer resolution) |
| sort | vue | 3 | 0.3333 | 0.6667 | n/a (timer resolution) |
| configure | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| configure | lit | 3 | 0.000000 | 0.000000 | n/a (timer resolution) |
| configure | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | gluon | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | lit | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| bag | vue | 3 | 0.000000 | 0.3333 | n/a (timer resolution) |
| teardown | gluon | 1 | 1.0000 | 1.0000 | 1.00× |
| teardown | lit | 1 | 1.0000 | 1.0000 | 1.00× |
| teardown | vue | 1 | 0.000000 | 1.0000 | n/a (timer resolution) |

Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

