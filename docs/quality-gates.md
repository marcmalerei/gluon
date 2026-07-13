# Quality gates

Issue #38 established blocking repository, Playwright engine, Node runtime,
security, accessibility, retention, performance-evidence, and shop-budget jobs.

## Automated matrix

`.github/workflows/quality-gates.yml` runs on pull requests, `main`, and manual
dispatch. It uses the current Node 24-based `actions/checkout@v7` and
`actions/setup-node@v6` action majors:

- the full `npm run check` gate directly after a clean install on Node 22.12
  with Chromium, so source typechecks cannot depend on leftover or prebuilt
  workspace package exports; the check then builds those public exports before
  coverage and integration suites consume them;
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

Package TypeScript configurations that replace the root path map retain every
direct and transitive official source alias required by their typecheck. Their
build configurations resolve those dependencies through built declarations.
This keeps clean-source typechecking independent from build order while keeping
published declaration builds inside each package's `rootDir`.

Set `GLUON_BROWSER` to `chromium`, `firefox`, or `webkit` to reproduce one engine
lane locally. An unknown value fails configuration before tests start.

These Playwright projects are engine-level automation. The amended ADR 0001
defines them as Gluon 1.0's complete browser evidence boundary and explicitly
forbids deriving branded Chrome, Edge, Firefox ESR, Safari, iOS, or Android
support claims from them.

The future branded-product evidence protocol is documented in
[`browser-device-evidence.md`](browser-device-evidence.md). The current
automated accessibility boundary and the future manual protocol are separated
in [`accessibility.md`](accessibility.md), and deterministic retention evidence
is defined in [`memory-retention.md`](memory-retention.md).

## Template composition gate

`npm run check:template-composition` verifies the retained Gluon current-call,
Gluon `compose()`, React JSX, and Vue template checkout/dialog fixtures. It
checks observable parity, committed tokens/lines/indentation/children counts,
TypeScript and vue-tsc validity, Vue SFC parsing, compiler recognition, and
unchanged source-map content. The canonical `implementation-slice-only` record
uses the parent DX evidence format, reports zero human participants, and makes
no completed-run or general readability claim.

`npm run check:dx-scorecard` validates both completed-run evidence and bounded
dependency-slice before/after measurements against the versioned schema. A
slice must retain setup calls, imports, configuration, cleanup, evidence paths,
and explicit no-comparison limitations; it cannot satisfy or imitate the
required 21-result completed run.

## Stateful form-control comparison gate

`npm run check:stateful-control-comparison` validates issue #112's retained
Gluon class, functional Gluon, pinned Vue, and pinned React fixtures. It checks
strict TypeScript, public imports, package versions, disaggregated component and
platform-boundary lines, explicit limitations, and the recorded Gluon
disadvantages. Browser and SSR tests separately prove the common behavior,
plain-HTML boundary, Vue-host consumption, exact comparator-tag hydration,
readable-stream/static output, and cleanup. This partial
evidence has no human pass and makes no general ranking claim.

The stateful-control browser fixture treats React's scheduled `root.render()`
commit as ready only when a ShadowRoot observer sees the exact accepted
quantity and computed total. It checks that observable condition immediately
before and after observer registration and uses the deadline only to fail a
missing commit. The retained synchronous event assertion remains separate, and
a focused 25-update React case exercises the event/render boundary in every
configured Playwright engine.

## Generated API example gate

`npm run docs:api` generates TypeDoc Markdown for every public package entry
point, appends one verified `Example` section to every public function, class,
interface, type-alias, and variable page, and compiles every snippet through a
generated strict TypeScript project. Package and subpath imports are derived
from `package-contract.json`; internal source and deep build paths are rejected.

All 575 current symbol pages require a reviewed entry in
`docs-site/api-examples.json`. Each entry supplies symbol-specific purpose copy
and either an inline scenario or a maintained package recipe that uses the
documented symbol. The scenarios cover concrete inputs and observable results,
plus ownership, failure, and cleanup behavior where applicable; a generic type
alias, import demonstration, or runtime-owner wrapper is not accepted.

The complete catalog compiles in one strict generated TypeScript corpus.
`npm run check:docs` independently derives the symbol page set, requires the
reviewed-example count to equal the page count, validates rendered code on every
page, rejects generic purpose copy and the former compiler-only `declare const
args`, `type Example =`, and `void value` patterns, and retains focused gates for
memory history, Router options, Store definition, and Gluon Element examples.

## Optional UI package gate

