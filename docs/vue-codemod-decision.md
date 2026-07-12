# Bounded Vue codemod decision

- **Decision:** No-go for a source writer
- **Decision date:** 2026-07-12
- **Tracking issue:** [#92](https://github.com/marcmalerei/gluon/issues/92)
- **Evidence basis:** Issues [#88](https://github.com/marcmalerei/gluon/issues/88)
  through [#91](https://github.com/marcmalerei/gluon/issues/91)
- **Authorization:** RFC 0003 remains report-only

## Outcome

No evaluated transform is authorized for source generation or rewriting. The
retained analyzer corpus proves deterministic syntax inventory, not equivalent
Gluon behavior. No superseding writer RFC is proposed, no converter package or
CLI is added, and no implementation follow-up issue is opened.

The machine-readable source of truth is
[`quality/vue-codemod-decision.json`](../quality/vue-codemod-decision.json).
It links every candidate to retained input, exact analyzer inventory/finding
IDs, the shared
[`no-write expected output`](../quality/vue-codemod-evidence/no-write-expected-output.json),
and either a semantic acceptance test or a
[`documented counterexample`](../quality/vue-codemod-evidence/counterexamples.md).
`npm run check:vue-codemod-decision` validates every link and count.

## Evidence boundary

The four versioned analyzer reports contain 17 files, 52 inventory records, and
26 findings. Fourteen candidate classes were evaluated. None has a retained
generated target plus a semantic acceptance suite, so behavioral-equivalence
coverage is `0/14`. These numbers describe only the committed fixture corpus;
they make no claim about arbitrary Vue projects.

The production `VueProductHost.vue` and its browser tests are supplementary
behavioral evidence for explicit Custom Element coexistence. They are not added
to the corpus denominator and do not prove an automatic rewrite.

## Candidate decisions

| Candidate class | Retained analyzer evidence | Classification | Decision | Missing proof |
| --- | --- | --- | --- | --- |
| Vue imports | Three exact `vue-import` inventory records | Review required | No-go | Replacement scheduling, cleanup, ownership, and module side effects |
| Static component registration | Component use plus `GVA1203` runtime registration | Unsupported | No-go | No positive static-registration input/output fixture |
| Props, emits, and models | Exact prop/emit/model inventory in both supported SFCs | Review required | No-go | Native property/event/model transport and timing |
| Simple template bindings | Native nodes plus structural directive/model inventory | Review required | No-go | Branch identity, refs, slots, accessibility, and update timing |
| Native Custom Element transport | Prop/emit inventory plus the tested production Vue host | Review required | No-go | Host contract is manually authored, not transform output |
| Stylesheet extraction | `GVA1401` scoped CSS and `GVA1402` CSS modules | Review required | No-go | Selector rewriting, cascade, modules, and sheet ownership |
| Router and Store boundaries | `GVA1301` and `GVA1302` | Review required | No-go | Route ownership and application/request Store isolation |
| Lifecycle | Options and Composition lifecycle inventory | Review required | No-go | Disconnect/reconnect, cleanup, scheduling, and server behavior |
| Tests | Two `GVA1601` findings | Review required | No-go | Wrapper semantics and behavior-specific replacement assertions |
| Async components and Suspense | `GVA1303` plus Suspense inventory | Review required | No-go | Loading, failure, cancellation, retry, teardown, and SSR behavior |
| Dynamic templates, macros, and directives | `GVA1201`, `GVA1202`, and `GVA1102` | Unsupported | No-go | Dynamic identity and custom compile/runtime behavior are unavailable |
| Plugins and runtime registration | `GVA1601` and `GVA1203` | Unsupported | No-go | RFC 0003 deliberately does not execute configuration or plugins |
| SSR and hydration | Two `GVA1501` findings | Unsupported | No-go | Request isolation, state/style transport, identity, and mismatch behavior |
| CSS preprocessors and external styles | `GVA1403` | Unsupported | No-go | No evaluated CSS output or processor configuration |

## Syntax coverage is not behavioral equivalence

An exact inventory record means only that the analyzer found an enumerated
static construct at a deterministic source location. A structural or
indeterminate record is weaker. None of these states proves that generated
Gluon code would preserve runtime ordering, ownership, accessibility, CSS,
Router, Store, async, server, hydration, or test behavior.

False positives remain possible when syntax matches but runtime semantics
differ. False negatives remain possible through aliases, dynamic imports,
generated code, macros, plugin transforms, runtime registration, and external
configuration that the static analyzer intentionally does not execute.

## Required human review

A migration reviewer must use the analyzer as inventory, redesign ownership
against public Gluon APIs, and verify the applicable browser, application,
server, accessibility, and rollback evidence in the tested cutover playbook.
Source changes remain manual. The original Vue files remain the rollback unit
until their replacement is accepted and the owning cutover stage is complete.

Any future writer proposal requires a new accepted RFC before implementation.
That RFC must define preview/dry-run behavior, determinism, idempotence,
formatting, conflicts, rollback, security, diagnostics, and supported versions.

## GLUON GOODS application

This decision adds no framework feature, package, public API, or customer-facing
capability. There is therefore no honest GLUON GOODS UI integration. The
production configurator and Vue host remain behavioral evidence; the no-go
validator remains repository acceptance infrastructure.
