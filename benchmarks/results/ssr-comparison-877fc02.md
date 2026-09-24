# SSR comparison benchmark evidence

Generated: 2026-09-23T06:12:03.597Z

Source: `877fc02807464ff3059b5569a1ca15721d00e018` on `codex/492-app-benchmark-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.12.3, Lit 3.3.3 with @lit-labs/ssr 4.1.0, Vue 3.5.39 with @vue/server-renderer 3.5.39

Method: 20 interleaved samples after 5 warm-ups, rotating framework order. The workload renders 120 keyed product rows in one catalog main/section/list tree. Lower milliseconds per complete string render is faster.

| Framework | Median ms | p95 ms | Markup bytes | vs Gluon |
| --- | ---: | ---: | ---: | ---: |
| gluon | 0.8264 | 0.9525 | 23615 | 1.00× |
| lit | 0.1252 | 0.1655 | 22886 | 0.15× |
| vue | 0.0727 | 0.1110 | 8051 | 0.09× |

This lane compares complete Node string rendering only. It does not claim streaming throughput, request concurrency, memory/GC behavior, or browser hydration equivalence.
Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

