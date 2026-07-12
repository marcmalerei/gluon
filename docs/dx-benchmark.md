# Developer-experience benchmark

Issue [#107](https://github.com/marcmalerei/gluon/issues/107) requires a
task-level, reproducible comparison of Gluon, Vue, and React. The versioned
contract is
[`benchmarks/dx/specification-v1.json`](../benchmarks/dx/specification-v1.json),
and completed evidence must conform to
[`benchmarks/dx/schema/run-v1.schema.json`](../benchmarks/dx/schema/run-v1.schema.json).

This repository does not currently contain a completed DX benchmark run. One
retained record selects the comparator lanes and captures the environment and
package versions observed on 12 July 2026. A second, explicitly partial record
captures issue #111's nested checkout/dialog syntax measurements for the
T3-local-layers implementation slice. Neither supports a win, tie, loss,
usability, readability, or general DX-superiority claim.

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

## Identical task outcomes

Every framework implements the same seven outcomes:

1. scaffold a strict TypeScript application with routing, persisted state,
   browser testing, and a production build;
2. add a themed accessible input and button through public contracts;
3. create and extend an app-local primitive, repeated composition, and page
   layout in the same checkout flow;
4. build the same typed, validated, cleanup-owning quantity form control;
5. navigate, persist, test the customer flow, and retain state through a
   compatible hot update;
6. server-render and hydrate the same product route;
7. consume the stateful control from plain HTML without a framework wrapper
   where the selected platform lane permits it, or retain the framework's
   limitation as the result.

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
selection, strict run schema, raw-evidence fields, and the orientation record.
The command is part of `npm run check`, so pull requests and `main` execute it in
the repository quality job.

That command currently reports zero completed runs. Clean-install fixtures,
non-human measurement execution, HMR observation, the retained human pass, and
the final comparison remain acceptance work in #107. The dependent public APIs
are tracked by #108 through #115. The epic must remain open until those slices
are complete, all three fixtures satisfy every task without private substitutes,
and a complete run is retained and validated.

Issue #111's partial fixture and raw metrics live under
`benchmarks/dx/template-composition`; its canonical slice record is
`benchmarks/dx/evidence/template-composition-2026-07-12.json`. It deliberately
does not satisfy the completed-run schema, invent the other 20 framework-task
results, or claim the required human pass.

The issue #108 slice currently records the shared foundation/theme setup change
from two setup calls, five named imports, two configuration choices, and two
cleanup operations to one `installUi()` call/import, one typed theme option, and
one `UiOwner.dispose()` operation. Aggregate component-sheet imports remain and
are explicitly assigned to #115; therefore the full T2/T3 measurements have not
been claimed or compared.
