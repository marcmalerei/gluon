# Cross-framework hydration benchmark evidence

Generated: 2026-10-04T13:06:52.373Z

Source: `0935bc295f526d8b5a4606a05727753409edd8af` on `origin/main` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.13.0, Lit 3.3.3 with SSR 4.1.0/1.1.8, Vue 3.5.39, Playwright 1.61.1

Method: 30 interleaved samples after 8 warm-ups. The server markup is installed before timing; hydration, row-119 interaction, and teardown are measured separately.

## chromium 149.0.7827.55

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 1.4000 / 2.7000 | 0.1000 / 0.2000 | 0.000000 / 0.1000 |
| lit | 27233 | 0.3000 / 0.4000 | 0.000000 / 0.1000 | 0.000000 / 0.1000 |
| vue | 10207 | 0.2000 / 0.4000 | 0.1000 / 0.2000 | 0.000000 / 0.1000 |

## firefox 151.0

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 3.0000 / 5.0000 | 0.000000 / 1.0000 | 0.000000 / 1.0000 |
| lit | 27233 | 0.000000 / 1.0000 | 0.000000 / 0.000000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 0.000000 |

## webkit 26.5

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 1.0000 / 2.0000 | 0.000000 / 1.0000 | 0.000000 / 1.0000 |
| lit | 27233 | 0.000000 / 1.0000 | 0.000000 / 0.000000 | 0.000000 / 0.000000 |
| vue | 10207 | 0.000000 / 1.0000 | 0.000000 / 1.0000 | 0.000000 / 1.0000 |

Correctness requires retained server main identity, 120 rows, a successful row-119 interaction, and an empty root after teardown. Cross-framework streaming, concurrent request capacity, and memory/GC behavior are outside this lane.
