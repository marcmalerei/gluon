# Renderer allocation benchmark evidence

Generated: 2026-07-14T18:30:16.483Z

Source: `a507c06f569a473fd3d39d22f6d6c0e75928464e` on `codex/reduce-renderer-allocations` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v22.22.0

Method: production build, batches calibrated to at least 12 ms, 8 warm-up rounds, and 40 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 400000 | 0.0000213 | 0.0000223 |
| text | 100000 | 0.0001570 | 0.0002252 |
| spread | 5000 | 0.0018200 | 0.0018610 |
| array | 1600 | 0.0109 | 0.0112 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 7,480,620 bytes after forced GC; empty style metadata was not shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
