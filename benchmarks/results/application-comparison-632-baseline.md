# Application benchmark evidence

Generated: 2026-10-04T13:48:23.350Z

Source: `0935bc295f526d8b5a4606a05727753409edd8af` on `detached` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.13.0, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, 8 warm-up rounds, 30 samples, three-action update batches, and correctness checks over 120 keyed product records with navigation landmarks, filtering, sorting, conditional product detail, configuration events, bag state, and teardown. Lower milliseconds per action is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 0.5000 | 1.1000 | 1.00× |
| mount | lit | 1 | 0.4000 | 0.5000 | 0.80× |
| mount | vue | 1 | 0.3000 | 0.4000 | 0.60× |
| filter | gluon | 3 | 0.1333 | 0.2000 | 1.00× |
| filter | lit | 3 | 0.1667 | 0.2000 | 1.25× |
| filter | vue | 3 | 0.1667 | 0.2333 | 1.25× |
| sort | gluon | 3 | 0.1000 | 0.1333 | 1.00× |
| sort | lit | 3 | 0.1000 | 0.1333 | 1.00× |
| sort | vue | 3 | 0.1000 | 0.1333 | 1.00× |
| configure | gluon | 3 | 0.0333 | 0.0667 | 1.00× |
| configure | lit | 3 | 0.0333 | 0.0667 | 1.00× |
| configure | vue | 3 | 0.1000 | 0.1333 | 3.00× |
| bag | gluon | 3 | 0.0667 | 0.0667 | 1.00× |
| bag | lit | 3 | 0.0333 | 0.0667 | 0.50× |
| bag | vue | 3 | 0.1000 | 0.1333 | 1.50× |
| teardown | gluon | 20 | 0.0550 | 0.2600 | 1.00× |
| teardown | lit | 20 | 0.0150 | 0.0200 | 0.27× |
| teardown | vue | 20 | 0.0200 | 0.0300 | 0.36× |

Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

