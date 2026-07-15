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

Official production Vite builds also recognize a conservative component-level
case: one fixed `GluonElement` template with one declared primitive property in
a text Part and, optionally, one private readonly event handler. Property-only
updates reuse the resolved Part and a smaller scheduler job. Lifecycle hooks,
reactive or explicit concurrent updates, hydration, root disturbance,
non-primitive values, and every unproven template shape use the full effect and
renderer path. This optimization does not change standalone `html`/`render`
behavior and is absent from development builds.

The retained baseline is stored in
[`benchmarks/results/`](../benchmarks/results/). Its Markdown file summarizes
medians and p95 values; the paired JSON file preserves every sample, invariant
snapshot, calibrated batch size, source commit, working-tree state, package and
browser versions, Node and npm versions, operating system, CPU, and memory.

Every pull request and `main` run additionally retains ten-sample template and
component Chromium/Firefox/WebKit comparisons plus the production GLUON GOODS
customer-flow budget output for 30 days in the
`quality-evidence-<commit>` workflow artifact. Those shorter CI runs detect
regressions but do not replace the larger committed matrices used by the
comparative text below.

## Run the benchmark

Install the three Playwright-managed browser engines once, then run the
production comparison:

```bash
npx playwright install chromium firefox webkit
npm run benchmark:rendering
npm run benchmark:components
```

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

For an interactive demonstration in a browser:

```bash
npm run dev:benchmark
npm run dev:benchmark:components
```

The template development server listens on `0.0.0.0:4174`; the component page
uses port 4175. Interactive results are useful for exploration but are not
retained evidence; use the production CLI commands for reviewable results.

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
takes at least 8 ms, and framework order rotates for warm-ups and measurements.
Reported values are milliseconds per 50 components.

## Production-mode correction

Comparative Vite configs before issue #174 aliased Gluon directly to repository
source without defining `__GLUON_DEV__`. Those builds were minified, but Gluon
selected its development diagnostic fallback while Lit and Vue selected their
production paths. Earlier retained comparison files remain inspectable
historical diagnostics and same-mode Gluon baseline/candidate comparisons, but
they do not satisfy the current production comparison contract and must not
support a Lit/Vue superiority claim. The clean production-mode matrices added
with issues #172 and #174 supersede that framework-comparison interpretation.

## Current committed matrix

The current rendering matrix measures clean source commit `4c7bdac`; the
isolated-scenario component matrix measures clean source commit `47b1a0a`.
Both use 40 samples, eight warm-up rounds, and Playwright-managed Chromium 149,
Firefox 151, and WebKit 26.5 on the recorded Apple M4 environment. The paired
JSON files retain every sample and invariant snapshot; the Markdown files
expose every median and p95 value.

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

The complete
[`component-production-47b1a0a.md`](../benchmarks/results/component-production-47b1a0a.md)
matrix reports milliseconds per 50 component boundaries. Against Lit, Gluon
wins lifecycle and keyed-list medians in Chromium and WebKit plus lifecycle in
Firefox. Lit wins every isolated public-property and internal-state median plus
Firefox keyed list. Lit median divided by Gluon median is
1.31×/0.66×/0.82×/1.59× for Chromium lifecycle/property/state/list,
1.38×/0.75×/0.65×/0.88× for Firefox, and
1.38×/0.73×/0.92×/1.86× for WebKit.

The remaining absolute Lit advantage per 50 components is 0.0080 ms for
Chromium property and 0.0113 ms for Chromium state; 0.0500 ms and 0.2000 ms in
Firefox; and 0.0050 ms and 0.0062 ms in WebKit. Gluon's state path now retains
one native guarded event dispatcher while render callbacks change, but this
matrix still records Lit as the faster simple-update implementation.

Against Vue, Gluon wins Chromium lifecycle/property/list while Vue wins state;
wins Firefox list, ties lifecycle, and loses property/state; and wins WebKit
property/state/list while lifecycle is equal. Across those 12 cells that is
seven Gluon wins, two equal medians, and three Vue wins. This supports the
recorded lifecycle and keyed-list results without turning the matrix into a
universal framework ranking.

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
