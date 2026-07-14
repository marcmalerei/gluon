# Renderer allocation benchmark evidence

Generated: 2026-07-14T18:37:15.928Z

Source: `59f5610cf0f0a67ed4e9242a49b900bf593a03d9` on `codex/reduce-renderer-allocations` (working tree clean)

Environment: Apple M4, Chromium 149.0.7827.55, Node v22.22.0

Method: production build, batches calibrated to at least 12 ms, 8 warm-up rounds, and 40 measured samples. Lower latency is faster.

| Scenario | Batch | Median ms/op | p95 ms/op |
| --- | ---: | ---: | ---: |
| template | 1600000 | 0.0000053 | 0.0000061 |
| text | 100000 | 0.0001400 | 0.0001440 |
| spread | 5000 | 0.0017800 | 0.0018210 |
| array | 1600 | 0.0088125 | 0.0090031 |

Retained heap diagnostic: 100,000 reachable TemplateResults added 5,882,516 bytes after forced GC; empty style metadata was shared.

The heap diagnostic is Chromium-specific and run-level. It does not establish a portable per-object size or a cross-browser memory guarantee.

Every measured timing sample is preserved in the accompanying JSON file.
