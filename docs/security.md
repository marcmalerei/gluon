# Security threat model

This threat model applies to the released `1.3.0` release line. Its
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
| Trusted Types | Unsafe sinks are visible in public API names. No `1.3.0` enforcement compatibility claim is made. | An enforcing application must own and audit a compatible policy until Gluon defines a public policy contract. | `src/runtime.ts`, `docs/dom-runtime.md` |
| Eleventy prerendering | The optional adapter validates route and asset URL boundaries, isolates abort/disposal ownership, escapes default-document attributes, and transports existing SSR carriers unchanged. | Trust and validate Eleventy data, asset manifests, custom document functions, CSP policy, and deployment fallbacks. | `tests-node/ssr.spec.ts`, `tests/hydration.spec.ts`, real and clean Eleventy build gates |
| Vue source analysis | The Node analyzer realpath-checks one root, never follows symlinks or executes project code, enforces fixed worker/resource budgets, emits no source excerpts/absolute paths, and has no writer/network/plugin hook. | Treat findings as static inventory only; review indeterminate runtime, Router, Store, style, SSR, async, test, and build semantics. | `tests-node/vue-migration-analyzer.spec.ts`, retained adversarial fixtures, RFC 0003 |
| Gluon project analysis | The CLI realpath-contains one root, skips symlinks and generated/dependency directories, caps source files and bytes, never imports application modules, and writes only JSON to stdout. | Treat exact and structural records as static evidence and review every indeterminate record against runtime behavior. | `tests-node/language-server.spec.ts`, `check:project-analysis`, clean-install fixture |
| Component generation | The planner validates the entire operation set before writes, rejects path/tag/manifest/symlink hazards, requires two-part overwrite intent, reports dry runs without mutation, and restores applied files if commit fails. | Review generated application code and retain ownership of architecture, dependencies, deployment policy, and any later manual edits. | `tests-node/create-gluon.spec.ts`, five-kind clean-install matrix, `docs/component-generator.md` |

## Trust boundaries

- Package source and compiled templates are trusted application code.
- Props, Router locations, Store snapshots, server request data, persistence,
  and third-party Custom Element inputs cross application-controlled boundaries.
- `unsafeHTML()`, `unsafeURL()`, `css()`, CSP nonces, and asset manifests are
  explicit reviewer-controlled escalation points, not sanitizers.
- HTML responses, hydration state, static files, resource hints, and progressive
  stream chunks cross the server-to-browser boundary.
- Vue project bytes cross into a Node parser worker as untrusted inert input;
  only normalized report data crosses back.
- Gluon project bytes cross into the language-tooling parser as inert input;
  only bounded confidence-marked inventory data crosses back.
- Add-component names, paths, project manifests, existing barrel text, and file
  collisions cross into a local filesystem planner; no remote template or
  project code is executed.

## Failure behavior

Rejected HTML properties, event-handler strings, URL protocols, non-JSON state,
style manifests, and hydration carriers fail visibly. Hydration style adoption
is transactional: invalid input retains the original carrier for diagnosis and
does not report a successful handoff. Applications must surface these failures
through their error and CSP reporting rather than treating them as successful
renders.

Unsupported, malformed, root-escaping, changing, or over-budget Vue inputs emit
stable `GVA` findings and non-zero exit codes. The analyzer does not recover by
executing a project or guessing a source mapping.

Invalid component kinds, names, paths, tags, manifests, symbolic-link segments,
and unconfirmed collisions fail before mutation. A commit failure removes
staged temporary files and restores already-applied targets from their captured
pre-write contents.

## Review procedure

Run `npm run check:security`, `npm run test:vue-analyzer`, the deterministic property/fuzz suite, SSR tests,
and the automated browser-engine matrix. A change to a sink, escape hatch, serializer, asset URL,
style carrier, hydration boundary, request-ownership rule, or generator writer
must update the
machine-readable model and this review in the same pull request.
