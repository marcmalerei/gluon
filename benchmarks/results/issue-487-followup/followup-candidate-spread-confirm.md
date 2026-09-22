# Spread binding benchmark evidence

Generated: 2026-09-22T11:29:50.791Z

Source: `4f1cbd67f21eea5d2269154fc08ba227841231ed` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 15 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| initial-commit | gluon | 90 | 0.2778 | 0.3023 | 1.00× |
| initial-commit | lit | 90 | 0.1389 | 0.1692 | 0.50× |
| stable-update-commit | gluon | 1200 | 0.0583 | 0.0595 | 1.00× |
| stable-update-commit | lit | 1200 | 0.0112 | 0.0114 | 0.19× |
| initial-end-to-end | gluon | 120 | 0.2917 | 0.3067 | 1.00× |
| initial-end-to-end | lit | 120 | 0.1533 | 0.1709 | 0.53× |
| stable-update-end-to-end | gluon | 1220 | 0.0632 | 0.0644 | 1.00× |
| stable-update-end-to-end | lit | 1220 | 0.0174 | 0.0177 | 0.27× |
| cleanup | gluon | 8200 | 0.0777 | 0.0798 | 1.00× |
| cleanup | lit | 8200 | 0.002732 | 0.003126 | 0.04× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

Every measured sample is preserved in the accompanying JSON file.
