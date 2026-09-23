# Spread binding benchmark evidence

Generated: 2026-09-23T10:53:10.148Z

Source: `96366d9c43be0574b5196f117264a47dc2e10ba5` on `codex/515-isolate-performance-gaps` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 25 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon spread | vs Gluon explicit |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| initial-commit | gluon-spread | 144 | 0.2764 | 0.2935 | 1.00× | 1.50× |
| initial-commit | gluon-explicit | 144 | 0.1847 | 0.1935 | 0.67× | 1.00× |
| initial-commit | lit | 144 | 0.1375 | 0.1485 | 0.50× | 0.74× |
| stable-update-commit | gluon-spread | 1200 | 0.0569 | 0.0582 | 1.00× | 1.17× |
| stable-update-commit | gluon-explicit | 1200 | 0.0488 | 0.0492 | 0.86× | 1.00× |
| stable-update-commit | lit | 1200 | 0.0108 | 0.0110 | 0.19× | 0.22× |
| initial-end-to-end | gluon-spread | 120 | 0.2600 | 0.2838 | 1.00× | 1.51× |
| initial-end-to-end | gluon-explicit | 120 | 0.1725 | 0.1872 | 0.66× | 1.00× |
| initial-end-to-end | lit | 120 | 0.1475 | 0.1640 | 0.57× | 0.86× |
| stable-update-end-to-end | gluon-spread | 1200 | 0.0598 | 0.0606 | 1.00× | 1.08× |
| stable-update-end-to-end | gluon-explicit | 1200 | 0.0553 | 0.0561 | 0.93× | 1.00× |
| stable-update-end-to-end | lit | 1200 | 0.0167 | 0.0169 | 0.28× | 0.30× |
| cleanup | gluon-spread | 5400 | 0.0612 | 0.0619 | 1.00× | 2.85× |
| cleanup | gluon-explicit | 5400 | 0.0215 | 0.0227 | 0.35× | 1.00× |
| cleanup | lit | 5400 | 0.002759 | 0.003007 | 0.05× | 0.13× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

The explicit Gluon lane is the no-spread baseline. Values above 1.00× in the `vs Gluon explicit` column indicate the measured spread/framework overhead for that renderer and scenario.

Every measured sample is preserved in the accompanying JSON file.
