# Spread binding benchmark evidence

Generated: 2026-09-23T10:42:56.117Z

Source: `156ea4a45cd41152e926d6791a82c899ce9b78a4` on `codex/515-isolate-performance-gaps` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 25 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon spread | vs Gluon explicit |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| initial-commit | gluon-spread | 90 | 0.2678 | 0.2911 | 1.00× | 1.48× |
| initial-commit | gluon-explicit | 90 | 0.1811 | 0.1953 | 0.68× | 1.00× |
| initial-commit | lit | 90 | 0.1333 | 0.1562 | 0.50× | 0.74× |
| stable-update-commit | gluon-spread | 1200 | 0.0573 | 0.0586 | 1.00× | 1.17× |
| stable-update-commit | gluon-explicit | 1200 | 0.0489 | 0.0503 | 0.85× | 1.00× |
| stable-update-commit | lit | 1200 | 0.0110 | 0.0112 | 0.19× | 0.22× |
| initial-end-to-end | gluon-spread | 120 | 0.2633 | 0.2882 | 1.00× | 1.50× |
| initial-end-to-end | gluon-explicit | 120 | 0.1750 | 0.1877 | 0.66× | 1.00× |
| initial-end-to-end | lit | 120 | 0.1450 | 0.1573 | 0.55× | 0.83× |
| stable-update-end-to-end | gluon-spread | 1200 | 0.0605 | 0.0614 | 1.00× | 1.09× |
| stable-update-end-to-end | gluon-explicit | 1200 | 0.0553 | 0.0559 | 0.91× | 1.00× |
| stable-update-end-to-end | lit | 1200 | 0.0166 | 0.0170 | 0.27× | 0.30× |
| cleanup | gluon-spread | 8200 | 0.0616 | 0.0622 | 1.00× | 2.86× |
| cleanup | gluon-explicit | 8200 | 0.0216 | 0.0222 | 0.35× | 1.00× |
| cleanup | lit | 8200 | 0.002671 | 0.002890 | 0.04× | 0.12× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

The explicit Gluon lane is the no-spread baseline. Values above 1.00× in the `vs Gluon explicit` column indicate the measured spread/framework overhead for that renderer and scenario.

Every measured sample is preserved in the accompanying JSON file.
