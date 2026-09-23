# Rendering and component performance evidence

Gluon's comparative benchmarks measure the current repository source against
pinned Lit and Vue versions. The template-level matrix also includes optimized
Vanilla DOM. They exist to produce inspectable evidence, not to guarantee that
one renderer or component model wins.

The runtime's measured hot paths include direct unstyled string-root updates,
seeded primitive text slots, direct single-root cloning, fragment batching for
multi-node replacements, filtered element/comment traversal for general
templates, precomputed binding priorities, parallel key/value storage for keyed
repeats, and keyed-list fast paths for unchanged and reversed order. Safe
primitive keyed rows defer their structural comment anchor and full Part graph
until a value becomes empty, styled, directive-backed, nested, or otherwise
structural. A per-template cache retains at most 1,024 never-mounted primitive
row prototypes by key and exact rendered values; every root receives a deep
clone, so mounted DOM mutations cannot contaminate later roots. Generic keyed
changes still trim stable heads and tails, retain their longest unchanged
contiguous run, and move only the surrounding groups. These shortcuts retain
the external-DOM recovery, cleanup, style, hydration, and keyed-identity
contracts covered by the browser suite.

The exact-reverse fast path reuses the direct element for each still-safe
primitive row, avoiding per-row node-array materialization. Structural,
mixed, or multi-node rows continue through generic keyed reconciliation.

## Stable primitive text update hotpath

