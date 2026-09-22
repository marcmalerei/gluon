# Renderer allocation benchmark evidence

Generated: 2026-09-22T10:44:42.445Z

Source: `508d000ef36bcf901fa5e027b3a3e6dd30dabddf` on `codex/issue-486-docs-vitepress` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, batches calibrated to at least 12 ms, 6 warm-up rounds, and 25 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 3200000 | 0.0000054 | 0.0000072 |
| text | 200000 | 0.0000875 | 0.0000889 |
| spread | 5000 | 0.0017200 | 0.0017720 |
| array | 1600 | 0.0090625 | 0.0091750 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 5,872,164 bytes after forced GC; empty style metadata was shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
