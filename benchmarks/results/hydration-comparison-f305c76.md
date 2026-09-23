# Cross-framework hydration benchmark evidence

Generated: 2026-09-23T06:45:13.383Z

Source: `f305c76684786dd5e20c1f32614415b34d8fc810` on `codex/501-hydration-evidence` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.12.1, Lit 3.3.3 with SSR 4.1.0/1.1.8, Vue 3.5.39, Playwright 1.61.1

Method: 20 interleaved samples after 5 warm-ups. The server markup is installed before timing; hydration, row-119 interaction, and teardown are measured separately.

## chromium 149.0.7827.55

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 2.8000 / 3.6000 | 0.1000 / 0.2000 | 0.000000 / 0.1000 |
| lit | 27233 | 0.2000 / 0.2000 | 0.000000 / 0.000000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.1000 / 0.2000 | 0.1000 / 0.2000 | 0.000000 / 0.000000 |

## firefox 151.0

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 31.0000 / 44.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |
| lit | 27233 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |

## webkit 26.5

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 3.0000 / 3.0000 | 0.000000 / 0.000000 | 0.000000 / 0.000000 |
| lit | 27233 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |

Correctness requires retained server main identity, 120 rows, a successful row-119 interaction, and an empty root after teardown. Cross-framework streaming, concurrent request capacity, and memory/GC behavior are outside this lane.