`npm run check:ui-contract` validates the four optional package manifests,
their stable inventories and evidence paths, and a production Core-only bundle
that must contain none of the UI markers. `npm run typecheck:ui-api` consumes
the generated declarations through the four public package names. The browser
matrix runs UI keyboard, focus, axe, one-call Document/nested-ShadowRoot
ownership, reference counting, identity-preserving theme changes, scoped SSR
hydration diagnostics, cleanup, and screenshot-regression suites in Chromium,
Firefox, and WebKit. Node SSR tests retain the named UI selection and GLUON
GOODS carrier order. The root browser coverage gate includes every source file
owned by the four UI packages. The compiled interactive example is published at
`/1.0.4/examples/ui.html` with the other versioned documentation examples.

The same UI gate requires extension metadata for all 15 stable entries, the
documented matrix in `docs/ui-extensibility.md`, and the branded-purchase,
danger-action, and custom-icon outcomes in canonical DX task T2. The comparison
rule in `benchmarks/dx/specification-v1.json` applies that unchanged outcome to
Gluon, Vue, and React. #107 still owns comparator implementations, completed-run
evidence conforming to the canonical schema, and the final comparison.

The production scan also proves that GLUON GOODS contains only the selected
Button, Icon, Input, Label, FormField, `PurchaseAction`, and
`CheckoutExperience` markers. It rejects unused Card/AppShell and deprecated
aggregate-style markers, while `check:shop-boundaries` rejects private package
paths, `<style>` fallbacks, and undocumented `.gluon-*` class coupling.

Each optional UI package replaces the root TypeScript path map with its bounded
source dependency map. That map includes both Core and Reactivity because the
Core source program imports the public Reactivity entry point. The clean
repository gate runs before any workspace build so an omitted transitive source
alias fails in the same state used by the release candidate job.

## Report-only Vue analyzer gate

`npm run test:vue-analyzer` builds the Node package and verifies deterministic
human/JSON output, schema validation, supported/unsupported/malformed input,
the production Vue host, exact CLI exit codes, invalid UTF-8, fixed file limits,
symlink escapes, and adversarial no-execution sentinels. The property/fuzz gate
also varies retained declared names and requires byte-stable JSON formatting.

`npm run check:vue-analyzer-fixtures` regenerates all four retained report pairs
in memory and fails when their JSON, human output, or exit-code manifest differs
from the committed evidence. `npm run check:packages`, public type fixtures,
TypeDoc, package archives, release digests, and per-package SBOMs cover the root,
`./schema`, and `gluon-vue-analyze` public boundaries.
`npm run check:vue-analyzer-clean-install` additionally packs the package,
installs it in an empty consumer, runs the installed bin, validates its JSON,
and imports both public entries. The analyzer has no
browser-engine or GLUON GOODS route because it is Node developer tooling; the
real Vue host and production configurator sources are its application evidence.

`npm run check:vue-codemod-decision` validates the issue #92 no-go evidence:
four versioned reports must still contain 17 files, 52 inventory records, and
26 findings; every one of the 14 candidate classes must link retained input,
an exact analyzer record, no-write expected output, and a semantic test or
counterexample. The gate rejects any authorized generated, modified, or deleted
file. It measures fixture syntax only and proves behavioral equivalence for no
candidate class.

## Component-generation gate

`npm run check:create-gluon-fixtures` retains the existing 20-project feature
matrix and a separate five-kind add-component matrix. Each component project is
a clean Router + Store + testing + UI + SSR starter using packed workspace
artifacts. The gate generates exactly one Atom, Molecule, Organism, stateful
Custom Element, or headless wrapper, then installs, typechecks, runs
`gluon-template-check`, executes the generated Chromium browser test, builds
client and SSR entries, and runs `npm pack --dry-run --json`.

`npm run test:create-gluon` separately covers deterministic planning, dry-run
non-mutation, public imports, dependency direction, barrel sorting, malformed
manifests, name/path/tag validation, traversal and absolute paths, symbolic-link
escapes, collision refusal, two-part overwrite confirmation, compiler/Vite HMR
transforms, and language-service declaration discovery. The filesystem writer
stages same-directory temporary files and restores already-applied targets if a
commit step fails.

Invalid-input cases start one operation only after its rejection assertion is
installed. The reserved `annotation-xml` regression verifies the exact
`INVALID_CUSTOM_ELEMENT_NAME` diagnostic and no-write result separately;
`test:create-gluon:coverage` must finish without an unhandled-rejection record
after all assertions pass.

The optional `--components-only` validator argument is a development shortcut
for the five generated projects. The blocking repository command uses no
shortcut and therefore runs both matrices.

