# Renderer allocation benchmark evidence

Generated: 2026-08-16T01:37:31.173Z

Source: `50f5d27aac57ca803ebf3b795e83fb5e652eaa97` on `codex/issue-415-lit-performance` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, batches calibrated to at least 12 ms, 8 warm-up rounds, and 40 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 1600000 | 0.0000054 | 0.0000064 |
| text | 200000 | 0.0000863 | 0.0000885 |
| spread | 10000 | 0.0015650 | 0.0016400 |
| array | 1600 | 0.0087500 | 0.0089375 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 5,890,444 bytes after forced GC; empty style metadata was shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
