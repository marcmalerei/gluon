# Retained stateful form-control comparison

Issue [#112](https://github.com/marcmalerei/gluon/issues/112) retains one
accessible quantity control in four implementations under
`benchmarks/dx/stateful-form-control`: the existing Gluon class API, the
functional `defineGluonElement` API, Vue 3.5.39, and React 19.2.7. Vue and React
are exact development dependencies. Their server renderers and DOM clients are
pinned to the matching versions.

The fixture contract is the same in every lane: a structured product property,
local quantity and computed total, a cancelable native `quantity-change` event,
default and named content, required validation, delegated focus, cleanup, form
value participation, server markup, retained hydration, and creation through
`document.createElement`. Vue and React use their ordinary local component APIs
for the view and an explicit autonomous Custom Element bridge for the platform
boundary. The bridge is part of their complete authored-line measure; the local
view measure remains separate.

Run `npm run check:stateful-control-comparison` to verify the pinned versions,
public import boundaries, committed authored-line ranges, raw evidence, and
strict TypeScript compilation. The browser fixture
`tests/dx-stateful-form-control.spec.ts` executes the common behavior contract,
exact-tag Gluon/Vue/React retained hydration, cleanup, and a Vue host that consumes the Gluon
element directly without a wrapper. `tests-node/ssr.spec.ts` verifies the four
server outputs, readable-stream serialization, and static generation. Generator
and Playground tests retain public
`defineGluonElement` examples.

The raw record is
`benchmarks/dx/stateful-form-control/evidence.json`; its parent-contract record
is `benchmarks/dx/evidence/stateful-form-control-2026-07-12.json`. These records
report complete-boundary and component-only lines independently, required
concepts, repeated public declarations, diagnostic coverage, cleanup evidence,
findings, and the verified Gluon disadvantages. They do not contain a human
pass or the other parent benchmark tasks, so they support no readability,
usability, win, tie, loss, or general DX-superiority claim.

The language-server and `gluon-template-check` fixtures diagnose unknown
functional-element properties, events, and literal named light-DOM slots at
their original source ranges. The comparator invalid fixture retains all three
contract failures.
