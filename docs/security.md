# Security threat model

This threat model applies to the current private `0.0.0` release line. Its
machine-readable source is
[`quality/security-threat-model.json`](../quality/security-threat-model.json),
and `npm run check:security` rejects missing threat areas or evidence paths.
The model defines runtime boundaries; it does not claim that Gluon sanitizes
application content or supplies an application security policy.

| Area | Runtime control | Application responsibility | Evidence |
| --- | --- | --- | --- |
| HTML | Dynamic strings become text; raw markup requires `unsafeHTML()`; renderer-owned destructive properties are rejected. | Sanitize untrusted markup before the explicit escape hatch. | `tests/dom-runtime-contract.spec.ts`, `tests-node/ssr.spec.ts` |
| URLs | Dynamic URL sinks reject `javascript:`, `vbscript:`, and `data:` after normalization; `unsafeURL()` is explicit. | Define origin/path allowlists and review every bypass. | `tests/dom-runtime-contract.spec.ts`, `tests-node/ssr.spec.ts` |
| Styles | Constructable sheets are the browser runtime; SSR carriers are escaped and digest/order validated before adoption. | Treat `css()` input as author source; do not interpolate untrusted CSS. | `tests/styles-and-element.spec.ts`, `tests/hydration.spec.ts` |
| SSR state | Only JSON-compatible state is accepted; script-breaking characters are escaped; resources are request-owned. | Keep secrets out of browser-visible state and authorize every serialized field. | `tests-node/ssr.spec.ts`, property/fuzz gate |
| CSP | A request nonce is transported to initial style carriers without being generated or weakened by Gluon; module scripts use external asset URLs. | Generate unpredictable per-response nonces or hashes, emit policy/report headers, and reject violations. | `tests-node/ssr.spec.ts`, `docs/deployment.md` |
| Trusted Types | Unsafe sinks are visible in public API names. No `0.0.0` enforcement compatibility claim is made. | An enforcing application must own and audit a compatible policy until Gluon defines a public policy contract. | `src/runtime.ts`, `docs/dom-runtime.md` |

## Trust boundaries

- Package source and compiled templates are trusted application code.
- Props, Router locations, Store snapshots, server request data, persistence,
  and third-party Custom Element inputs cross application-controlled boundaries.
- `unsafeHTML()`, `unsafeURL()`, `css()`, CSP nonces, and asset manifests are
  explicit reviewer-controlled escalation points, not sanitizers.
- HTML responses, hydration state, static files, resource hints, and progressive
  stream chunks cross the server-to-browser boundary.

## Failure behavior

Rejected HTML properties, event-handler strings, URL protocols, non-JSON state,
style manifests, and hydration carriers fail visibly. Hydration style adoption
is transactional: invalid input retains the original carrier for diagnosis and
does not report a successful handoff. Applications must surface these failures
through their error and CSP reporting rather than treating them as successful
renders.

## Review procedure

Run `npm run check:security`, the deterministic property/fuzz suite, SSR tests,
and the browser matrix. A change to a sink, escape hatch, serializer, asset URL,
style carrier, hydration boundary, or request-ownership rule must update the
machine-readable model and this review in the same pull request.
