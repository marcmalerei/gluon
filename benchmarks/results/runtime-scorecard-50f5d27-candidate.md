# Runtime performance scorecard

Generated: 2026-08-16T01:37:46.251Z

Source: `50f5d27aac57ca803ebf3b795e83fb5e652eaa97` on `codex/issue-415-lit-performance` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Method: production builds, 5 warm-ups and 20 measured samples per lane. Browser engines are reported separately.

| Lane | Metric | Median ms | p95 ms | Criterion p95 ms | Status |
| --- | --- | ---: | ---: | ---: | --- |
| node | ssrRenderMs | 0.610 | 0.835 | 50.000 | pass |
| chromium 149.0.7827.55 | hydrationMs | 0.200 | 0.300 | 100.000 | pass |
| chromium 149.0.7827.55 | routeTransitionMs | 0.100 | 0.100 | 100.000 | pass |
| chromium 149.0.7827.55 | loaderCachedModuleLoadMs | 0.200 | 0.300 | 100.000 | pass |
| chromium 149.0.7827.55 | styleOwnershipMs | 0.003000 | 0.004000 | 10.000 | pass |
| chromium 149.0.7827.55 | teardownThirtyCyclesMs | 0.900 | 1.200 | 250.000 | pass |
| chromium 149.0.7827.55 | interactionMs | 0.000000 | 0.100 | 100.000 | pass |
| firefox 151.0 | hydrationMs | 1.000 | 1.000 | 100.000 | pass |
| firefox 151.0 | routeTransitionMs | 0.000000 | 0.000000 | 100.000 | pass |
| firefox 151.0 | loaderCachedModuleLoadMs | 0.000000 | 1.000 | 100.000 | pass |
| firefox 151.0 | styleOwnershipMs | 0.000000 | 0.010 | 10.000 | pass |
| firefox 151.0 | teardownThirtyCyclesMs | 2.000 | 4.000 | 250.000 | pass |
| firefox 151.0 | interactionMs | 0.000000 | 0.000000 | 100.000 | pass |
| webkit 26.5 | hydrationMs | 0.000000 | 1.000 | 100.000 | pass |
| webkit 26.5 | routeTransitionMs | 0.000000 | 1.000 | 100.000 | pass |
| webkit 26.5 | loaderCachedModuleLoadMs | 0.000000 | 1.000 | 100.000 | pass |
| webkit 26.5 | styleOwnershipMs | 0.000000 | 0.010 | 10.000 | pass |
| webkit 26.5 | teardownThirtyCyclesMs | 1.000 | 2.000 | 250.000 | pass |
| webkit 26.5 | interactionMs | 0.000000 | 0.000000 | 100.000 | pass |

## Correctness and retention

- chromium: all deterministic invariants passed; long-task observation supported with 0 entries.
- firefox: all deterministic invariants passed; long-task observation not exposed by this engine.
- webkit: all deterministic invariants passed; long-task observation not exposed by this engine.

Overall: **pass**. Every raw latency sample, correctness value, browser version, and observed long-task duration is preserved in the accompanying JSON file.

This is a Gluon production regression scorecard. It does not compare equivalent implementations in other frameworks and does not support a universal framework-performance ranking.

