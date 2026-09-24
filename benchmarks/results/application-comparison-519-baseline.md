# Application benchmark evidence

Generated: 2026-09-23T19:26:48.570Z

Source: `e8109e817d5158dd811fc0fb4ed5e62f65a81230` on `detached` (working tree dirty)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.2, Lit 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, 20 warm-up rounds, 200 samples, three-action update batches, and correctness checks over 120 keyed product records with navigation landmarks, filtering, sorting, conditional product detail, configuration events, bag state, and teardown. Lower milliseconds per action is faster. Ratios are framework median ÷ Gluon median; values above 1 mean Gluon was faster.

## chromium 149.0.7827.55

| Scenario | Framework | Batch | Median ms/action | p95 ms/action | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| mount | gluon | 1 | 0.5000 | 0.6000 | 1.00× |
| mount | lit | 1 | 0.3000 | 0.4000 | 0.60× |
| mount | vue | 1 | 0.3000 | 0.4000 | 0.60× |
| filter | gluon | 3 | 0.1333 | 0.1667 | 1.00× |
| filter | lit | 3 | 0.1667 | 0.2333 | 1.25× |
| filter | vue | 3 | 0.1333 | 0.2000 | 1.00× |
| sort | gluon | 3 | 0.1000 | 0.1000 | 1.00× |
| sort | lit | 3 | 0.1000 | 0.1333 | 1.00× |
| sort | vue | 3 | 0.1000 | 0.1333 | 1.00× |
| configure | gluon | 3 | 0.0333 | 0.0667 | 1.00× |
| configure | lit | 3 | 0.0333 | 0.0667 | 1.00× |
| configure | vue | 3 | 0.0667 | 0.1000 | 2.00× |
| bag | gluon | 3 | 0.0333 | 0.0667 | 1.00× |
| bag | lit | 3 | 0.0333 | 0.0667 | 1.00× |
| bag | vue | 3 | 0.0667 | 0.1000 | 2.00× |
| teardown | gluon | 20 | 0.0550 | 0.0750 | 1.00× |
| teardown | lit | 20 | 0.0150 | 0.0200 | 0.27× |
| teardown | vue | 20 | 0.0200 | 0.0250 | 0.36× |

Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

