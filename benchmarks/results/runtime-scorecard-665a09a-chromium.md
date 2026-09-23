# Runtime performance scorecard

Generated: 2026-09-23T06:01:22.300Z

Source: `665a09ade1a0c627c5eb301715b7b7c08bbe1a22` on `codex/492-app-benchmark-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Method: production builds, 3 warm-ups and 10 measured samples per lane. Browser engines are reported separately.

| Lane | Metric | Median ms | p95 ms | Criterion p95 ms | Status |
| --- | --- | ---: | ---: | ---: | --- |
| node | ssrRenderMs | 0.625 | 1.633 | 50.000 | pass |
| chromium 149.0.7827.55 | hydrationMs | 0.200 | 0.300 | 100.000 | pass |
| chromium 149.0.7827.55 | routeTransitionMs | 0.100 | 0.200 | 100.000 | pass |
| chromium 149.0.7827.55 | loaderCachedModuleLoadMs | 0.100 | 0.200 | 100.000 | pass |
| chromium 149.0.7827.55 | styleOwnershipMs | 0.003000 | 0.005000 | 10.000 | pass |
| chromium 149.0.7827.55 | teardownThirtyCyclesMs | 1.000 | 1.300 | 250.000 | pass |
| chromium 149.0.7827.55 | interactionMs | 0.000000 | 0.100 | 100.000 | pass |

## Correctness and retention

- chromium: all deterministic invariants passed; long-task observation supported with 0 entries.

Overall: **pass**. Every raw latency sample, correctness value, browser version, and observed long-task duration is preserved in the accompanying JSON file.

This is a Gluon production regression scorecard. It does not compare equivalent implementations in other frameworks and does not support a universal framework-performance ranking.

