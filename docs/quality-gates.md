# Quality gates

Issue #38 is delivered in vertical slices. This slice makes the existing
repository checks, Playwright engine lanes, Node runtime lanes, and shop bundle
budgets blocking GitHub Actions jobs.

## Automated matrix

`.github/workflows/quality-gates.yml` runs on pull requests, `main`, and manual
dispatch:

- a clean production build followed by the full `npm run check` gate on Node
  22.12 with Chromium, so workspace package exports exist before typechecking;
- the browser, Router, test-utils, Devtools, Playground, and GLUON GOODS suites
  with Playwright Chromium, Firefox, and WebKit;
- production builds plus SSR tests on Node 22.12 and Node 24;
- the production GLUON GOODS bundle budget.

Set `GLUON_BROWSER` to `chromium`, `firefox`, or `webkit` to reproduce one engine
lane locally. An unknown value fails configuration before tests start.

These Playwright projects are engine-level automation. They do not replace the
branded Chrome, Edge, Firefox ESR, Safari, iOS, or Android release evidence
required by the accepted support contract in ADR 0001.

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

The current ceilings allow limited implementation movement above the measured
137,169-byte raw / 40,088-byte gzip shop entry while preventing unreviewed large
regressions. Changing a ceiling requires an evidence-backed documentation update
in the same pull request.

## Remaining issue #38 work

This slice does not claim completion of branded-browser/device evidence,
automated accessibility and manual keyboard/assistive-technology protocols,
the complete HTML/URL/style/SSR-state/CSP/Trusted-Types threat model, property
and fuzz suites, broad memory-retention evidence, customer-flow performance
budgets, or retained CI benchmark artifacts.
