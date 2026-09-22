# Spread binding benchmark evidence

Generated: 2026-09-22T11:23:51.760Z

Source: `4f1cbd67f21eea5d2269154fc08ba227841231ed` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 25 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| initial-commit | gluon | 93 | 0.2796 | 0.3112 | 1.00× |
| initial-commit | lit | 93 | 0.1376 | 0.1589 | 0.49× |
| stable-update-commit | gluon | 1210 | 0.0583 | 0.0594 | 1.00× |
| stable-update-commit | lit | 1210 | 0.0112 | 0.0114 | 0.19× |
| initial-end-to-end | gluon | 122 | 0.2893 | 0.3003 | 1.00× |
| initial-end-to-end | lit | 122 | 0.1484 | 0.1710 | 0.51× |
| stable-update-end-to-end | gluon | 1200 | 0.0618 | 0.0632 | 1.00× |
| stable-update-end-to-end | lit | 1200 | 0.0173 | 0.0176 | 0.28× |
| cleanup | gluon | 6000 | 0.0761 | 0.0775 | 1.00× |
| cleanup | lit | 6000 | 0.002767 | 0.003233 | 0.04× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

Every measured sample is preserved in the accompanying JSON file.
