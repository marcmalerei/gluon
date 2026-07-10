# Rendering performance evidence

Gluon's comparative rendering benchmark measures the current repository source
against pinned Lit, Vue, and optimized Vanilla DOM implementations. It exists to
produce inspectable evidence, not to guarantee that one renderer wins.

The runtime's measured hot paths include a direct string-binding update,
precomputed binding priorities, and a keyed-list fast path when key order is
unchanged. These shortcuts retain the external-DOM recovery and keyed-identity
contracts covered by the browser suite.

The retained baseline is stored in
[`benchmarks/results/`](../benchmarks/results/). Its Markdown file summarizes
medians and p95 values; the paired JSON file preserves every sample, invariant
snapshot, calibrated batch size, source commit, working-tree state, package and
browser versions, Node and npm versions, operating system, CPU, and memory.

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

## Legacy Tiny-Lit benchmark

The local Downloads folder contains a separate historical test at
`~/Downloads/tiny-lit-main/public/benchmark.html`. It loads the old
`gluon@0.1.0` build from that project and `lit-html@3` from `esm.sh`; it is not a
benchmark of the current `@gluonjs/core@0.0.0` source. Its six scenarios use a
20 ms warm-up, a 200 ms time window, sequential renderer runs, and averaged
results without retained raw samples.

I reran that page from its production preview in the current Chromium session.
At 10 runs and 500 list items, Gluon won 4 of 6 scenarios; the largest observed
advantage was 1.89× for four-attribute updates. At 3 runs and 5,000 list items,
Gluon won 3 of 6; the largest observed advantage was 2.73× for the same
attribute scenario. Lit won the simple update and 500-item initial-render
scenarios in the 500-item run. These reruns did not reproduce a 6× result.

Those values are retained here as a traceable historical comparison, not as the
current release baseline. The current benchmark command above is the
authoritative evidence because it runs the repository source, includes Vue and
Vanilla DOM controls, validates identical output, records every sample, and
captures exact source and environment metadata.
