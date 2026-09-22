# Rendering benchmark evidence

Generated: 2026-09-22T11:31:56.014Z

Source: `4f1cbd67f21eea5d2269154fc08ba227841231ed` on `codex/issue-487-spread-followup` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.12.0, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.2.1

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 40 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000081 | 0.000087 | 1.00× |
| text | lit | 160000 | 0.000081 | 0.000081 | 1.00× |
| text | vue | 160000 | 0.000262 | 0.000269 | 3.23× |
| text | vanilla | 160000 | 0.000144 | 0.000156 | 1.77× |
| create | gluon | 24 | 0.5000 | 1.5833 | 1.00× |
| create | lit | 24 | 1.2500 | 2.3750 | 2.50× |
| create | vue | 24 | 0.4167 | 0.8750 | 0.83× |
| create | vanilla | 24 | 0.7083 | 0.8333 | 1.42× |
| update | gluon | 80 | 0.1000 | 0.1125 | 1.00× |
| update | lit | 80 | 0.1000 | 0.1125 | 1.00× |
| update | vue | 80 | 0.2250 | 0.2250 | 2.25× |
| update | vanilla | 80 | 0.1500 | 0.1625 | 1.50× |
| reverse | gluon | 80 | 0.2250 | 0.3375 | 1.00× |
| reverse | lit | 80 | 0.5250 | 0.6750 | 2.33× |
| reverse | vue | 80 | 0.2875 | 0.4000 | 1.28× |
| reverse | vanilla | 80 | 0.1625 | 0.1875 | 0.72× |

Every individual measured sample is preserved in the accompanying JSON file.
