# Incremental runtime allocation optimization (#487 / #488)

This comparison starts **after** the value-aware spread patch, at
`1156f222e2c2bdbd89eb4558ce52c9295acc15ee`. The candidate is
`4f1cbd67f21eea5d2269154fc08ba227841231ed`, containing:

- `64d943bc6aa69a85ded66d464f4fbe1a8b565be1`: lazy spread bookkeeping,
  no additional key array for stable key order, direct equality for stable
  scalar/identity values, and replacement rather than copying of private sets;
- `4f1cbd67f21eea5d2269154fc08ba227841231ed`: lazy style-preflight map and
  shared empty dependency list, with early exit for primitive leaves.

No public signatures or input conventions change. Spread inputs still use
`Object.entries` to preserve getter evaluation and enumeration semantics. Mutable
aggregate values are still snapshotted; no identity-only cache is introduced for
style, class, data, or ARIA maps. The complete style preflight remains before DOM
updates, including duplicate stylesheet identity validation. Compiler binding
specialization and removal of the style preflight are outside this follow-up.

## Method

Apple M4, macOS 26.3.1 (a), Darwin 25.3.0, Node 24.18.0, npm 11.16.0,
Vite 8.2.1, Playwright 1.61.1; Chromium 149.0.7827.55, Firefox 151.0,
WebKit 26.5; Lit/lit-html 3.3.3. All measured revisions had a clean worktree.
Benchmark suites ran sequentially, without concurrent local test suites.

The first spread/allocation comparison uses 25 measured rounds and six warmups.
An independent baseline/candidate repeat uses 15 spread rounds and 25 allocation
rounds. The intermediate spread-only commit was also measured separately.
Frameworks alternate inside each comparative run; baseline and candidate builds
run separately. These are host-specific measurements, not confidence intervals
or a guarantee for every application.

`initial` in the existing fixture means a new DOM root after warmups. It does
**not** measure a cold browser, first module load, or uncached template parsing.
The 80-card fixture compares Gluon spreads with Lit explicit bindings; it is not
an equal-binding primitive-renderer comparison. The canonical rendering matrix
and component benchmark provide separate comparisons with their retained
topologies and output checks.

## Incremental results

Lower is faster. Values are Gluon medians in milliseconds per operation.

| Surface | Baseline, first run | Candidate, first run | Change | Independent repeat change |
| --- | ---: | ---: | ---: | ---: |
| 80-card initial DOM commit | 0.291398 | 0.279570 | -4.1% | -9.3% |
| 80-card stable update commit | 0.061240 | 0.058264 | -4.9% | -3.8% |
| 80-card initial end-to-end | 0.296694 | 0.289344 | -2.5% | -6.2% |
| 80-card stable update end-to-end | 0.064750 | 0.061750 | -4.6% | -3.1% |
| 80-card cleanup | 0.076646 | 0.076117 | -0.7% | +0.9% |
| Allocation fixture: text update | 0.0000880 | 0.0000715 | -18.8% | -16.2% |
| Allocation fixture: fully changing spread | 0.001740 | 0.001600 | -8.0% | -3.6% |
| Allocation fixture: unkeyed array | 0.008625 | 0.008750 | +1.4% | -3.5% |

The cleanup and unkeyed-array results do not establish a consistent gain.
The intermediate spread-only commit measured 0.059375 ms for stable card commits
and 0.001600 ms for fully changing spreads; the style-preflight change accounts
for the broader simple-text improvement.

## Canonical rendering and Lit

The three-engine comparison uses 25 samples and six warmups. Simple text-update
medians are shown below; this is the same canonical template topology for each
renderer, separate from the spread fixture.

| Engine | Gluon baseline | Gluon candidate | Lit in candidate run | Gluon change |
| --- | ---: | ---: | ---: | ---: |
| Chromium | 0.00007531 | 0.00006049 | 0.00004897 | -19.7% |
| Firefox | 0.00017000 | 0.00014000 | 0.00013000 | -17.6% |
| WebKit | 0.00010000 | 0.00008125 | 0.00008125 | -18.8% |

