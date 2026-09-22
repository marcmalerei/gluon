# Renderer allocation benchmark evidence

Generated: 2026-09-22T09:43:34.801Z

Source: `ae56ac9d813d0b7185552af0709e2d90dfeb3a7d` on `codex/issue-486-docs-vitepress` (working tree dirty)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, batches calibrated to at least 12 ms, 6 warm-up rounds, and 25 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 1600000 | 0.0000053 | 0.0000071 |
| text | 200000 | 0.0000845 | 0.0000905 |
| spread | 10000 | 0.0014700 | 0.0014980 |
| array | 1600 | 0.0082500 | 0.0084250 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 5,890,152 bytes after forced GC; empty style metadata was shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
