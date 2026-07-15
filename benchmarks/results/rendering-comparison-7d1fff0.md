# Rendering benchmark evidence

Generated: 2026-07-15T08:28:33.476Z

Source: `7d1fff0ce155c8fae2a69ef9537bf76c54701138` on `codex/rendering-parity-167` (working tree clean)

Environment: Apple M4, 10 logical CPUs, 16.0 GiB memory, darwin 25.3.0

Packages: Gluon 1.0.7, Lit 3.3.3 / lit-html 3.3.3, Vue 3.5.39, Playwright 1.61.1, Vite 8.1.4

Method: production build, batches calibrated to at least 8 ms for the fastest renderer, 8 warm-up rounds, and 40 interleaved samples per renderer and scenario. The text scenario updates one binding; create, update, and reverse operate on 1,000 keyed rows. Lower latency is faster. Ratios are renderer median ÷ Gluon median; values above 1 mean Gluon was faster in that browser/scenario.

## chromium 149.0.7827.55

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 270000 | 0.000047 | 0.000049 | 1.00× |
| text | lit | 270000 | 0.000047 | 0.000048 | 1.00× |
| text | vue | 270000 | 0.000184 | 0.000195 | 3.94× |
| text | vanilla | 270000 | 0.000077 | 0.000092 | 1.65× |
| create | gluon | 42 | 0.2857 | 0.3643 | 1.00× |
| create | lit | 42 | 0.7690 | 0.8524 | 2.69× |
| create | vue | 42 | 0.3214 | 0.4333 | 1.13× |
| create | vanilla | 42 | 0.4476 | 0.5167 | 1.57× |
| update | gluon | 200 | 0.0640 | 0.0665 | 1.00× |
| update | lit | 200 | 0.0915 | 0.0960 | 1.43× |
| update | vue | 200 | 0.1665 | 0.1770 | 2.60× |
| update | vanilla | 200 | 0.0995 | 0.1220 | 1.55× |
| reverse | gluon | 70 | 0.1329 | 0.1543 | 1.00× |
| reverse | lit | 70 | 0.2557 | 0.2743 | 1.92× |
| reverse | vue | 70 | 0.1957 | 0.2171 | 1.47× |
| reverse | vanilla | 70 | 0.1114 | 0.1271 | 0.84× |

## firefox 151.0

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 160000 | 0.000112 | 0.000119 | 1.00× |
| text | lit | 160000 | 0.000119 | 0.000125 | 1.06× |
| text | vue | 160000 | 0.000300 | 0.000313 | 2.67× |
| text | vanilla | 160000 | 0.000081 | 0.000087 | 0.72× |
| create | gluon | 24 | 0.5417 | 0.9583 | 1.00× |
| create | lit | 24 | 1.6250 | 3.4167 | 3.00× |
| create | vue | 24 | 0.6250 | 1.8333 | 1.15× |
| create | vanilla | 24 | 0.6667 | 1.2500 | 1.23× |
| update | gluon | 80 | 0.1125 | 0.2000 | 1.00× |
| update | lit | 80 | 0.2000 | 0.2625 | 1.78× |
| update | vue | 80 | 0.2500 | 1.2250 | 2.22× |
| update | vanilla | 80 | 0.1000 | 0.1125 | 0.89× |
| reverse | gluon | 80 | 0.2000 | 0.2375 | 1.00× |
| reverse | lit | 80 | 0.4375 | 0.4625 | 2.19× |
| reverse | vue | 80 | 0.3000 | 1.1375 | 1.50× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.81× |

## webkit 26.5

| Scenario | Renderer | Batch | Median ms/op | p95 ms/op | vs Gluon |
| --- | --- | ---: | ---: | ---: | ---: |
| text | gluon | 128000 | 0.000070 | 0.000078 | 1.00× |
| text | lit | 128000 | 0.000078 | 0.000078 | 1.11× |
| text | vue | 128000 | 0.000266 | 0.000266 | 3.78× |
| text | vanilla | 128000 | 0.000141 | 0.000148 | 2.00× |
| create | gluon | 24 | 0.4167 | 0.5000 | 1.00× |
| create | lit | 24 | 1.1250 | 1.8750 | 2.70× |
| create | vue | 24 | 0.4167 | 0.4583 | 1.00× |
| create | vanilla | 24 | 0.6667 | 0.7917 | 1.60× |
| update | gluon | 160 | 0.0750 | 0.0813 | 1.00× |
| update | lit | 160 | 0.1000 | 0.1062 | 1.33× |
| update | vue | 160 | 0.2062 | 0.2188 | 2.75× |
| update | vanilla | 160 | 0.1500 | 0.1563 | 2.00× |
| reverse | gluon | 80 | 0.2250 | 0.2500 | 1.00× |
| reverse | lit | 80 | 0.5000 | 0.5250 | 2.22× |
| reverse | vue | 80 | 0.2625 | 0.2750 | 1.17× |
| reverse | vanilla | 80 | 0.1625 | 0.1750 | 0.72× |

Every individual measured sample is preserved in the accompanying JSON file.

