# Spread binding benchmark evidence

Generated: 2026-09-22T10:44:05.734Z

Source: `508d000ef36bcf901fa5e027b3a3e6dd30dabddf` on `codex/issue-486-docs-vitepress` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, 80 cards, 6 warm-up rounds, and 25 interleaved samples. Lower latency is faster.

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| initial-commit | gluon | 93 | 0.2828 | 0.3071 | 1.00× |
| initial-commit | lit | 93 | 0.1355 | 0.1652 | 0.48× |
| stable-update-commit | gluon | 1200 | 0.0632 | 0.0639 | 1.00× |
| stable-update-commit | lit | 1200 | 0.0112 | 0.0113 | 0.18× |
| initial-end-to-end | gluon | 61 | 0.2885 | 0.3249 | 1.00× |
| initial-end-to-end | lit | 61 | 0.1443 | 0.1603 | 0.50× |
| stable-update-end-to-end | gluon | 1200 | 0.0654 | 0.0664 | 1.00× |
| stable-update-end-to-end | lit | 1200 | 0.0170 | 0.0173 | 0.26× |
| cleanup | gluon | 7380 | 0.0772 | 0.0787 | 1.00× |
| cleanup | lit | 7380 | 0.002778 | 0.003005 | 0.04× |

Invariants: equivalent DOM passed; stable element identity passed; style parity passed; cleanup passed.

Every measured sample is preserved in the accompanying JSON file.
