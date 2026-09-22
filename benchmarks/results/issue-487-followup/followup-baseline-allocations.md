# Renderer allocation benchmark evidence

Generated: 2026-09-22T11:17:16.508Z

Source: `1156f222e2c2bdbd89eb4558ce52c9295acc15ee` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, batches calibrated to at least 12 ms, 6 warm-up rounds, and 25 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 3200000 | 0.0000053 | 0.0000054 |
| text | 200000 | 0.0000880 | 0.0000895 |
| spread | 5000 | 0.0017400 | 0.0018600 |
| array | 1600 | 0.0086250 | 0.0087375 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 5,872,276 bytes after forced GC; empty style metadata was shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
