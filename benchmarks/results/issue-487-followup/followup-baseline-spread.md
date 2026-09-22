# Spread binding benchmark evidence

Generated: 2026-09-22T11:17:12.300Z

Source: `1156f222e2c2bdbd89eb4558ce52c9295acc15ee` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 25 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| initial-commit | gluon | 93 | 0.2914 | 0.3168 | 1.00× |
| initial-commit | lit | 93 | 0.1376 | 0.1619 | 0.47× |
| stable-update-commit | gluon | 1210 | 0.0612 | 0.0638 | 1.00× |
| stable-update-commit | lit | 1210 | 0.0114 | 0.0144 | 0.19× |
| initial-end-to-end | gluon | 121 | 0.2967 | 0.3250 | 1.00× |
| initial-end-to-end | lit | 121 | 0.1471 | 0.1593 | 0.50× |
| stable-update-end-to-end | gluon | 1200 | 0.0648 | 0.0656 | 1.00× |
| stable-update-end-to-end | lit | 1200 | 0.0173 | 0.0176 | 0.27× |
| cleanup | gluon | 4800 | 0.0766 | 0.0776 | 1.00× |
| cleanup | lit | 4800 | 0.002854 | 0.003296 | 0.04× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

Every measured sample is preserved in the accompanying JSON file.
