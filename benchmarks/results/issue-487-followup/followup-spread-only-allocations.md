# Renderer allocation benchmark evidence

Generated: 2026-09-22T11:21:09.232Z

Source: `64d943bc6aa69a85ded66d464f4fbe1a8b565be1` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, batches calibrated to at least 12 ms, 6 warm-up rounds, and 25 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 3200000 | 0.0000054 | 0.0000055 |
| text | 200000 | 0.0000860 | 0.0000870 |
| spread | 5000 | 0.0016000 | 0.0016200 |
| array | 1600 | 0.0085625 | 0.0088000 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 5,875,272 bytes after forced GC; empty style metadata was shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
