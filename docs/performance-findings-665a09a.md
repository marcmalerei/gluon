# Gluon performance findings

This report records the current comparative evidence from commit
`665a09ade1a0c627c5eb301715b7b7c08bbe1a22`. It is a workload-specific
engineering baseline, not a universal ranking of Gluon, Lit, or Vue.

## Evidence boundary

- Apple M4, 10 logical CPUs, 16 GiB, macOS Darwin 25.3.0.
- Node 24.18.0, npm 11.16.0, Vite 8.2.1, Playwright 1.61.1.
- Chromium 149.0.7827.55 is the primary comparative lane because the small
  app actions remain measurable above its timer resolution.
- Firefox 151 and WebKit 26.5 completed the same correctness checks, but their
  sub-millisecond samples often quantize to zero and are not used for ranking.
- Every benchmark is a production build and retains raw samples and final
  correctness snapshots.

## Where Gluon is better

The 1,000-row rendering matrix measured Gluon faster than both Lit and Vue for
initial keyed creation, complete keyed text updates, and keyed reversal in
Chromium. Gluon medians were 0.3095 ms for creation, 0.0775 ms for updates,
and 0.1486 ms for reversal. Lit measured 0.8310 / 0.0913 / 0.2614 ms and Vue
0.3167 / 0.1744 / 0.2057 ms respectively.

The 50-Custom-Element component matrix also favored Gluon in every measured
scenario:

| Scenario | Gluon median | Lit median | Vue median |
| --- | ---: | ---: | ---: |
| lifecycle | 0.9813 ms | 1.2609 ms | 1.0297 ms |
| public property | 0.0117 ms | 0.0126 ms | 0.0712 ms |
| internal state | 0.0460 ms | 0.0486 ms | 0.0603 ms |
| keyed list | 0.2339 ms | 0.3699 ms | 0.3511 ms |

Sources: [`rendering-comparison-665a09a-chromium.md`](../benchmarks/results/rendering-comparison-665a09a-chromium.md) and [`component-production-665a09a-chromium.md`](../benchmarks/results/component-production-665a09a-chromium.md).

## Where Gluon is worse

The app-shaped catalog flow is the more relevant counterweight to the
microbenchmarks. It renders 120 keyed products and exercises navigation
landmarks, filtering, sorting, conditional detail, configuration events, bag
state, and teardown through public client APIs.

| Scenario | Gluon | Lit | Vue | Finding |
| --- | ---: | ---: | ---: | --- |
| mount | 0.8000 ms | 0.5000 ms | 0.5000 ms | Gluon is 60% slower in this run |
| filter | 0.2667 ms | 0.1667 ms | 0.1667 ms | Gluon is 60% slower |
| sort | 0.1000 ms | 0.1000 ms | 0.1333 ms | Gluon ties Lit and beats Vue |
| configure | 0.0667 ms | 0.0333 ms | 0.0667 ms | Gluon ties Vue and is slower than Lit |
| bag | 0.0667 ms | 0.0333 ms | 0.0667 ms | Gluon ties Vue and is slower than Lit |
| teardown | 0.5000 ms | 0.4000 ms | 0.4000 ms | Gluon is 25% slower |

These are medians from 12 interleaved samples with four warm-ups and
three-action update batches. The raw report is
[`application-comparison-665a09a-chromium.md`](../benchmarks/results/application-comparison-665a09a-chromium.md).

The single-binding rendering lane exposes one additional disadvantage: Lit's
median was 0.000048 ms/op versus Gluon's 0.000059 ms/op. This is a very small
operation and should be treated as a focused hot-path signal, not an
application-level claim.

## Payload evidence

In the equivalent labelled-counter production fixture, Gluon was smaller than
Vue and React but larger than Lit:

| Fixture | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| Gluon | 43,888 B | 13,421 B | 12,008 B |
| Lit | 7,835 B | 3,435 B | 3,109 B |
| Vue | 61,426 B | 23,836 B | 21,763 B |
| React | 190,261 B | 59,067 B | 50,960 B |

