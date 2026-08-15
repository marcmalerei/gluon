# Security threat model

This threat model applies to the prepared `1.9.0` release line. Its
machine-readable source is
[`quality/security-threat-model.json`](../quality/security-threat-model.json),
and `npm run check:security` rejects missing threat areas or evidence paths.
The model defines runtime boundaries; it does not claim that Gluon sanitizes
application content or supplies an application security policy.

## SSR transport and hydration

SSR state is restricted to finite JSON composed of plain objects and arrays.
The serializer escapes HTML-significant characters, script/style terminators,
U+2028, and U+2029 before emitting an inert `application/json` element. It does
not generate an executable inline bootstrap surface.

Declarative Shadow DOM marker ranges use the inert, versioned
`data-gluon-hydration` host attribute. The browser validates the canonical
version, ordered range, marker set, and expected DOM before binding. Missing,
invalid, or tampered transport fails closed and preserves the existing root;
consumer code never rewrites marker HTML. Style carriers validate identity,
digest, exact CSS, order, scope, and target before adoption and are removed only
after a successful handoff.

`renderRequest()` accepts a request-owned `AbortSignal` and always releases the
request Router, Store, application, and effect scope. Signals, controllers, and
cleanup owners are not shared across concurrent requests.

Trusted Types support is opt-in and application-owned. The runtime validates a
configured policy before HTML/SVG template compilation, dynamic fragments,
`srcdoc`, hydration expected markup, and progressive patch parsing; it never
creates a global policy. `quality/trusted-types-sinks.json` is the checked sink
inventory. Explicit `trustedHTML()` values remain raw markup and are not a
sanitizer. The enforcing evidence is a real Playwright-managed Chromium page,
not an assertion inferred from Node serialization.

| Area | Runtime control | Application responsibility | Evidence |
| --- | --- | --- | --- |
| HTML | Dynamic strings become text; raw markup requires `unsafeHTML()`; renderer-owned destructive properties are rejected. | Sanitize untrusted markup before the explicit escape hatch. | `tests/dom-runtime-contract.spec.ts`, `tests-node/ssr.spec.ts` |
| URLs | Dynamic URL sinks reject `javascript:`, `vbscript:`, and `data:` after normalization; `unsafeURL()` is explicit. | Define origin/path allowlists and review every bypass. | `tests/dom-runtime-contract.spec.ts`, `tests-node/ssr.spec.ts` |
| Styles | Constructable sheets are the browser runtime; SSR carriers are escaped and digest/order validated before adoption. | Treat `css()` input as author source; do not interpolate untrusted CSS. | `tests/styles-and-element.spec.ts`, `tests/hydration.spec.ts` |
| SSR state | Only JSON-compatible state is accepted; script-breaking characters are escaped; resources are request-owned. | Keep secrets out of browser-visible state and authorize every serialized field. | `tests-node/ssr.spec.ts`, property/fuzz gate |
| CSP | A request nonce is transported to initial style carriers without being generated or weakened by Gluon; module scripts use external asset URLs. | Generate unpredictable per-response nonces or hashes, emit policy/report headers, and reject violations. | `tests-node/ssr.spec.ts`, `docs/deployment.md` |
| Trusted Types | Explicit trusted HTML values and an application-owned `trustedTypes.policy` satisfy the inventoried parser sinks under the tested Chromium `require-trusted-types-for` policy. Missing and incompatible configurations fail with stable diagnostics. | Configure and audit the policy and CSP name in the application that owns the HTML trust boundary; keep untrusted content on the escaping path. | `quality/trusted-types-sinks.json`, `scripts/validate-trusted-types-chromium.mjs`, clean-package fixture, browser and SSR suites |
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

## Dependency audit

The current clean-install audit was reproduced from `npm ci --ignore-scripts` and `npm audit` on
2026-08-15 under Node `v22.12.0`.

| Result | Count | Notes |
| --- | ---: | --- |
| `npm audit` | 1 | The only retained finding is the dev-only `js-yaml` chain through `@11ty/eleventy -> gray-matter`. |
| `npm audit --omit=dev` | 0 | No production dependency paths remain in the audit report. |

The retained `js-yaml` findings are dev-only through `@11ty/eleventy -> gray-matter -> js-yaml@3.15.0` and
`@11ty/eleventy -> js-yaml@4.3.0`. No Gluon runtime path uses those packages, and the upstream
`gray-matter` release line still requires the vulnerable `js-yaml@^3.13.1` range. That makes the
finding reviewable but not currently fixable without a speculative upstream breaking change.

The previously reviewed `@cyclonedx/cdxgen@12.8.3` line was not retained because its installed
subtree pulled `@appthreat/atom-parsetools@1.3.0` with nested Babel 8 packages whose engine floor
requires Node `^22.18.0 || >=24.11.0`. The current release line uses
`@cyclonedx/cdxgen@12.8.0`, which installs `@appthreat/atom-parsetools@1.2.2` instead and remains
compatible with Gluon's Node `^22.12.0 || ^24.0.0` support floor.

## Dependency security automation

Repository dependency intake is reviewed through `.github/dependabot.yml`. It updates direct npm
dependencies and lockfiles on a weekly Monday schedule, keeps GitHub Actions updates on the same
cadence, and caps open pull requests so review stays bounded.

The machine-readable dependency security policy lives in
[`quality/dependency-security-policy.json`](../quality/dependency-security-policy.json), and the
exception registry lives in
[`quality/dependency-security-exceptions.json`](../quality/dependency-security-exceptions.json).
`npm run check:dependency-security-policy` validates both files together with the workflow and
Dependabot config. `npm run check:dependency-security` runs the local audit policy command.

The local audit command runs both `npm audit --json` and
`npm audit --json --omit=dev` without printing the full environment. Comparing
the two reports classifies production reachability without package-name
heuristics. It normalizes both reports into `.tmp/dependency-security/`,
preserves dependency paths and advisory identities, and exits non-zero when a
blocking finding has no approved, unexpired exception.

Blocking rules are scoped by severity and dependency reachability:

- critical findings block in both production and development scopes;
- high findings block production dependencies; development-only high findings are report-only;
- moderate findings block when they reach production dependencies, but remain report-only in
  development-only paths;
- low and info findings are report-only by default;
- exceptions must declare `owner`, `reason`, `expiry`, `advisory`, and `package`, and the validator
  rejects expired or malformed entries.

The audit workflow retains both raw reports and the normalized policy summary even when the
policy step fails. That keeps the exact finding paths available for maintainer triage without leaking
the runner environment.

Local reproduction and triage:

1. Run `npm ci --ignore-scripts --legacy-peer-deps`, then
   `npm run check:dependency-security` from the repository root.
2. Inspect both raw reports and `audit-summary.json` under
   `.tmp/dependency-security/`; use the retained `paths` and `npm explain <package>`
   to identify the direct owner.
3. Prefer a lockfile or direct dependency update and rerun the same command.
4. If remediation is temporarily impossible, add the narrow package/advisory
   exception with an owner, reason, and real expiry date. Optional scope and
   severity fields must match the finding to suppress it.

The networked registry audit intentionally runs only in this dedicated command
and scheduled/manual workflow. `check:repository` validates the workflow,
policy, exception expiry, and fixture behavior without making registry state a
general repository-build dependency.
