# Developer-experience benchmark

Issue [#107](https://github.com/marcmalerei/gluon/issues/107) requires a
task-level, reproducible comparison of Gluon, Vue, and React. The versioned
contract is
[`benchmarks/dx/specification-v1.json`](../benchmarks/dx/specification-v1.json),
and completed evidence must conform to
[`benchmarks/dx/schema/run-v1.schema.json`](../benchmarks/dx/schema/run-v1.schema.json).

This repository does not currently contain a completed human-plus-automation
DX benchmark run. A schema-valid automated-only run retains all 21 framework-
task records while its `humanPasses` array is deliberately empty. One retained
record selects the comparator lanes and captures the environment and package
versions observed on 12 July 2026. A second, explicitly partial record
captures issue #111's nested checkout/dialog syntax measurements for the
T3-local-layers implementation slice. A third partial record captures issue
#112's retained stateful form-control comparison for T4. Those partial records
support no win, tie, loss, usability, readability, or general DX-superiority
claim. The automated report classifies only dimensions proved by the complete
automated run.

The specification also retains bounded Gluon-only before/after measurements for
completed dependency slices. These records use `$defs.sliceMeasurement` from
the run schema, name their affected benchmark tasks, retain setup/import/
configuration/cleanup counts and concrete values, and state their remaining
acceptance boundary. They are not evidence files or substitutes for the 21
framework-task results required by a completed run.

## Comparator lanes

- Gluon uses the maintained strict-TypeScript `create-gluon` lane from the run
  commit.
- Vue uses the official `create-vue` lane. The selection follows Vue's
  [Quick Start](https://vuejs.org/guide/quick-start.html), while component work
  follows the official
  [Components Basics](https://vuejs.org/guide/essentials/component-basics.html)
  Single-File Component direction.
- React uses the React Router framework lane. React's official
  [application-creation guide](https://react.dev/learn/creating-a-react-app)
  recommends starting new applications with a framework and lists React Router
  as a full-stack framework that supports SPA, SSR, and SSG operation. That lane
  matches the retained routed SPA plus server-rendering task without adding an
  unmeasured, author-selected routing and SSR stack. Daily component work follows
  React's official [Learn](https://react.dev/learn) function-component and Hooks
  direction.

Exact selected versions and the command used to query them are retained in
[`comparator-selection-2026-07-12.json`](../benchmarks/dx/evidence/comparator-selection-2026-07-12.json).
A completed run must pin its own versions and lockfiles; it must not inherit
"latest" from this orientation record.

The automated run pins `create-vue 3.22.4`, Vue `3.5.39`, React Router `8.2.0`,
and React `19.2.7`. The generated Vue scaffold's `~6.0.0` TypeScript range did
not resolve during the recorded run, so the production-valid fixture pins
compatible TypeScript `5.9.3`. The React Router 8.2 CLI copied template package
pins at 8.0.0; the retained fixture aligns every React Router package to 8.2.0
and records that authored configuration change.

## Identical task outcomes

Every framework implements the same seven outcomes:

1. scaffold a strict TypeScript application with routing, persisted state,
   browser testing, and a production build;
2. add a themed accessible input, branded purchase button, danger action, and
   custom decorative/informative icon through public contracts, retaining the
   same native attribute/ref/event and invalid-fixture outcomes;
3. create and extend an app-local primitive, repeated composition, and page
   layout in the same checkout flow;
4. build the same typed, validated, cleanup-owning quantity form control;
5. navigate, persist, test the customer flow, and retain state through a
   compatible hot update;
6. server-render and hydrate the same product route;
7. consume the stateful control from plain HTML without a framework wrapper
   where the selected platform lane permits it, or retain the framework's
   limitation as the result.

Issue #113 adds a bounded, identical add-component procedure inside task 3.
Starting from each lane's recorded clean scaffold, the author must add a named
`PurchaseAction` that renders a native `type=button` control named `Purchase`,
owns one application stylesheet, exposes one click callback, is reachable from
the local component boundary, and has a strict browser test for name, native
type, interaction, and cleanup.

The Gluon procedure records the scaffold command and
`create-gluon add-component PurchaseAction --kind atom --root shop --yes`; its
generated source, test, package update, Vitest config, and barrel update are
`generatedFiles`, not manual edits. The selected official Vue component guide
describes authoring and importing a `.vue` component, while the selected React
guide describes function components; neither selected source documents an
official add-component generator. Their future task rows must retain each
created component/style/test and every parent/export or test-configuration edit
explicitly rather than inventing a command.

The exact lane commands, required manual-edit categories, observable outcomes,
and evidence fields live in `addComponentTask` in the canonical specification.
This is a task contract only: no Vue or React project was executed for issue
#113, there is no human pass, and it supports no win/tie/loss or general DX
claim. Orientation uses the [Vue component guide](https://vuejs.org/guide/essentials/component-basics.html),
the [React component quick start](https://react.dev/learn), and the
[React Router framework installation](https://reactrouter.com/start/framework/installation).

The JSON specification is authoritative for the detailed observable outcomes.
Syntax and architecture remain framework-specific because those differences are
part of the measurement.

## Evidence contract

A completed run contains exactly 21 framework-task results and records:

- the OS, architecture, Node, package manager, Playwright engine versions,
  source commit, start time, and finish time;
- exact framework, scaffold, production, and development package versions plus
  the fixture lockfiles;
- commands, interactive answers, stdout, stderr, exit status, and duration;
- generated and author-created files, authored source lines, configuration
  lines, dependencies, public APIs, and required framework concepts;
- typecheck, build, browser, accessibility, HMR, SSR, hydration, cleanup, and
  diagnostic evidence;
- browser-visible output and explicit limitations;
- at least one usability pass using the same written brief, including
  participant count/order, discoverability and diagnostic observations, and
  limitations.

Results are compared per task and per dimension. No combined or weighted score
is accepted. A final report must label every dimension as win, tie, or loss from
the retained raw evidence. Every Gluon loss needs a linked scoped issue or an
accepted non-goal.

## Automation and current boundary

Run `npm run check:dx-scorecard` to verify the task inventory, official source
selection, exact fixture pins and lockfiles, all 21 fixture mappings, strict
human and automated schemas, raw-evidence fields, and retained runs.
The command is part of `npm run check`, so pull requests and `main` execute it in
the repository quality job.

`npm run benchmark:dx` regenerates the three pinned baselines, executes the 20-
starter and five-component Gluon matrices plus the retained Gluon consumer,
clean-installs Vue and React, runs typecheck/build/three-engine browser tests,
captures expected diagnostics and exact browser versions, and writes raw JSON.
The weekly Monday workflow retains that output for 90 days; pull-request and
main quality gates run the fast drift validator. The committed automated run
and its disaggregated interpretation are linked from
[`dx-scorecard-report.md`](dx-scorecard-report.md).

The command still reports zero completed runs because a real participant has
not executed
[`human-usability-brief-v1.md`](../benchmarks/dx/human-usability-brief-v1.md).
That human evidence and maintainer review are the remaining acceptance work;
neither CI nor this documentation substitutes for it.

Issue #111's partial fixture and raw metrics live under
`benchmarks/dx/template-composition`; its canonical slice record is
`benchmarks/dx/evidence/template-composition-2026-07-12.json`. It deliberately
does not satisfy the completed-run schema, invent the other 20 framework-task
results, or claim the required human pass.

The issue #108 slice records the shared foundation/theme setup change
from two setup calls, five named imports, two configuration choices, and two
cleanup operations to one `installUi()` call/import, one typed theme option, and
one `UiOwner.dispose()` operation. The issue #115 slice records the final
maintained-example T2/T3 boundary: two setup calls, five style-management
imports, and two configuration choices become two setup calls, two imports, and
one configuration choice. The remaining `adoptStyles(document, exampleStyles)`
is application-owned styling, not component-library setup. Neither slice is a
completed cross-framework comparison.

Issue #109 retains a bounded Gluon-only starter slice in
`benchmarks/dx/create-gluon-ui-starter-2026-07-12.json`. It records the exact
non-interactive scaffold command, 12 generated files, first UI-test and build
commands, and the complete 20-selection matrix commands. The canonical
before/after row covers tasks T1, T2, T5, and T6 and names setup, import,
configuration, cleanup, HMR, computed-style, and hydration evidence. It contains
no Vue/React execution, human pass, or completed benchmark claim.

Issue #114 records the GLUON GOODS application-owner boundary across CSR and
hydration. Three entry-level setup calls, three ownership imports, three
configuration choices, and failure-only cleanup become two calls to the same
`createShopApplication()` public boundary, one imported ownership API, two
typed target/hydration options, and one `app.unmount()` cleanup path. That path
releases dialog scopes, the `UiOwner`, GLUON GOODS token/layout sheets, and
renderer-owned exact component sheets. This is another Gluon-only dependency
slice, not a completed 21-result benchmark run; no Vue or React task result or
general DX comparison follows from it.

Issue #112's four retained controls, disaggregated metrics, diagnostic and
cleanup evidence, verified Gluon disadvantages, and limitations live under
`benchmarks/dx/stateful-form-control`; the method and commands are documented in
[`stateful-form-control-comparison.md`](stateful-form-control-comparison.md).
