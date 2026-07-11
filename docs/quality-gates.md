# Quality gates

Issue #38 is delivered in vertical slices. This slice makes the existing
repository checks, Playwright engine lanes, Node runtime lanes, and shop bundle
budgets blocking GitHub Actions jobs.

## Automated matrix

`.github/workflows/quality-gates.yml` runs on pull requests, `main`, and manual
dispatch. It uses the current Node 24-based `actions/checkout@v7` and
`actions/setup-node@v6` action majors:

- a clean production build followed by the full `npm run check` gate on Node
  22.12 with Chromium, so workspace package exports exist before typechecking;
- the browser, Router, test-utils, Devtools, Playground, and GLUON GOODS suites
  with Playwright Chromium, Firefox, and WebKit;
- production builds plus SSR tests on Node 22.12 and Node 24;
- the production GLUON GOODS bundle budget;
- axe-core WCAG A/AA checks for the maintained home-to-checkout journey;
- deterministic Router/compiler/SSR property and fuzz checks plus repeated
  customer-flow resource-retention checks;
- validation of the machine-readable HTML/URL/style/SSR-state/CSP/Trusted-Types
  threat model;
- a production Chromium GLUON GOODS flow budget and a ten-sample comparative
  Chromium/Firefox/WebKit rendering run retained for 30 days as JSON and
  Markdown workflow artifacts.

Set `GLUON_BROWSER` to `chromium`, `firefox`, or `webkit` to reproduce one engine
lane locally. An unknown value fails configuration before tests start.

These Playwright projects are engine-level automation. They do not replace the
branded Chrome, Edge, Firefox ESR, Safari, iOS, or Android release evidence
required by the accepted support contract in ADR 0001.

The exact release-candidate procedure is documented in
[`browser-device-evidence.md`](browser-device-evidence.md). Automated and manual
accessibility responsibilities are separated in
[`accessibility.md`](accessibility.md), and deterministic retention evidence is
defined in [`memory-retention.md`](memory-retention.md).

## Bundle budgets

`quality-budgets.json` is the reviewed budget source. `npm run check:budgets`
builds GLUON GOODS and fails with the exact metric, actual bytes, limit, and
overage when its HTML, JavaScript, gzip, image bytes, or image count exceeds the
budget. AVIF, GIF, JPEG, PNG, SVG, and WebP output all count as images. Unknown,
missing, negative, or non-numeric budget entries fail before comparison.
`npm run check` validates the same budget after the repository build.

On a clean checkout, build Core, Compiler, and the Gluon Vite plugin before
running `npm run check:budgets`. The blocking budget job performs those steps
explicitly before it builds GLUON GOODS.

The Playground browser test allows up to 15 seconds for its initial diagnostic
catalogue because the first engine run dynamically loads and optimizes the
language-server dependency graph. Subsequent interactions retain their
five-second limits.

Browser assertions that cross a reactive transition poll for the resulting DOM
state with a bounded timeout. They do not assume that the render and a 140-ms
transition always finish within one fixed wall-clock delay on every engine.

The current ceilings allow limited implementation movement above the measured
137,169-byte raw / 40,088-byte gzip shop entry while preventing unreviewed large
regressions. Changing a ceiling requires an evidence-backed documentation update
in the same pull request.

## Customer-flow performance and retained evidence

`quality/shop-performance-budgets.json` is the reviewed p95 source for the
production home-ready, product-navigation, bag-open, and checkout-navigation
measurements. `npm run check:shop-performance` performs two warm-ups and ten
measured desktop Chromium flows, preserves every raw duration, and fails with
the exact metric, actual p95, limit, and overage. The command builds Core,
Compiler, and the Gluon Vite plugin first, so it works from a clean checkout.

The `performance-evidence` job also runs the Gluon/Lit/Vue/Vanilla comparison
with four warm-ups and ten samples in Chromium, Firefox, and WebKit. It uploads
both benchmarks' JSON and Markdown output as a commit-named artifact retained
for 30 days. These CI samples are regression and review evidence; the larger
committed baseline remains the evidence used for comparative prose.

## Release-cut evidence boundary

Branded-browser/device and assistive-technology results remain release-cut
evidence rather than claims for the private `0.0.0` line. Issue #41 freezes and
executes that product/version manifest before Gluon 1.0 publication.
