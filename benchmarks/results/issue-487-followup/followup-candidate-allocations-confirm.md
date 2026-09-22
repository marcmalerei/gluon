# Renderer allocation benchmark evidence

Generated: 2026-09-22T11:29:55.694Z

Source: `4f1cbd67f21eea5d2269154fc08ba227841231ed` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, batches calibrated to at least 12 ms, 6 warm-up rounds, and 25 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 3200000 | 0.0000053 | 0.0000072 |
| text | 200000 | 0.0000725 | 0.0000754 |
| spread | 5000 | 0.0016200 | 0.0016760 |
| array | 1600 | 0.0085625 | 0.0086875 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 5,875,748 bytes after forced GC; empty style metadata was shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
