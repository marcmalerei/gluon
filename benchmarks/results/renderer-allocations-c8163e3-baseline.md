# Renderer allocation benchmark evidence

Generated: 2026-08-16T00:51:20.232Z

Source: `c8163e3aaa4cc0becff899111f2bbf421b272cee` on `main` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v24.18.0

Method: production build, batches calibrated to at least 12 ms, 8 warm-up rounds, and 40 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 100000 | 0.0000130 | 0.0000150 |
| text | 50000 | 0.0001060 | 0.0001141 |
| spread | 5000 | 0.0015800 | 0.0016400 |
| array | 1600 | 0.0086875 | 0.0090063 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 5,891,948 bytes after forced GC; empty style metadata was shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