Issue [#493](https://github.com/marcmalerei/gluon/issues/493) closes the small
single-binding gap identified in the cross-framework matrix. When an existing
root has the same template identity, an unstyled single NodePart, an in-place
DOM, and a string value, `render()` now reaches the existing safe text updater
before walking the complete value tree for component-style dependencies. The
general renderer remains the fallback for nested values, styles, directives,
hydration, disturbed DOM, and every other unproven shape. No public export or
rendering contract changed.

The paired production Chromium runs used the same Apple M4 host, Chromium
149.0.7827.55, 10 warm-ups, 64 interleaved samples, and the existing 1,000-row
rendering matrix. The baseline is clean commit `d42ab8c`; the candidate is
clean commit `7c1151f`. Lower is faster:

| Scenario | Baseline median | Candidate median | Change |
| --- | ---: | ---: | ---: |
| Single text update | 0.0000578 ms/op | 0.0000467 ms/op | **−19.1%** |
| 1,000-row create | 0.3028 ms/op | 0.3048 ms/op | +0.7% |
| 1,000-row update | 0.0763 ms/op | 0.0769 ms/op | +0.9% |
| 1,000-row reverse | 0.1386 ms/op | 0.1467 ms/op | +5.9% |

The text p95 changed from 0.0000597 to 0.0000496 ms/op (−16.9%). The larger
scenarios are retained as regression evidence, not as claimed improvements;
their small differences are within the run-to-run variance of this local
microbenchmark. Every measured sample and correctness snapshot is retained in
the paired
[`rendering-comparison-493-baseline-d42ab8c.json`](../benchmarks/results/rendering-comparison-493-baseline-d42ab8c.json)
and
[`rendering-comparison-493-candidate-7c1151f.json`](../benchmarks/results/rendering-comparison-493-candidate-7c1151f.json)
files, with Markdown summaries alongside them.

Reproduce the candidate lane with:

```bash
npm run benchmark:rendering -- \
  --browsers=chromium \
  --samples=64 \
  --warmup=10 \
  --output=.tmp/issue-493-candidate.json
```

## Spread-binding update benchmark

Issue [#499](https://github.com/marcmalerei/gluon/issues/499) adds a separate
Quark-side shape-compilation lane to this optimization area. A stable safe
`q.<tag>()` option-key shape is cached per factory and emitted as dedicated
Core bindings; open or unsupported key shapes continue to use `SpreadPart`.
The implementation is intended to reduce classification work at DOM commit,
but no speed claim is recorded until the frozen 80-card and canonical atom
measurements are rerun with production builds. Shape transitions are measured
separately because a changed template identity is not a stable update.

The [incremental allocation follow-up](../benchmarks/results/spread-followup-issue-487-comparison.md)
compares the value-aware spread implementation with lazy bookkeeping and a
style preflight that avoids empty dependency maps. It retains independent repeats, the
three-engine rendering matrix, component results, size changes, and limitations.

`npm run benchmark:spread-bindings` measures 80 equivalent product-card
templates in a production Chromium build. It now contains three lanes that
produce the same observable DOM: Gluon with a fresh native-props object through
`...=${props}`, Gluon with explicit bindings, and Lit with explicit bindings.
The Gluon-explicit lane is the no-spread baseline; the Gluon-spread versus
Gluon-explicit difference isolates spread overhead on the same renderer and
workload. Separate lanes measure cold commit, stable text-only update commit,
their end-to-end forms, and renderer cleanup. The runner rejects changed
element identity, text or attribute differences, inline-style differences,
incomplete cleanup, and browser console warnings before writing evidence.

```bash
npm run benchmark:spread-bindings -- \
  --samples=25 \
  --warmup=6 \
  --output=.tmp/spread-binding-results.json
```

The paired JSON retains every sample, calibrated batch sizes, source state,
toolchain and browser versions, and the parity invariants. This workload is
specifically an 80-card binding and stable-props update measurement. It does
not establish general framework superiority, and changes must also pass the
canonical rendering, component, allocation, bundle, cleanup, security, SSR,
and hydration gates. The issue #487 baseline, candidate, trade-offs, and raw evidence are
retained in the
[`spread-bindings-issue-487-comparison.md`](../benchmarks/results/spread-bindings-issue-487-comparison.md)
report.

## Renderer-owned node-array reuse

Issue #295 removed two redundant array copies before private DOM
reconciliation. An unchanged `unsafeHTML()` value and an externally detached
stable keyed row now pass the renderer's existing node array back to
`replaceNodes()`. That method reads the array and retains the same reference; it
does not mutate the input. DOM identity and external-mutation recovery remain
covered by focused browser tests.

The production Core build from clean `main` at `801611d` and the candidate
build were loaded together in each browser with the same reactivity build.
Separate DOM roots repeatedly rendered one stable three-node `unsafeHTML()`
value through the same outer template. Build order alternated for 12 warm-up
rounds and 100 measured samples. Batches were calibrated to at least 12 ms for
the faster build: 65,536 renders in Chromium and Firefox, and 131,072 in
WebKit.

| Browser | Main median / p95 ms/op | Candidate median / p95 ms/op |
| --- | ---: | ---: |
| Chromium 149 | 0.0002274 / 0.0002319 | 0.0002182 / 0.0002228 |
| Firefox 151 | 0.0002441 / 0.0002747 | 0.0002289 / 0.0002747 |
| WebKit 26.5 | 0.0001450 / 0.0001450 | 0.0001373 / 0.0001373 |

Candidate medians were 4.0%, 6.3%, and 5.3% lower respectively. An independent
run measured 3.3%, 6.3%, and 5.6% lower medians. The reported minified Core
runtime chunk changed from 79.20 kB to 79.19 kB while its rounded gzip size
remained 20.86 kB. These figures describe stable raw-markup rerenders on the
recorded Apple M4 environment. The rarer keyed external-recovery path is
behaviorally covered but is not included in the throughput claim.

Official production Vite builds also recognize a conservative component-level
case: one fixed `GluonElement` template with one declared primitive property in
a text Part and, optionally, one private readonly event handler. Property-only
updates reuse a root-bound updater and a shared microtask queue that preserves
element update order, sorting only when enqueue order differs. The queue drains
in place in the ordinary case, while its failure and reentrant paths retain
later work. Simple production declarations skip setter-side contract branches
they do not declare. Retained event callbacks use one guard while preserving
the captured application context, component boundary, synchronous error source,
and asynchronous rejection source. Lifecycle hooks, reactive or explicit
concurrent updates, hydration, released styles, root disturbance, non-primitive
values, and every unproven template shape use the full effect and renderer path.
This optimization does not change standalone `html`/`render` behavior and is
absent from development builds.

The retained baseline is stored in
[`benchmarks/results/`](../benchmarks/results/). Its Markdown file summarizes
medians and p95 values; the paired JSON file preserves every sample, invariant
snapshot, calibrated batch size, source commit, working-tree state, package and
browser versions, Node and npm versions, operating system, CPU, and memory.

Every pull request and `main` run additionally retains ten-sample template and
component Chromium/Firefox/WebKit comparisons plus the production GLUON GOODS
customer-flow budget output and the expanded runtime scorecard for 30 days in
the `quality-evidence-<commit>` workflow artifact. Each engine is measured on
the runner that already provisioned it for the browser matrix and therefore
writes separate `*-chromium`, `*-firefox`, and `*-webkit` JSON/Markdown pairs.
A browserless aggregation gate verifies that all three commits and engine
records agree before retaining the artifact. Those shorter CI runs detect
regressions but do not replace the larger committed matrices used by the
comparative text below.

## Expanded runtime scorecard

`npm run benchmark:runtime` production-builds the measured code and records
seven separate lanes: Node SSR, browser hydration, memory-router transitions,
manifest-driven component loading, constructable stylesheet ownership,
application teardown, and reactive interaction latency. Chromium, Firefox,
and WebKit run in separate fresh contexts; their values are never averaged.
Where an engine exposes `PerformanceObserver` long-task entries, the same run
also retains their count and raw durations.

The versioned pass criteria live in
[`quality/runtime-performance-criteria.json`](../quality/runtime-performance-criteria.json).
They declare sample counts, warm-ups, p95 latency ceilings, thirty teardown
cycles, retained-resource invariants, and the supported-engine long-task limit
before measurement. Every warm-up and measured operation validates observable
correctness. A failed invariant or missing metric criterion rejects the run.

```bash
npx playwright install chromium firefox webkit
npm run benchmark:runtime

# Short diagnostic; not a replacement for committed full evidence
npm run benchmark:runtime -- \
  --browsers=chromium \
  --samples=5 \
  --warmup=2 \
  --output=.tmp/runtime-scorecard-diagnostic.json
```

The paired JSON and Markdown output defaults to
`.tmp/quality-evidence/runtime-scorecard.{json,md}`. JSON preserves every raw
sample, source state, hardware, OS, Node/npm, package and exact browser
versions, correctness values, and long-task observations. The scorecard is a
Gluon production regression gate. It has no equivalent-framework fixtures, so
it does not extend the Lit/Vue comparisons below and cannot support a universal
framework-performance ranking.

The current full
[`runtime-scorecard-50c6448.md`](../benchmarks/results/runtime-scorecard-50c6448.md)
run measures clean source commit `50c6448` with 20 samples and five warm-ups on
the recorded Apple M4 environment. All declared p95 criteria and deterministic
resource invariants passed in Chromium 149, Firefox 151, and WebKit 26.5.
Chromium exposed the long-task entry type and recorded zero entries; Firefox
and WebKit did not expose that observer entry type, which is recorded as an
unsupported observation rather than a zero measurement. The paired JSON keeps
all raw values and exact environment metadata.

## Run the benchmark

Install the three Playwright-managed browser engines once, then run the
production comparison:

```bash
npx playwright install chromium firefox webkit
npm run benchmark:rendering
npm run benchmark:spread-bindings
npm run benchmark:components
npm run benchmark:application
npm run benchmark:hydration
npm run benchmark:ssr
npm run benchmark:runtime
npm run profile:component-property-state
```

Hosted quality, release, and DX runs use the digest-pinned official Playwright
1.61.1 Noble image, which already supplies these engines and their Linux system
dependencies. The install command remains the local-development path; hosted
workflows do not repeat it or invoke `--with-deps`.

The default run uses Chromium, Firefox, and WebKit with eight warm-up rounds and
40 measured samples. A shorter local diagnostic run can select browsers and
sample counts explicitly:

```bash
npm run benchmark:rendering -- \
  --browsers=chromium,firefox \
  --samples=10 \
  --warmup=4 \
  --timeout=180000 \
  --output=.tmp/rendering-diagnostic.json

npm run benchmark:components -- \
  --browsers=chromium,firefox \
  --samples=10 \
  --warmup=4 \
  --timeout=300000 \
  --output=.tmp/component-diagnostic.json

npm run profile:component-property-state -- \
  --warmup=1000 \
  --iterations=20000 \
  --interval=100 \
  --output=.tmp/component-property-state-profile.json
```

Each command builds its benchmark with Vite in production mode and explicitly
compiles aliased Gluon source with `__GLUON_DEV__` set to `false`. The component
matrix additionally builds `@gluonjs/compiler` and applies the official Gluon
Vite plugin, so compiler-owned production paths are measured. The runner
serves that exact output locally, launches each browser headlessly, rejects
console errors or warnings, and writes JSON plus Markdown. Rendering uses a
180-second per-browser timeout; components use 300 seconds. The JSON path
supplied with `--output` must end in `.json`; the Markdown summary uses the same
basename. `npm run check:benchmark-builds` rejects a comparative config that
does not compile Gluon's production branch.

The property/state profiler uses the same production component build but runs
only Gluon in a fresh Chromium context per scenario. Chrome DevTools records a
raw `.cpuprofile` at the declared sampling interval while the correctness-gated
harness updates 50 mounted components for the requested iterations. The JSON
summary records top self-time frames and exact raw-profile filenames. This is
diagnostic hot-path evidence, not a cross-browser performance result.

For an interactive demonstration in a browser:

```bash
npm run dev:benchmark
npm run dev:benchmark:components
npm run dev:benchmark:application
```

The template development server listens on `0.0.0.0:4174`; the component page
uses port 4175. Interactive results are useful for exploration but are not
retained evidence; use the production CLI commands for reviewable results.

## Application-shaped workload

`npm run benchmark:application` measures the same catalog flow in
Gluon, Lit, and Vue through their public client APIs. The fixture contains 120
keyed product records, primary navigation landmarks, filtering, sorting,
conditional product detail, configuration events, bag state, and teardown.
Every scenario validates the rendered product boundaries and state before its
sample is retained. Update scenarios measure a three-action batch and report
milliseconds per action; mount and teardown are measured as one operation.

The app-shaped fixture is deliberately smaller than GLUON GOODS and is not a
claim that the frameworks are interchangeable applications. It complements
the shop's Gluon-only customer-flow budget with an equivalent three-framework
surface. Gluon and Vue render into light DOM; Lit uses its public open Shadow
DOM root. The semantic output and action sequence remain equivalent, while
Shadow DOM behavior is also covered by the component matrix above.

```bash
npm run benchmark:application -- \
  --browsers=chromium,firefox \
  --samples=12 \
  --warmup=4 \
  --output=.tmp/application-benchmark.json
```

The raw JSON preserves every sample, source state, dependency/browser/runtime
versions, hardware, and final correctness snapshot. Results are specific to
the recorded workload and environment. They must not be summarized as a
universal Gluon/Lit/Vue ranking.

### App-shaped update follow-up (#496)

The application harness uses explicit attribute and event bindings for all
three frameworks. It does not use an attribute spread in the Gluon path; the
separate spread-binding workload remains isolated in
`benchmarks/spread-bindings`.

CPU profiling of the filter scenario showed that the dominant Gluon cost was
recreating and garbage-collecting keyed product rows when a filter removed and
then reintroduced them. Gluon now keeps a bounded, per-`NodePart` cache of up
to 64 recently removed keyed children. Cached children are suspended so their
listeners and directives are inactive, reused by key when they return, and
fully disconnected when evicted or when the parent is torn down. This is an
internal optimization and does not change the public API.

The diagnostic profile can be reproduced with:

```bash
npm run profile:application-update -- \
  --scenario=filter \
  --warmup=200 \
  --iterations=1000 \
  --output=.tmp/application-update-profile.json
```

In the paired Chromium run recorded in
`benchmarks/results/application-comparison-496-baseline.json` and
`benchmarks/results/application-comparison-496-candidate.json`, Gluon's
filter median decreased from `0.2333` to `0.1333 ms/action` (about 43%),
with p95 decreasing from `0.3000` to `0.2000 ms/action`. That puts this
workload at the same median and p95 as Vue and below Lit. Mount and teardown
medians did not materially change, so this result is evidence for the keyed
update path only, not a universal framework ranking.

## SSR comparison workload

`npm run benchmark:ssr` compares complete Node string rendering for Gluon,
Lit with `@lit-labs/ssr`, and Vue with `@vue/server-renderer` over the same
120-row catalog tree. It rotates framework order, validates row count and
boundaries, and retains raw samples, markup bytes, versions, hardware, and
source state.

```bash
npm run benchmark:ssr -- \
  --samples=20 \
  --warmup=5 \
  --output=.tmp/ssr-comparison.json
```

This is a complete string-render lane. It does not measure streaming
throughput, concurrent request capacity, memory/GC behavior, or browser
hydration; those require separate workload contracts. Lit hydration support is
available through `@lit-labs/ssr-client`, but it is not silently folded into
this Node-only comparison.

## Cross-framework hydration workload

`npm run benchmark:hydration` takes equivalent 120-row server-rendered catalog
fixtures through Gluon's `hydrateApplication()`, Lit's
`@lit-labs/ssr-client` `hydrate()`, and Vue's `createSSRApp().mount()`
hydration path. It measures hydration execution, a row-119 interaction after
hydration, and teardown separately. The harness verifies retained server-main
identity, all 120 rows, successful interaction, and removal of element/text
content after teardown. Framework-specific comment markers may remain as
renderer ownership anchors and are not treated as leaked element content.

```bash
npm run benchmark:hydration -- \
  --browsers=chromium \
  --samples=20 \
  --warmup=5 \
  --output=.tmp/hydration-comparison.json
```

The server markup is parsed before timing, so the hydration number measures
the framework handoff rather than HTML parsing. Markup transport is recorded
per framework because Lit SSR markers, Gluon hydration markers, and Vue's SSR
output are not byte-identical. This lane does not claim streaming,
concurrent-request, or memory/GC results.

### Hydration hot-path follow-up (#502)

The successful Gluon hydration path now collects adoption markers while the
existing structural comparison walks the actual DOM. It no longer performs a
second full `TreeWalker` pass over the same tree. The comparison also checks
expected and client-only attributes with direct loops instead of creating a
per-element union `Set` and temporary attribute arrays. Mismatch categories,
ordering, recovery, marker ranges, and retained DOM identity remain covered by
`tests/hydration.spec.ts`; no public API or marker format changed.

On the recorded Apple M4 / Chromium 149.0.7827.55 setup, both runs used 50
interleaved samples after 8 warm-ups, the 120-row catalog fixture, and the
production benchmark build:

| Gluon lane | Hydration median / p95 | Interaction median / p95 |
| --- | ---: | ---: |
| Main baseline `2565964` | 2.6 / 3.6 ms | 0.1 / 0.1 ms |
| Candidate `44d090b` | 2.2 / 3.2 ms | 0.1 / 0.2 ms |

The candidate median is approximately 15% lower and p95 approximately 11% lower
in this paired run. This is evidence for a successful-path hydration improvement
on this workload, not a universal Lit/Vue performance ranking. The complete raw
samples and environment metadata are retained in the
[`#502 baseline`](../benchmarks/results/hydration-comparison-502-baseline.json)
and
[`#502 candidate`](../benchmarks/results/hydration-comparison-502-candidate.json)
JSON files, with Markdown summaries alongside them.

## Template workloads

All implementations produce the same `<main>` and `<p data-id>` output. Browser
tests verify the row count, boundary IDs, and text before performance evidence
can be accepted.

| Scenario | Work per operation |
| --- | --- |
| `text` | Alternate one dynamic text binding in a stable template. |
| `create` | Render 1,000 keyed rows into a fresh detached root. |
| `update` | Alternate all text values across 1,000 keyed rows. |
| `reverse` | Reverse and restore 1,000 keyed rows while preserving keys. |

Gluon and Lit use their public `html`, `render`, and keyed `repeat` APIs. Vue
uses its public `h` and `render` APIs with keyed children. Vanilla DOM retains
direct node references for updates and moves existing keyed nodes for reversal.

Each scenario first calibrates one shared batch size until the fastest renderer
takes at least 8 ms. The framework order rotates on every warm-up and measured
sample. Reported values are milliseconds per operation, so lower is faster. A
ratio is the comparison renderer's median divided by Gluon's median; a ratio
above 1 means Gluon was faster for only that browser and workload.

## Component workloads

Gluon uses the public `GluonElement` class, Lit uses `LitElement`, and Vue uses
`defineCustomElement`. Every implementation is an autonomous Custom Element
with open Shadow DOM. Each scenario renders the same focused observable surface
in all three frameworks: lifecycle includes label, button, and keyed list;
property includes only the label; state includes only the button; and list
includes only the keyed list. This prevents a simple property or state cell
from measuring unrelated reconciliation of 1,000 unchanged rows. Browser tests
validate component count, scenario-specific output, and complete cleanup.
Property and state use dedicated scenario classes in all three frameworks, so
their render functions do not retain a benchmark-only scenario branch.

One operation covers 50 component boundaries. List and lifecycle components own
20 keyed rows each, so those scenarios cover 1,000 rows in total.

| Scenario | Work per operation |
| --- | --- |
| `lifecycle` | Create, connect, render, disconnect, and clean up 50 elements. |
| `property` | Update one public string property on 50 mounted elements. |
| `state` | Dispatch one internal button interaction on 50 mounted elements. |
| `list` | Reverse or restore 20 keyed rows inside each of 50 elements. |

Each framework settles through its public completion primitive before another
operation begins. The shared batch is calibrated until the fastest framework
takes at least 40 ms, and framework order rotates for warm-ups and measurements.
This keeps a one-millisecond browser timer step below 2.5% of the measured batch
before normalization to one operation; it deliberately increases run time to
reduce quantization and short-batch noise.
The production runner gives every scenario a fresh browser context so lifecycle
allocation and collection cannot carry into the property, state, or list
cells. This isolation removes the cross-framework phase shifts observed when
all four Firefox scenarios shared one long-lived context. Reported values are
milliseconds per 50 components.

## Production-mode correction

Comparative Vite configs before issue #174 aliased Gluon directly to repository
source without defining `__GLUON_DEV__`. Those builds were minified, but Gluon
selected its development diagnostic fallback while Lit and Vue selected their
production paths. Earlier retained comparison files remain inspectable
historical diagnostics and same-mode Gluon baseline/candidate comparisons, but
they do not satisfy the current production comparison contract and must not
support a Lit/Vue superiority claim. The clean production-mode matrices added
with issues #172 and #174 supersede that framework-comparison interpretation.

## Property/state profile evidence

The issue #415 Chromium profiles each record 20,000 measured iterations across
50 mounted Gluon components after 1,000 warm-ups. Clean baseline runtime commit
`c8163e3` measured 240.3 ms for property and 1,163.4 ms for state. Clean
candidate commit `50f5d27` measured 221.4 ms and 1,015.3 ms respectively: 7.9%
and 12.7% lower elapsed time in those run-specific profiles. The
[baseline](../benchmarks/results/component-property-state-profile-c8163e3-baseline.json)
and [candidate](../benchmarks/results/component-property-state-profile-50f5d27-candidate.json)
JSON summaries link their raw property/state `.cpuprofile` files.

The candidate state profile still attributes 61.2% of sampled self time to
native button `click` dispatch and 7.4% to `querySelector`; those are retained
as workload costs rather than presented as removable Gluon runtime work. CPU
sampling and elapsed-time profiles diagnose this recorded environment; they do
not establish portable per-call costs.

## Current committed matrix

The current rendering matrix measures clean source commit `4c7bdac`; the
isolated-scenario component candidate measures clean source commit `50f5d27`.
Both use 40 samples, eight warm-up rounds, and Playwright-managed Chromium 149,
Firefox 151, and WebKit 26.5 on the recorded Apple M4 environment. Component
batches use the 40 ms resolution floor described above. The paired JSON files
retain every sample and invariant snapshot; the Markdown files expose every
median and p95 value.

### Template rendering matrix

The complete
[`rendering-production-4c7bdac.md`](../benchmarks/results/rendering-production-4c7bdac.md)
matrix shows Gluon faster than Lit in all 12 browser/scenario median
comparisons. Lit median divided by Gluon median is
1.02×/2.66×/1.45×/1.96× for Chromium text/create/update/reverse,
1.08×/2.73×/1.67×/1.94× for Firefox, and
1.09×/2.45×/1.33×/2.11× for WebKit.

Gluon is faster than Vue in 11 of 12 cells. Vue wins WebKit `create` at
0.4167 ms/op versus Gluon's 0.4583 ms/op. The optimized Vanilla DOM harness is
faster for Chromium reverse, Firefox text/update/reverse, and WebKit reverse;
Gluon is faster in the other seven Vanilla comparisons. This supports the
recorded workload results, not a general rendering ranking.

### Component matrix

The clean high-resolution baseline uses runtime commit `c8163e3` plus the
measurement-only calibration commit `2fe4f40`. It wins 10 of 12 Lit median
cells: Chromium state loses at 0.976× and WebKit state is exactly 1.000×.
Chromium property is only 1.0048×. This demonstrates that the longer batch floor
does not itself manufacture the final result. The complete baseline is retained
as [Markdown](../benchmarks/results/component-production-baseline-c8163e3-high-resolution.md)
and paired JSON.

Two independent clean candidate runs then pass all 12 Lit median cells and all
12 Lit p95 cells. Lit median divided by Gluon median is:

| Engine | Run | Lifecycle | Property | State | List |
| --- | --- | ---: | ---: | ---: | ---: |
| Chromium 149 | 1 | 1.322× | 1.061× | 1.045× | 1.554× |
| Chromium 149 | 2 | 1.521× | 1.084× | 1.030× | 1.528× |
| Firefox 151 | 1 | 1.141× | 1.371× | 1.527× | 1.372× |
| Firefox 151 | 2 | 1.027× | 1.404× | 1.533× | 1.385× |
| WebKit 26.5 | 1 | 1.372× | 1.163× | 1.043× | 2.154× |
| WebKit 26.5 | 2 | 1.370× | 1.141× | 1.017× | 2.125× |

The full [run 1](../benchmarks/results/component-production-50f5d27-run1.md)
and [run 2](../benchmarks/results/component-production-50f5d27-run2.md)
retain exact medians, p95 values, calibrated batches, snapshots, and every raw
sample. The narrowest repeated median result is WebKit state at 1.017× in run
2, so the claim remains specific to these recorded workloads and environment.

Against Vue, candidate Gluon wins 10 of 12 median cells in both runs. Vue wins
Firefox and WebKit lifecycle. This supports only the recorded component
workloads, not a universal framework ranking.

The companion allocation run improved template-result creation by 58.2%, text
updates by 18.6%, and spread updates by 0.9% versus the clean baseline. Array
updates were 0.7% slower, so they are explicitly recorded as unchanged within
run noise rather than claimed as an improvement. Retaining 100,000 reachable
TemplateResults used 5,890,444 bytes, 1,504 bytes below the baseline run. See
the [baseline](../benchmarks/results/renderer-allocations-c8163e3-baseline.md)
and [candidate](../benchmarks/results/renderer-allocations-50f5d27-candidate.md).

The equivalent labelled-counter bundle decreased from 41,108/12,726/11,361
raw/gzip/Brotli bytes to 40,896/12,643/11,275 bytes. The paired
[baseline](../benchmarks/results/bundle-matrix-c8163e3-baseline.json) and
[candidate](../benchmarks/results/bundle-matrix-50f5d27-candidate.json) reports
also retain browser parity and the Lit/Vue/React controls. The full candidate
[runtime scorecard](../benchmarks/results/runtime-scorecard-50f5d27-candidate.md)
passes every SSR, hydration, route, loader, style, teardown, interaction, and
retention criterion in all supported engines; the
[baseline](../benchmarks/results/runtime-scorecard-c8163e3-baseline.md) is
retained alongside it.

Neither matrix measures an Apple M1. Hardware model, operating system, browser,
thermal state, and other load are part of the evidence boundary; an M1 result
requires its own retained output from the same command.

## Historical rendering diagnostics

Issue #81 retained a controlled Chromium confirmation with 40 interleaved
samples and 12 warm-up rounds. Both runs used the same minified benchmark mode,
Chromium
149.0.7827.55, Node 22.22.0, and the same recorded Apple M4 environment. The
[clean `main` baseline at `09e921a`](../benchmarks/results/rendering-comparison-09e921a-chromium.md)
and [clean optimized run at `3c17ec4`](../benchmarks/results/rendering-comparison-3c17ec4-chromium.md)
retain their complete samples in the paired JSON files.

| Scenario | Baseline median / p95 ms/op | Optimized median / p95 ms/op |
| --- | ---: | ---: |
| `text` | 0.000054583 / 0.000059167 | 0.000054074 / 0.000059259 |
| `create` | 1.1333 / 1.5611 | 0.9833 / 1.2917 |
| `update` | 0.077500 / 0.093750 | 0.076875 / 0.088125 |
| `reverse` | 0.158571 / 0.180000 | 0.152857 / 0.180000 |

The optimized `create` median was 13.2% lower and its p95 was 17.3% lower in
that confirmation. The steady-state text, update, and reverse medians were also
lower; update p95 was lower, reverse p95 was unchanged, and text p95 differed
by 0.000000093 ms/op. Those timed steady-state operations update existing
nodes, so they do not enter the new empty-part insertion branch. A second
40-sample optimized run measured `create` at 1.0458 ms/op, independently below
the 1.1333 ms/op baseline. These run-specific observations are not extrapolated
beyond the recorded environment.

The single-pass binding-instantiation change retains expression-index order for
values and hydration while resolving cloned DOM nodes in traversal order. In
the same 20-sample/eight-warm-up method as the preceding `55206f4` matrix, the
1,000-row `create` median was lower by 9% in Chromium (1.1472 to 1.0405 ms/op),
15% in Firefox (1.9167 to 1.6250 ms/op), and 14% in WebKit (1.4583 to 1.2500
ms/op). Its p95 was also lower in all three engines. The timed text, update, and
reverse operations update existing instances and do not run template-binding
instantiation; their run-to-run medians ranged from 4.8% lower to 3.4% higher,
with every distribution retained rather than selected by outcome.

A separate [Chromium CPU-profile summary](../benchmarks/results/template-binding-instantiation-34cd49a.json)
and its [raw `.cpuprofile`](../benchmarks/results/template-binding-instantiation-34cd49a.cpuprofile)
cover that historical minified comparison at a 100 µs sampling interval, four warm-up
rounds, and ten measured samples. The clean `34cd49a` run records zero
`walkPath()` self samples and zero native `childNodes.item()` self samples;
`TreeWalker.nextNode()` accounts for 402 self samples. The profile covers all
four benchmark workloads and records Chromium 149.0.7827.55 and the exact
source commit.

## Cached template cloning

Gluon parses each HTML or SVG template callsite once into an
`HTMLTemplateElement`. Its `content` is a special `DocumentFragment`: browsers
give it an inert template-contents `ownerDocument`, not the active page
`document`. Importing that fragment is therefore necessary, but it only needs
to happen once per compiled template.

The compiler imports the inert content into the active document and caches that
active `DocumentFragment` by `TemplateStringsArray` identity and template type.
Every new root or nested template instance calls `cloneNode(true)` on the same
cached fragment. The deep clone is required because an instance needs the whole
static subtree, including Gluon's comment binding markers. A fragment is the
common source type for single-root, multi-root, HTML, and SVG templates; no
element subtype is required. Dynamic values, properties, and event listeners
are applied to the independent clone after instantiation and are never stored
on the cached prototype. Updating an already mounted instance of the same
template does not clone at all.

Issue #161 compared the previous per-instance import with the cached
active-document prototype on the same Apple M4 environment. Both runs used the
same historical minified benchmark mode, 20 measured samples, eight warm-up
rounds, Chromium 149, Firefox 151, and WebKit 26.5. The timed `create` scenario
creates 1,000 keyed rows; it is the scenario that enters the
template-instantiation path.

| Browser | Per-instance import median / p95 ms/op | Cached prototype median / p95 ms/op |
| --- | ---: | ---: |
| Chromium | 1.1625 / 1.3292 | 1.0556 / 1.3028 |
| Firefox | 1.8333 / 5.6667 | 1.8333 / 2.1667 |
| WebKit | 1.2917 / 1.9167 | 1.2917 / 1.9583 |

The Chromium median was 9.2% lower and its p95 was 2.0% lower. Firefox and
WebKit medians were unchanged at the benchmark's timer resolution; Firefox's
p95 was lower and WebKit's p95 was 2.2% higher in this run pair. The complete
baseline and candidate distributions are retained in
[`template-cloning-161-baseline.json`](../benchmarks/results/template-cloning-161-baseline.json)
and
[`template-cloning-161-candidate.json`](../benchmarks/results/template-cloning-161-candidate.json);
the paired Markdown files summarize the same runs. These are separate runs, so
the raw distributions are the evidence and the result is not generalized
beyond the recorded environment.

## Renderer allocation paths

Issue #163 added a Chromium allocation benchmark for four focused
paths that the comparative renderer matrix does not isolate: creating an
unstyled `TemplateResult`, updating one stable text binding, reconciling a
ten-property spread, and updating 100 unkeyed string children. Each scenario
retains every timing sample after batch calibration and warm-up.

Three temporary allocations were removed without changing the public API:

- all unstyled `html` and `svg` results share one frozen empty component-style
  dependency list instead of allocating and freezing a new empty array;
- unkeyed children are reused only at the same array index, so cleanup compares
  the previous and next positional entries directly instead of allocating a
  `Set<PartChild>` on every update;
- spread cleanup iterates its existing key `Set` directly. ECMAScript Set
  iteration remains valid when the current entry is deleted, so stale
  properties, attributes, events, styles, data, ARIA state, and refs retain the
  same cleanup behavior without a copied key array.

The benchmark also retains 100,000 reachable simple TemplateResults, forces
Chromium garbage collection, and records `Runtime.getHeapUsage` before and
after. This is a run-level Chromium diagnostic: it verifies the expected shared
metadata effect but is not a portable object-size or cross-browser memory
claim. The baseline and candidate distributions are retained in
[`renderer-allocations-163-baseline.json`](../benchmarks/results/renderer-allocations-163-baseline.json)
and
[`renderer-allocations-163-candidate.json`](../benchmarks/results/renderer-allocations-163-candidate.json).

Both retained runs used the same historical minified harness, Apple M4 environment,
Chromium 149, 40 measured samples, and eight warm-up rounds:

| Scenario | Baseline median / p95 ms/op | Optimized median / p95 ms/op |
| --- | ---: | ---: |
| TemplateResult creation | 0.0000213 / 0.0000223 | 0.0000053 / 0.0000061 |
| Stable text render | 0.0001570 / 0.0002252 | 0.0001400 / 0.0001440 |
| Ten-property spread | 0.0018200 / 0.0018610 | 0.0017800 / 0.0018210 |
| 100 unkeyed strings | 0.0109 / 0.0112 | 0.0088125 / 0.0090031 |

The optimized medians were lower by 75.1%, 10.8%, 2.2%, and 19.2%
respectively in these runs. The retained TemplateResult heap delta fell from
7,480,620 to 5,882,516 bytes, a 1,598,104-byte or 21.4% reduction for this
Chromium diagnostic. Separate-run distributions and the explicit limitations,
not the percentages alone, remain the evidence.

Run the focused benchmark with:

```bash
npm run benchmark:allocations
```

## Shared component-style comparison fast path

Issue #292 removed redundant work from repeated component-style claims without
changing the style metadata or ownership APIs. Unstyled `TemplateResult`
instances already share one frozen empty dependency list, so identical list
references now return immediately. Distinct lists use an indexed comparison
instead of allocating an `Array.prototype.every()` callback.

The production Core build from clean `main` at `28133ca` and the candidate build
were loaded together in each browser with the same reactivity build. Separate
DOM roots repeatedly updated one nested unstyled template. The build order
alternated for eight warm-up rounds and 40 measured samples; every sample
contained 50,000 updates. Both builds therefore experienced the same browser
process, timer, and run-level load.

| Browser | Main median / p95 ms/op | Candidate median / p95 ms/op |
| --- | ---: | ---: |
| Chromium 149 | 0.000138 / 0.000140 | 0.000124 / 0.000124 |
| Firefox 151 | 0.000180 / 0.000220 | 0.000180 / 0.000200 |
| WebKit 26.5 | 0.000120 / 0.000200 | 0.000120 / 0.000160 |

The Chromium median and p95 were 10.1% and 11.4% lower. Firefox and WebKit
medians stayed at the same timer resolution while their p95 values were one
timer step lower. These figures describe this controlled nested-template path
on the recorded Apple M4 environment; they are not a general rendering-speed
claim.

## Reactivity debugger fast path

Reactive effects may opt into `onTrack` and `onTrigger` debugger hooks. Normal
effects do not provide those hooks. Issue #165 moved the hook-presence check in
front of development-mode detection, so ordinary dependency tracking and
triggering no longer read `globalThis.process?.env?.NODE_ENV` for an event that
cannot be observed. Hooked development effects and production suppression keep
their existing behavior.

A focused Node 22.22.0 benchmark alternated one reactive property and
synchronously reran its one-property effect. Both runs used the production
reactivity build on the same Apple M4 environment, with eight warm-up rounds,
40 measured samples, and batches calibrated to at least 12 ms.

| Run | Median ms/mutation + rerun | p95 ms/mutation + rerun |
| --- | ---: | ---: |
| Baseline | 0.000735725 | 0.000840135 |
| Hook-first fast path | 0.000621116 | 0.000835321 |

The candidate median was 15.6% lower and its p95 was 0.6% lower in these
separate Node runs. The complete samples, calibrated batch sizes, source state,
environment, and methodology are retained in
[`reactivity-debugger-165.json`](../benchmarks/results/reactivity-debugger-165.json).
This isolated synchronous Node workload does not establish a browser,
asynchronous-scheduler, or application-wide performance improvement.

## Keyed reconciliation comparison

Issue #95 compares the existing generic keyed path at baseline commit `4095745`
with implementation commit `5d19308`. Both consecutive Chromium 149 runs used
the 1,000-row `npm run benchmark:keyed` harness, Vitest 4.1.10, Node 22.22.0,
and the same recorded Apple M4 environment. Vitest ran every case for 500 ms
and retained aggregate distribution statistics in
[`keyed-reconciliation-5d19308.json`](../benchmarks/results/keyed-reconciliation-5d19308.json).

| Scenario | Baseline mean ms/op | Candidate mean ms/op | Throughput ratio |
| --- | ---: | ---: | ---: |
| Reverse all rows | 0.1375 | 0.1331 | 1.03× |
| Move first 100 rows to the end | 0.2286 | 0.1821 | 1.26× |
| Remove and append 100 rows | 0.3617 | 0.3206 | 1.13× |

The block-move and replacement-window runs support the intended optimization
on this environment. Full reverse remains on its pre-existing dedicated path;
its close result is a regression check, not evidence that the new generic path
made reverse faster. The runs are separate and Vitest retains aggregate
statistics rather than individual samples, so these ratios are not generalized
beyond the recorded commits, machine, browser, and workloads.

## Interpretation and limits

The benchmark measures synchronous template creation, renderer reconciliation,
and DOM mutation after template caches have warmed. Roots are detached, so it
does not measure stylesheet calculation, layout, paint, input latency, startup,
bundle transfer, hydration, server rendering, memory retention, or an entire
shop interaction. Browser scheduling, garbage collection, thermal state, and
other system load can still affect samples; distributions and raw values are
retained instead of selecting a single favorable run.

A result supports only its recorded source commit, environment, browser,
versions, and workloads. It must not be generalized into an unqualified claim
that Gluon is faster than Lit, Vue, or Vanilla DOM. The living shop remains the
customer-flow and bundle-composition acceptance surface; a benchmark panel is
kept separate because it is not an honest commerce feature.

The shop flow has its own non-comparative p95 budgets in
`quality/shop-performance-budgets.json`. It measures home readiness, product
navigation, bag opening, and checkout navigation in the production build and
preserves all raw samples. The thresholds are regression ceilings, not user
experience guarantees across networks or devices.
# Bundle-size matrix

`npm run benchmark:bundle` produces a reproducible, production-mode size matrix
for a deliberately small equivalent Gluon, Lit, Vue, and React fixture. It
records raw, gzip, and Brotli bytes together with Node, npm, and lockfile
metadata. See [the fixture contract](../benchmarks/bundle/README.md). This is
scenario evidence only; it does not establish a universal bundle-size ranking.
