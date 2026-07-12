# Automated DX scorecard report

This report interprets only
[`automation-8a02472.json`](../benchmarks/dx/runs/automation-8a02472.json),
captured on 12 July 2026 from commit
`8a024721fd484dacb79397a0bf257e49c1f4664b`. It is not the final issue #107
report: the required human usability pass has not occurred, so no general DX
superiority claim is supported.

## Retained lanes

- Gluon packages `0.0.0` from the run commit, TypeScript `5.9.3`, Vite `8.1.4`,
  Vitest `4.1.10`, and Playwright `1.61.1`.
- `create-vue 3.22.4`, Vue `3.5.39`, Vue Router `5.1.0`, Pinia `3.0.4`, and
  `@vue/server-renderer 3.5.39`.
- `create-react-router 8.2.0`, React Router `8.2.0`, and React/React DOM
  `19.2.7`.

The run records macOS/Darwin `25.3.0`, arm64, Node `v22.22.0`, npm `10.9.4`,
Chromium `149.0.7827.55`, Firefox `151.0`, and WebKit `26.5`.

## Results by dimension

| Dimension | Gluon result against both comparators | Retained fact |
| --- | --- | --- |
| T1 setup command | Tie | Each lane has one pinned application scaffold command. |
| T1 authored source | Win | 40 added non-empty lines versus Vue 56 and React 52. |
| T1 configuration | Win | 6 added configuration lines versus Vue 15 and React 18. |
| T2 authored source | Win | 27 lines versus Vue 38 and React 82. |
| T3 authored source | Win | 0 lines beyond generated Gluon layer files versus Vue 13 and React 41. |
| T4 authored source | Win | The Gluon stateful control is generated; Vue adds 25 lines and React 50. |
| T5 authored source | Win | The retained Gluon task-local evidence adds 0 lines versus Vue 30 and React 33; shared application edits remain charged to T1/T2. |
| T6 authored source | Win | 4 lines versus Vue 45 and React 26. |
| T1–T6 observable task result | Tie | All three lanes typecheck, build, pass the customer flow, and retain SSR/hydration/HMR evidence. |
| T7 observable task result | Win | Gluon exposes the generated autonomous control directly; Vue and React retain their host-bridge limitation. |
| Invalid prop/event diagnostics | Tie | All three normal typecheck lanes reject both retained mistakes. |
| Missing-cleanup diagnostic | Win | Gluon retains compiler cleanup diagnostics; normal Vue and React typechecks emit none for the retained mistake. |
| Direct production dependencies | Loss | Gluon lists 9, Vue 4, and React 6. |
| Direct development dependencies | Loss | Gluon lists 9, Vue 8, and React 7. |
| Required concepts | Mixed | T1 ties React and has one fewer label than Vue; T2/T5 tie; T3 and T6 expose more explicit Gluon concepts; T4 ties React and has one fewer than Vue. T7 counts are not comparable because Vue/React do not complete the wrapper-free result. |
| Browser-visible output | Tie for T1–T6; win for T7 | The suites retain the Evidence Tote checkout, labels, persisted summary, navigation, reload, hydration identity, and HMR state; only Gluon completes plain HTML directly. |

No opaque total is calculated. Added-line counts are computed by regenerating
each pinned official scaffold, diffing each task's retained author-owned files,
and counting added non-empty lines. Generated and author-created/modified file
lists remain separate in every raw task record.

## Accepted non-goals for automated losses

- Package-count consolidation is not a scorecard implementation goal. Gluon's
  explicit Core, Router, Store, SSR, Reactivity, and layered UI packages are
  public release boundaries; hiding them in an aggregate package would conflict
  with the accepted package architecture. Command count and clean installation
  are measured separately.
- T3 explicitly measures Gluon's named Atom/Molecule/Organism layer contracts,
  and T6 explicitly measures request state, hydration, and style ownership.
  Removing those concepts solely to reduce a count is an accepted non-goal.

## Remaining blocker

Run the unchanged
[`human-usability-brief-v1.md`](../benchmarks/dx/human-usability-brief-v1.md)
with at least one real participant and retain reviewed observations under the
completed-run schema. Until then issue #107 stays open and this report cannot be
promoted to a final human-plus-automation comparison.
