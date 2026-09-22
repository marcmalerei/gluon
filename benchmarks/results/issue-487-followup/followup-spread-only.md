# Spread binding benchmark evidence

Generated: 2026-09-22T11:21:03.997Z

Source: `64d943bc6aa69a85ded66d464f4fbe1a8b565be1` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 25 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| initial-commit | gluon | 54 | 0.2926 | 0.3430 | 1.00× |
| initial-commit | lit | 54 | 0.1426 | 0.1730 | 0.49× |
| stable-update-commit | gluon | 2400 | 0.0594 | 0.0609 | 1.00× |
| stable-update-commit | lit | 2400 | 0.009708 | 0.009950 | 0.16× |
| initial-end-to-end | gluon | 120 | 0.2942 | 0.3198 | 1.00× |
| initial-end-to-end | lit | 120 | 0.1517 | 0.1675 | 0.52× |
| stable-update-end-to-end | gluon | 1200 | 0.0633 | 0.0643 | 1.00× |
| stable-update-end-to-end | lit | 1200 | 0.0162 | 0.0170 | 0.26× |
| cleanup | gluon | 4800 | 0.0776 | 0.0796 | 1.00× |
| cleanup | lit | 4800 | 0.002771 | 0.003200 | 0.04× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

Every measured sample is preserved in the accompanying JSON file.