This fixture intentionally imports only one counter interaction and no router,
component library, CSS framework, or code splitting. It proves a real payload
trade-off for the measured entry, not a general application bundle claim.
The raw report is [`bundle-matrix-665a09a.json`](../benchmarks/results/bundle-matrix-665a09a.json).

## SSR and hydration boundary

The first equivalent SSR string-render lane is now available. It renders the
same 120 keyed product rows through Gluon, Lit with `@lit-labs/ssr`, and Vue
with `@vue/server-renderer`, using 20 interleaved samples after five warm-ups
on the same Apple M4/Node 24.18.0 environment:

| Scenario | Gluon median | Lit median | Vue median | Finding |
| --- | ---: | ---: | ---: | --- |
| complete Node string render | 0.8264 ms | 0.1252 ms | 0.0727 ms | Gluon is slower in this workload |

The rendered output also differs in size: Gluon 23,615 bytes, Lit 22,886
bytes, and Vue 8,051 bytes. This is evidence for an optimization target, not
proof of a universal SSR ranking. The raw samples and correctness snapshots
are in [`ssr-comparison-877fc02.md`](../benchmarks/results/ssr-comparison-877fc02.md).

The Gluon-only runtime scorecard still passes its Node SSR and browser
hydration correctness/latency criteria, including a 0.625 ms median Node SSR
lane and 0.200 ms Chromium hydration median. Streaming throughput, concurrent
request capacity, and memory/GC behavior remain unmeasured and are not claimed
here.

The cross-framework hydration lane is now measured separately. It installs
framework-native server markup before timing and hydrates the same 120-row
catalog through Gluon's `hydrateApplication()`, Lit's
`@lit-labs/ssr-client` `hydrate()`, and Vue's `createSSRApp().mount()`:

| Framework | Markup bytes | Hydration median | Hydration p95 |
| --- | ---: | ---: | ---: |
| Gluon | 28,225 | 2.8000 ms | 3.6000 ms |
| Lit | 27,233 | 0.2000 ms | 0.2000 ms |
| Vue | 10,207 | 0.1000 ms | 0.2000 ms |

This Chromium result shows a material Gluon hydration cost in this workload.
Firefox and WebKit completed the retained-DOM, interaction, and cleanup gates,
but their sub-millisecond Lit/Vue samples are timer-quantized and are not used
for ranking. Raw evidence is in
[`hydration-comparison-f305c76.md`](../benchmarks/results/hydration-comparison-f305c76.md).

## Interpretation

The evidence supports two simultaneous conclusions:

1. Gluon's keyed reconciliation and Custom-Element update paths are strong
   relative to the tested Lit and Vue implementations.
2. Gluon still has measurable adoption costs in minimal payload and in the
   app-shaped mount/filter/teardown path.

The improvement issues derived from this report are:

- [#493](https://github.com/marcmalerei/gluon/issues/493): reduce the focused
  primitive text-update gap without changing public APIs.
- [#494](https://github.com/marcmalerei/gluon/issues/494): reduce minimal Gluon
  client payload without changing public exports.
- [#495](https://github.com/marcmalerei/gluon/issues/495): optimize conditional
  interaction and teardown overhead.
- [#496](https://github.com/marcmalerei/gluon/issues/496): optimize app-shaped
  catalog mount and filter updates.
- [#497](https://github.com/marcmalerei/gluon/issues/497): optimize SSR string
  rendering for large keyed trees without changing public APIs.
- [#501](https://github.com/marcmalerei/gluon/issues/501): retain a
  cross-framework hydration evidence lane.
- [#502](https://github.com/marcmalerei/gluon/issues/502): reduce Gluon
  hydration overhead for large keyed trees without changing public APIs.

Every issue requires preserving public exports, DOM/event/hydration contracts,
and the existing correctness gates. Any change should be validated against
this benchmark set and the full repository suite.
