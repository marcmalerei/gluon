# SSR comparison benchmark evidence

Generated: 2026-09-23T08:56:48.862Z

Source: `6015e4fa37a7ca549c3658564bce6dfa1931b243` on `codex/497-ssr-hotpath` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.12.2, Lit 3.3.3 with @lit-labs/ssr 4.1.0, Vue 3.5.39 with @vue/server-renderer 3.5.39

Method: 32 interleaved samples after 8 warm-ups, rotating framework order. The workload renders 120 keyed product rows in one catalog main/section/list tree. Lower milliseconds per complete string render is faster.

| Framework | Median ms | p95 ms | Markup bytes | vs Gluon |
| --- | ---: | ---: | ---: | ---: |
| gluon | 0.1250 | 0.1516 | 23615 | 1.00× |
| lit | 0.1200 | 0.3965 | 22886 | 0.96× |
| vue | 0.0703 | 0.1375 | 8051 | 0.56× |

This lane compares complete Node string rendering only. It does not claim streaming throughput, request concurrency, memory/GC behavior, or browser hydration equivalence.
Every measured sample and correctness snapshot is preserved in the accompanying JSON file.