Every one of the 20 application selections is installed from packed workspace
artifacts, typechecked, template-checked, tested, and built. UI selections run
the generated application test, which checks the accessible reactive Button,
computed 44px target and app-token color, exact Button/application adoption,
and cleanup. The UI + SSR selection additionally checks the shared UI, exact
Button, and application carrier order, retained DOM, empty hydration mismatches,
`recovered: false`, single adoption, post-hydration interaction, and teardown.

`tests/vite-hmr.spec.ts` separately edits the generated starter's app-token
sheet and exported Button consumer after a state change. The gate requires the
same reactive count, native Button node, and sheet object with updated rendered
copy and computed color.

## Developer-experience benchmark contract gate

`npm run check:dx-scorecard` validates the issue #107 comparison contract: the
seven identical observable tasks, three selected framework lanes, 19 raw
measurement fields, official Vue and React selection sources, strict completed-
run schema, mandatory 21 framework-task records, and at least one human
usability pass. The command rejects an opaque combined score and any orientation
record that implies completed results.

The command is part of `npm run check`, so the repository quality job runs it on
every pull request and `main` push. It validates exact pins/lockfiles, the 21
fixture mappings, the automated-only schema and committed raw run, and still
reports zero completed human-plus-automation runs. The DX Scorecard workflow
executes the full clean-install/HMR/SSR/hydration/diagnostic scorecard every
Monday and on manual dispatch, retaining raw artifacts for 90 days. Human
evidence remains required before issue #107 can close. The full contract and
current boundary are documented in
[`dx-benchmark.md`](dx-benchmark.md).

The comparator projects have independent pinned TypeScript graphs and are
excluded from the root TypeScript program. Their own clean-install typechecks in
`npm run benchmark:dx` are the authoritative compiler evidence; the root program
does not resolve their private `node_modules` trees.

## Bundle budgets

`quality-budgets.json` is the reviewed budget source. `npm run check:budgets`
builds GLUON GOODS and fails with the exact metric, actual bytes, limit, and
overage when its HTML, initial JavaScript entry plus static modulepreload graph,
per-file level-9 gzip total, image bytes, or image count exceeds the budget.
Lazy hydration chunks are reported by the build but do not enter the
client-only initial graph. AVIF, GIF, JPEG, PNG, SVG, and WebP output all count as images. Unknown,
missing, negative, or non-numeric budget entries fail before comparison.
`npm run check` validates the same budget after the repository build.

The issue #108 production owner baseline measures 164,012 raw entry bytes and
47,686 level-9 gzip bytes. Issue #110 adds the selected Atom Button/Icon styles
and app-local Molecule/Organism purchase path, measuring 171,264 raw and 50,069
gzip bytes. With issue #114's real Button/Input/FormField surfaces, app-local
Molecule/Organism composition, and brand-token owner, the production entry
measures 181,847 raw and 52,535 gzip bytes. That is 3,344 raw and 999 gzip bytes
above the combined #112/#115 entry, and 23,695 raw and 6,852 gzip bytes above
the issue #88 baseline of 158,152 raw and 45,683 gzip bytes. The reviewed regression ceilings
are 182,000 raw bytes and 54,000 gzip bytes; HTML, image-byte, and image-count
ceilings remain unchanged. These are composition measurements, not runtime-
speed or framework-size claims. Vue is built only in the documentation host.

Issue #115 replaces aggregate component retention with usage-driven exact
component sheets. `check:ui-contract` additionally
builds a Button-only entry and dynamic Card/AppShell chunks, rejects unrelated
component markers, and validates the retained raw/gzip/module/sheet evidence in
`benchmarks/ui-component-styles-2026-07-12.json`. Vue is built only in the
separate documentation host.

The component-style evidence records level-9 gzip bytes from Node.js 22.22.0.
The blocking cross-Node check requires a positive recorded gzip value but omits
that value from equality because supported Node/zlib versions emit different
compressed byte counts for identical stylesheet input; raw bytes, modules,
sheet counts, and selectors remain exact equality checks.

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

The current ceilings allow 153 raw bytes and 1,465 gzip bytes above the
measured initial graph while preventing unreviewed large regressions. Changing a
ceiling requires an evidence-backed documentation update in the same pull
request.

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

Gluon 1.0 records the exact Playwright-managed Chromium, Firefox, and WebKit
binaries and the successful Quality Gates run. Branded-browser/device and
assistive-technology manual evidence is intentionally skipped, is not a release
gate, and produces no product, operating-system, device, or assistive-technology
support claim. A future claim requires a new accepted contract and the retained
manual protocols.
