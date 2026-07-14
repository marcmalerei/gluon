# Rendering performance evidence

Gluon's comparative rendering benchmark measures the current repository source
against pinned Lit, Vue, and optimized Vanilla DOM implementations. It exists to
produce inspectable evidence, not to guarantee that one renderer wins.

The runtime's measured hot paths include direct string-binding updates,
direct insertion when a new part contains one node, fragment batching when it
contains multiple nodes, one element/comment traversal for every cloned
template's bindings, precomputed binding priorities, parallel key/value storage
for keyed repeats, detached keyed-child anchors, and keyed-list fast paths for
unchanged and reversed order. Generic keyed changes trim stable heads and tails,
retain their longest unchanged contiguous run, and move only the surrounding
groups. These shortcuts retain the external-DOM recovery and keyed-identity
contracts covered by the browser suite.

The retained baseline is stored in
[`benchmarks/results/`](../benchmarks/results/). Its Markdown file summarizes
medians and p95 values; the paired JSON file preserves every sample, invariant
snapshot, calibrated batch size, source commit, working-tree state, package and
browser versions, Node and npm versions, operating system, CPU, and memory.

Every pull request and `main` run additionally retains a ten-sample
Chromium/Firefox/WebKit comparison plus the production GLUON GOODS customer-flow
budget output for 30 days in the `quality-evidence-<commit>` workflow artifact.
Those shorter CI runs detect regressions but do not replace the larger committed
matrix used by the comparative text below.

## Run the benchmark

Install the three Playwright-managed browser engines once, then run the
production comparison:

```bash
npx playwright install chromium firefox webkit
npm run benchmark:rendering
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
```

The command builds the benchmark with Vite in production mode, serves that
exact output locally, launches each browser headlessly, rejects console errors
or warnings, applies a 180-second per-browser evaluation timeout by default,
and writes both JSON and Markdown results. The JSON path supplied with
`--output` must end in `.json`; the Markdown summary uses the same basename.

For an interactive demonstration in a browser:

```bash
npm run dev:benchmark
```

The development server listens on `0.0.0.0:4174` and prints local and LAN URLs.
Interactive results are useful for exploration but are not retained evidence;
use the production CLI command for a reviewable result.

## Workloads

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

## Current committed matrix

The retained matrix for commit `e8c4e9a` uses 20 measured samples, eight warm-up
rounds, and the Playwright-managed Chromium 149, Firefox 151, and WebKit 26.5
engines on the recorded Apple M4 environment. The paired
[`rendering-comparison-e8c4e9a.md`](../benchmarks/results/rendering-comparison-e8c4e9a.md)
file contains the medians and p95 values; its JSON file retains every sample.

Gluon is faster than Lit for keyed `update` and `reverse` in all three engines:
1.16×/1.74× in Chromium, 1.23×/1.94× in Firefox, and 1.14×/2.05× in WebKit.
Text is at parity in Firefox and WebKit; Lit is faster in Chromium. Fresh
1,000-row `create` remains faster in Lit in this matrix, so the evidence does
not support a universal “Gluon is faster” claim or the historical 6× claim.

The single-node insertion fast path removes one renderer-created
`DocumentFragment` and its `append()` call for each newly committed text node.
Compared with the previous retained `4c0f0b9` matrix, the `create` median is
lower by 5% in Chromium (1.2083 to 1.1472 ms/op), 6% in Firefox (2.0417 to
1.9167 ms/op), and 15% in WebKit (1.7083 to 1.4583 ms/op). These are separate
benchmark runs, so the distributions remain the evidence; the percentages are
not a browser-independent speedup claim.

Issue #81 also retained a controlled Chromium confirmation with 40 interleaved
samples and 12 warm-up rounds. Both runs used the production build, Chromium
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
cover the production comparison at a 100 µs sampling interval, four warm-up
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
active-document prototype on the same Apple M4 environment. Both production
runs used 20 measured samples, eight warm-up rounds, Chromium 149, Firefox 151,
and WebKit 26.5. The timed `create` scenario creates 1,000 keyed rows; it is the
scenario that enters the template-instantiation path.

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

Issue #163 adds a production Chromium allocation benchmark for four focused
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

Run the focused benchmark with:

```bash
npm run benchmark:allocations
```

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
