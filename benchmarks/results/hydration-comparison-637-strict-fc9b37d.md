# Cross-framework hydration benchmark evidence

Generated: 2026-10-04T18:36:06.675Z

Source: `fc9b37d10c387e92a5e62d9f576fd827c6b0331e` on `codex/637-hydration-fast-path` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0, Node v24.18.0

Packages: Gluon 1.13.0, Lit 3.3.3 with SSR 4.1.0/1.1.8, Vue 3.5.39, Playwright 1.61.1

Method: 50 interleaved samples after 8 warm-ups. The server markup is installed before timing; hydration, row-119 interaction, and teardown are measured separately. Gluon verification: strict.

## chromium 149.0.7827.55

| Framework | Markup bytes | Hydration median/p95 ms | Interaction median/p95 ms | Teardown median/p95 ms |
| --- | ---: | ---: | ---: | ---: |
| gluon | 28225 | 1.3000 / 2.6000 | 0.1000 / 0.1000 | 0.1000 / 0.2000 |
| lit | 27233 | 0.2000 / 0.4000 | 0.000000 / 0.1000 | 0.000000 / 0.1000 |
| vue | 10207 | 0.1000 / 0.3000 | 0.1000 / 0.2000 | 0.000000 / 0.1000 |

Correctness requires retained server main identity, 120 rows, a successful row-119 interaction, and an empty root after teardown. Cross-framework streaming, concurrent request capacity, and memory/GC behavior are outside this lane.