For 1,000 keyed rows, Chromium creation improved 3.9%, while update and reverse
medians were 0.8% higher. Firefox creation/update/reverse improved 5.9%/7.7%/5.6%.
WebKit initially showed creation +8.3%, update -7.7%, and reverse unchanged.
A targeted 40-round WebKit repeat, with eight warmups and reversed build order,
produced identical baseline/candidate medians for creation (0.500 ms), update
(0.100 ms), and reverse (0.225 ms); text still improved 23.5%. Thus the initial
WebKit creation slowdown was not reproduced at the median. Tail samples remain
variable: that repeat's creation p95 was 0.833 ms baseline versus 1.583 ms
candidate. No tail-latency improvement is claimed.

The Chromium 50-component comparison measured lifecycle 0.9667 → 1.0000 ms,
property 0.011984 → 0.012342 ms, state 0.048010 → 0.048500 ms, and list
0.246078 → 0.242241 ms. Lit/Gluon lifecycle/property ratios remained approximately
1.36×/1.07× in both runs as both frameworks moved together. These results do
not demonstrate a general component-level speedup.

## Size, memory, and limits

The production counter fixture changed from 43,866 to 43,888 raw bytes,
13,408 to 13,421 gzip bytes (**+13 bytes, +0.10%**), and 11,971 to 12,008
Brotli bytes. Other framework fixture sizes were unchanged. This is the counter
entry size, not the entire package's size.

The retained-100,000-TemplateResult diagnostic measured 5,872,276 bytes for the
baseline and 5,875,564 bytes for the first candidate run (5,875,748 on repeat).
This run-level difference is not a per-object or detached-DOM memory claim.
Behavioral cleanup tests and the diagnostic are complementary evidence.

The follow-up has repeatable gains in the targeted update paths with essentially
unchanged measured cleanup. It does not eliminate the original value-cache
patch's initial-render, cleanup, and bundle-size tradeoffs relative to the older
`ae56ac9` implementation. It does not establish overall Gluon superiority to Lit.

## Verification

- Chromium: 64 files / 586 tests passed with coverage; statements 95.43%,
  branches 90.22%, functions 96.70%, lines 97.83%.
- Firefox: 64 files / 586 tests passed.
- macOS WebKit 26.5: 582 passed, four failures in scoped-registry/HMR tests.
  The same four failures were reproduced on unmodified baseline runtime
  `1156f22` by running `tests/scoped-element-registries.spec.ts` and
  `tests/vite-hmr.spec.ts` (four failed, eight passed). They concern native
  scoped element upgrades and the scoped HMR element's missing shadow root;
  none is introduced by this runtime diff. They were not skipped or relaxed.
- SSR: 45 tests passed after building the required workspace packages.
- Core implementation and public API typechecks passed.
- Core, UI packages, Router, Store, i18n, SSR, Compiler, Vite, and shop builds
  passed during the verification/benchmark runs.
- `npm run check:budgets` passed: shop entry 235,089 raw / 63,518 gzip bytes,
  HTML 673 bytes, images 155,126 bytes across five assets.

The browser suite includes the existing hydration, URL/Trusted Types, adopted
stylesheet ownership, DOM identity, shop-flow, and retained-listener/ref cleanup
contracts. New tests protect getter-before-setter ordering with deleted input
keys, discovery of styles in a mutated child array, and stylesheet collision
rejection before DOM changes. All benchmark output invariants passed.

The complete integrated repository/release CI remains required on the main
task's final combined commit before release; this follow-up does not claim that
the complete local WebKit suite is green or waive its baseline failures.

## Retained evidence

All raw samples, methodology, source hashes, and readable summaries are retained
in [`issue-487-followup/`](issue-487-followup/):

- `followup-{baseline,candidate}-spread.{json,md}` and `-spread-confirm.{json,md}`
- `followup-spread-only.{json,md}` and `followup-spread-only-allocations.{json,md}`
- `followup-{baseline,candidate}-allocations.{json,md}` and `-allocations-confirm.{json,md}`
- `followup-{baseline,candidate}-rendering.{json,md}` and `-rendering-matrix.{json,md}`
- `followup-{baseline,candidate}-webkit-confirm.{json,md}`
- `followup-{baseline,candidate}-components.{json,md}`
- `followup-{baseline,candidate}-bundle.json`
