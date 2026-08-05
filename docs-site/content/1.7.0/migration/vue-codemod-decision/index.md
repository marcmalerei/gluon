# Vue codemod decision: no-go

The retained Vue migration evidence does **not** authorize an automatic source
converter. Four versioned analyzer reports cover 17 fixture files, 52 inventory
records, and 26 findings across 14 candidate classes. They prove syntax
inventory. They prove behavioral equivalence for `0/14` candidate classes.

No source writer, converter package, write flag, or implementation follow-up is
proposed. RFC 0003 remains report-only.

## Evaluated candidates

| Candidate | Classification | Decision | Required review |
| --- | --- | --- | --- |
| Vue imports | Review required | No-go | Scheduling, cleanup, ownership, module effects |
| Static component registration | Unsupported | No-go | No positive retained registration fixture |
| Props, emits, models | Review required | No-go | Native property/event/model contract |
| Simple template bindings | Review required | No-go | Identity, refs, slots, ARIA, timing |
| Native Custom Element transport | Review required | No-go | Manually authored host contract |
| Stylesheet extraction | Review required | No-go | Scoped/modules/cascade/sheet ownership |
| Router and Store | Review required | No-go | Route and application/request ownership |
| Lifecycle | Review required | No-go | Reconnect, cleanup, scheduler, server behavior |
| Tests | Review required | No-go | Replacement behavior and wrapper semantics |
| Async components and Suspense | Review required | No-go | Failure, cancellation, retry, teardown, SSR |
| Dynamic templates, macros, directives | Unsupported | No-go | Dynamic/custom behavior is unavailable |
| Plugins and runtime registration | Unsupported | No-go | Configuration is never executed |
| SSR and hydration | Unsupported | No-go | Isolation, transport, identity, mismatch behavior |
| CSS preprocessors/external styles | Unsupported | No-go | No evaluated processor output |

## Evidence contract

The repository retains the complete
[decision](https://github.com/marcmalerei/gluon/blob/main/quality/vue-codemod-decision.json),
[no-write expected output](https://github.com/marcmalerei/gluon/blob/main/quality/vue-codemod-evidence/no-write-expected-output.json),
and
[counterexamples](https://github.com/marcmalerei/gluon/blob/main/quality/vue-codemod-evidence/counterexamples.md?plain=1).
Every candidate links to input files, exact analyzer inventory/finding IDs, and
a semantic test or counterexample. `npm run check:vue-codemod-decision` rejects
missing evidence, changed corpus counts, an unknown class, or any generated,
modified, or deleted expected file.

The corpus measurement applies only to the supported, unsupported, malformed,
and adversarial analyzer fixtures. The production Vue host and browser suite
are supplementary evidence for manual Custom Element coexistence, not a
conversion-success sample.

## Human migration boundary

Use `gluon-vue-analyze` to inventory static Vue 3.5 source, then follow the
[tested cutover playbook](../vue-to-gluon-cutover/). A reviewer must redesign
component, Router, Store, async, stylesheet, lifecycle, server, and test
ownership against public Gluon contracts and run the relevant behavioral
evidence. The analyzer never claims that detected syntax has an equivalent
generated target.

False positives can occur when matching syntax hides different runtime
semantics. False negatives can occur through aliases, dynamic imports,
generated code, macros, plugin transforms, runtime registration, and external
configuration that the analyzer intentionally does not execute.

Any future write-capable proposal requires a new accepted RFC covering preview,
dry-run, deterministic and idempotent output, formatting, conflicts, rollback,
security, diagnostics, and supported versions before implementation begins.
