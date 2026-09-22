# Spread binding benchmark evidence

Generated: 2026-09-22T11:26:10.330Z

Source: `1156f222e2c2bdbd89eb4558ce52c9295acc15ee` on `detached` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 15 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| initial-commit | gluon | 82 | 0.3061 | 0.3215 | 1.00× |
| initial-commit | lit | 82 | 0.1366 | 0.1566 | 0.45× |
| stable-update-commit | gluon | 1210 | 0.0607 | 0.0612 | 1.00× |
| stable-update-commit | lit | 1210 | 0.0110 | 0.0114 | 0.18× |
| initial-end-to-end | gluon | 120 | 0.3108 | 0.3349 | 1.00× |
| initial-end-to-end | lit | 120 | 0.1583 | 0.2172 | 0.51× |
| stable-update-end-to-end | gluon | 1210 | 0.0652 | 0.0676 | 1.00× |
| stable-update-end-to-end | lit | 1210 | 0.0174 | 0.0181 | 0.27× |
| cleanup | gluon | 7200 | 0.0770 | 0.0790 | 1.00× |
| cleanup | lit | 7200 | 0.002722 | 0.003082 | 0.04× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

Every measured sample is preserved in the accompanying JSON file.
