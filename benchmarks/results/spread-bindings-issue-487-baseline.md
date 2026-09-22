# Spread binding benchmark evidence

Generated: 2026-09-22T09:50:11.410Z

Source: `ae56ac9d813d0b7185552af0709e2d90dfeb3a7d` on `codex/issue-486-docs-vitepress` (working tree dirty)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 25 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| initial-commit | gluon | 93 | 0.2484 | 0.2665 | 1.00× |
| initial-commit | lit | 93 | 0.1344 | 0.1505 | 0.54× |
| stable-update-commit | gluon | 1200 | 0.1436 | 0.1464 | 1.00× |
| stable-update-commit | lit | 1200 | 0.0111 | 0.0114 | 0.08× |
| initial-end-to-end | gluon | 122 | 0.2361 | 0.2536 | 1.00× |
| initial-end-to-end | lit | 122 | 0.1443 | 0.1556 | 0.61× |
| stable-update-end-to-end | gluon | 1200 | 0.1503 | 0.1532 | 1.00× |
| stable-update-end-to-end | lit | 1200 | 0.0169 | 0.0174 | 0.11× |
| cleanup | gluon | 6100 | 0.0613 | 0.0623 | 1.00× |
| cleanup | lit | 6100 | 0.002672 | 0.003007 | 0.04× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

Every measured sample is preserved in the accompanying JSON file.
