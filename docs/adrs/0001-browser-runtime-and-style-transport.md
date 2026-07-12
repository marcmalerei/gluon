# ADR 0001: Browser, runtime, and style transport contract

- **Status:** Accepted
- **Decision date:** 2026-07-10
- **Tracking issue:** [#16](https://github.com/marcmalerei/gluon/issues/16)
- **Roadmap tracker:** [#42](https://github.com/marcmalerei/gluon/issues/42)
- **Depends on:** [RFC 0001](../rfcs/0001-gluon-1.0-product-scope.md), [RFC 0002](../rfcs/0002-unified-component-model.md)
- **Supersedes:** Nothing

## Decision summary

Gluon 1.0 supports a release-relative set of current Chromium, Firefox, and
Safari browser products that pass Gluon's complete capability and conformance
suite. Node.js server rendering and build tooling support Active or Maintenance
LTS release lines at or above Node 22.12.0.

The browser runtime has one styling model: constructed `CSSStyleSheet` objects
installed through `Document.adoptedStyleSheets` or
`ShadowRoot.adoptedStyleSheets`. It has no runtime `<style>` fallback and no
built-in polyfill.

Universal builds extract serializable `css` literals into a content-addressed
style manifest. The server emits open Declarative Shadow DOM (DSD) and marked
`<style>` carrier nodes for initial rendering. Hydration reuses the parsed
ShadowRoot, creates one constructed sheet per document and style identifier,
adopts sheets in server order, and removes the carrier nodes only after the
handoff succeeds. The server carriers are serialized initial state, not a
browser-runtime fallback.

Unsupported environments fail through stable diagnostics before Gluon mutates
the requested render or hydration target. A failed hydration style handoff
leaves the server carriers in place and does not replace matching server DOM.

## Why this decision exists

Gluon's current implementation already requires constructable stylesheets and
`adoptedStyleSheets`, but its test configuration runs only Chromium. The source
tree has no SSR renderer, hydration runtime, style manifest, DSD handling, or
release compatibility matrix.

RFC 0001 requires supported browser/runtime targets and styled SSR, streaming,
hydration, and SSG. RFC 0002 assigns every element component an open ShadowRoot
and requires hydration to preserve matching owned nodes. Initial server styles
must therefore work before JavaScript without introducing a second permanent
runtime styling model or destroying the parsed ShadowRoot during upgrade.

## Contract and current prototype

This ADR defines the required Gluon 1.0 result. It does not claim that the
current browser-only prototype has already implemented it.

| Required contract | Current prototype on 2026-07-10 | Delivery |
| --- | --- | --- |
| Release-gated Chromium, Firefox, Safari, and mobile targets | Vitest runs one headless Chromium instance. | #38 |
| Stable unsupported-environment diagnostics and capability report | Style helpers throw ordinary `Error` instances with descriptive text. | #21, #38 |
| Supported Node LTS lines only | `package.json` allows Node 20.19 and every future version from 22.12 upward; Node 20 is EOL. | #17 |
| Isomorphic, serializable style definitions | `css()` creates a browser sheet or DOM-free descriptor; `createStyleManifest()` produces ordered content IDs, digests, and CSS text. | Delivered in #37 |
| Existing DSD roots are claimed without clearing server nodes | `GluonElement` reuses an existing open declarative root; `hydrateElement()` defers connection rendering until marker binding completes. | Delivered in #36 |
| SSR style extraction, manifest, carrier output, and hydration handoff | Document carriers, content IDs/digests, request nonces, order validation, rollback, removal, and adopted-sheet ownership are implemented. | Delivered in #37 |

Closing this ADR records the architecture. The implementation issues above
remain open until their own evidence passes.

## Supported browser matrix

### Version resolution

Browser support is both product-based and capability-based. Each Gluon release
freezes exact product, browser, engine, operating-system, and device versions in
a versioned compatibility manifest at release-candidate cut. That manifest is
immutable evidence for the release; words such as “current” below are resolved
to exact versions in it.

The manifest records one UTC cut timestamp. A browser version is eligible only
when the vendor's public release source marks it generally available in the
named stable/release channel no later than that timestamp and the recorded test
environment can install or run it. Resolution uses Chrome for Testing and
Chrome's channel documentation, the Microsoft Edge release schedule, Mozilla
Release Management and release notes, and Apple's security release list.

For Chrome, Edge, and Firefox, “immediately preceding” means the numerically
preceding generally available major in the same product channel. For Apple
products, the manifest selects the latest stable major plus at most one earlier
major that Apple still lists as receiving security updates on the named OS at
the cut. If no earlier Apple major remains security-supported, only the latest
major is supported and the manifest records that fact.

The release-relative policy avoids promising browser versions that do not yet
exist while keeping every support claim reproducible.

| Browser product | Supported window at release cut | Required evidence |
| --- | --- | --- |
| Google Chrome desktop | Stable major and immediately preceding stable major | Full browser conformance; reference-SPA E2E on stable |
| Microsoft Edge desktop | Stable major and immediately preceding stable major | Full browser conformance on both supported versions |
| Mozilla Firefox desktop | Stable, immediately preceding stable, and current ESR | Full browser conformance; reference-SPA E2E on stable and ESR |
| Apple Safari on macOS | Latest stable major plus at most one earlier Apple-security-supported major | Full browser conformance in real Safari; reference-SPA E2E on latest |
| Apple Safari on iOS/iPadOS | Latest stable major plus at most one earlier Apple-security-supported major | Full browser conformance on the recorded simulator or device |
| Google Chrome on Android | Current stable | Full browser conformance on the recorded emulator or device |
| Mozilla Firefox on Android | Current stable | Full browser conformance on the recorded emulator or device |

Playwright Chromium and WebKit builds are useful automation targets but do not
by themselves establish support for branded Chrome, Edge, or Safari. The
compatibility manifest records the actual tested product and execution mode.

Beta, Developer, Preview, and Nightly channels are non-blocking early-warning
lanes. A regression there opens an issue but does not block a release until the
affected version enters a supported window.

### Required browser capabilities

Every target in the supported window must pass executable probes and behavior
tests for all capabilities Gluon 1.0 exposes, including:

- ES modules and the ES2022 language/runtime features used by the build output
- Custom Elements registration, upgrade, lifecycle reactions, and native events
- open Shadow DOM, native default and named slots, and template cloning
- Declarative Shadow DOM through `template[shadowrootmode="open"]`
- constructed `CSSStyleSheet`, `replaceSync()`, and mutable CSS rules
- `Document.adoptedStyleSheets` and `ShadowRoot.adoptedStyleSheets`
- native CSS cascade layers and `:where()` selectors used by Gluon styles
- `ElementInternals` and form-associated Custom Elements
- the DOM, SVG, event, ref, and form behaviors in the renderer conformance suite

A product version is not supported merely because its browser family appears in
the table. Failure of a required probe or conformance test makes that exact
target unsupported for the affected Gluon release.

### Explicitly unsupported browser environments

Gluon 1.0 does not claim support for:

- Internet Explorer or legacy Microsoft Edge
- browsers outside the named product matrix
- embedded webviews, in-app browsers, smart-TV browsers, or game-console browsers
- Electron or other browser wrappers unless a future contract names and tests them
- browsers that require a Custom Elements, Shadow DOM, DSD, constructable
  stylesheet, adopted stylesheet, or `ElementInternals` polyfill
- non-DOM rendering targets, consistent with RFC 0001

An application can serve static or alternative content to an unsupported
browser, but it cannot label that environment Gluon-compatible without a new
accepted support contract and evidence.

### Progressive enhancement

Plain HTML may contain undefined Gluon element tags and consumer-owned light
DOM before definitions load. An application may design that light DOM as its
own fallback, but Gluon does not claim component behavior or styling before the
required capabilities and definitions are available.

Universal output provides a stronger path inside the supported matrix: parsed
DSD and its server style carriers present the static result while JavaScript is
disabled or delayed. Outside the supported DSD matrix, the application owns any
separate fallback response; Gluon does not move shadow-owned markup into Light
DOM or run a client polyfill.

## Node.js server and build runtime matrix

Gluon supports Node.js lines that meet both conditions at the release cut:

1. the line is in Active LTS or Maintenance LTS according to the official
   Node.js release schedule; and
2. the installed version is at least 22.12.0.

On the decision date, those conditions select Node 22 and Node 24. Node 20 is
EOL, and Node 26 is Current rather than LTS. The release manifest records the
exact latest tested patch from every supported LTS line. The current Node line
runs as a non-blocking forward-compatibility lane until it becomes LTS.

Issue #17 must align package `engines`, CI, release metadata, and installation
diagnostics with this contract. A future Node line is not automatically
supported merely because its number is greater than 22.

Deno, Bun, Cloudflare Workers, browser service workers used as an SSR runtime,
and other server JavaScript runtimes are not Gluon 1.0 targets. Adding one
requires a separate runtime contract, request-isolation evidence, and deployment fixture.

## Browser runtime stylesheet contract

### Constructed sheets only

- `css` definitions resolve to constructed `CSSStyleSheet` instances in the browser.
- Component sheets are adopted into their owning open ShadowRoot.
- Document-level foundation and layer sheets are adopted into the owning Document.
- One sheet may be shared by multiple roots only when those roots have the same
  node document as the sheet's constructor document.
- A cross-document use creates or retrieves the corresponding sheet for the
  target document; it never tries to adopt the original document's object.
- Sheet order is public cascade behavior. Gluon preserves declaration and
  inheritance order while retaining unrelated sheets already owned by the target.
- `@import` is not allowed in a Gluon constructed sheet because `replaceSync()`
  removes parsed `@import` rules. Universal builds report it as a style diagnostic.
- Client-only rendering never creates, injects, or retains a `<style>` fallback.

Stylesheets supplied by a consumer are consumer-owned. Gluon may adopt or
unadopt only the sheets explicitly assigned to its render/application scope and
must preserve unrelated target sheets.

### Polyfill policy

Gluon ships no browser polyfill or emulation for required platform capabilities.
It does not switch to `<style>`, Shady DOM, synthetic slots, hidden form inputs,
or a framework event layer when a capability is absent.

A third-party polyfill loaded by an application does not convert that browser
into a supported Gluon target. A future optional adapter may establish a
separate tested support tier, but it must not change the default runtime or its
failure behavior.

## Unsupported-environment behavior

The public environment preflight returns the complete set of missing required
capabilities. The first operation that needs those capabilities throws a
`GluonUnsupportedEnvironmentError` with:

- `code: "GLUON_UNSUPPORTED_ENVIRONMENT"`
- an immutable `missingCapabilities` list
- the detected browser or runtime data available to Gluon
- a link to version-matched compatibility documentation

Application mounting and hydration run preflight before mutating their target.
Low-level style creation or adoption throws before changing the requested sheet
or root. The diagnostic never silently enables a fallback.

An unsupported Node runtime causes the build, SSR, or SSG command to exit
non-zero with `GLUON_UNSUPPORTED_RUNTIME`, the detected version, and the accepted
LTS rule. Library installation metadata must reject versions outside the
published package range when the package manager enforces `engines`.

If DSD or style handoff is unsupported, hydration stops with
`GLUON_UNSUPPORTED_SSR_TRANSPORT`. It leaves the server ShadowRoot, owned nodes,
and style carriers untouched. It must not clear the server output and retry as
client-only rendering.

## Universal style definition and extraction

Production universal applications use Gluon's accepted build tooling. The
build transforms each statically serializable `css` definition into:

- a stable content-addressed style identifier
- canonical CSS text
- the source module and source location for diagnostics
- dependency and cascade order
- a browser module that constructs or retrieves a document-local sheet
- manifest data available to the server renderer and asset pipeline

Interpolations in a universal style must be deterministically evaluable at
build time. Request data, browser globals, mutable application state, functions,
DOM nodes, and other runtime-only values fail the universal build with
`GLUON_NON_SERIALIZABLE_STYLE`. Per-instance visual values use CSS custom
properties, attributes, classes, or properties rather than generating a new
component sheet.

The extraction manifest is request-independent and immutable for a production
build. Request-local sets record which manifest entries were emitted; they do
not mutate the shared manifest or constructed sheets.

Functional components name immutable exact stylesheet dependencies on their
public metadata. The renderer collects those dependencies from the actual value
tree for each target and owns their reference counts. This includes async
reveal, Teleport targets, retained KeepAlive views, transition leave, nested
ShadowRoots, hydration, reconnection, and teardown. Stable layer/order metadata
keeps adoption order independent of discovery or route timing.

## SSR DOM and initial style transport

### Canonical server output

An element component serializes its owned tree as open Declarative Shadow DOM.
The simplified shape is:

```html
<gluon-card>
  <template shadowrootmode="open">
    <style data-gluon-style="style-id" nonce="request-nonce">/* extracted CSS */</style>
    <!-- element-owned server-rendered nodes -->
    <slot></slot>
  </template>
  <!-- consumer-owned light DOM -->
</gluon-card>
```

Each style carrier contains CSS from one manifest entry and carries its stable
identifier. Carrier order matches the sheet adoption order. A carrier appears
before markup that depends on it inside the DSD stream.

Document-level sheets use the same marker contract in the document head and are
emitted once per request in cascade order. A component sheet must appear in each
ShadowRoot that needs initial styling because document styles do not cross the
Shadow DOM boundary. Repeated carrier text is an accepted server payload cost;
the hydrated browser shares one constructed sheet per document and style identifier.

The SSR serializer treats CSS as raw-text content safely: it must prevent CSS
text from terminating the carrier element and creating markup. CSS URLs,
custom properties, and other security-sensitive values remain in the issue #38
threat model and test suite.

### CSP contract

The server renderer accepts request-local CSP metadata. When the deployment
uses a nonce policy, it copies the supplied nonce to every Gluon style carrier;
Gluon never generates or reuses a nonce across requests. A build may also expose
style hashes for a deployment that authorizes fixed extracted text by hash.

The application is responsible for emitting a matching `style-src` or
`style-src-elem` policy. Production CSP fixtures verify accepted nonce and hash
configurations plus a deliberately rejected configuration. Gluon does not
weaken CSP or fall back to an unapproved external or inline delivery path.

### Streaming and no-JavaScript behavior

- Document-level carriers are emitted before the application markup that uses them.
- Progressive shell and boundary records emit newly required component carriers
  before their dependent HTML or patch template.
- A streamed DSD boundary includes its required carriers before its owned content.
- Async boundaries carry their own manifest dependency set and deterministic order.
- Request-local deduplication applies to document-level carriers, not across
  independent ShadowRoots that each require initial styles.
- In a supported browser with JavaScript disabled or delayed, parsed DSD and its
  carrier styles render the static server result.

## Hydration style handoff

Hydration performs this ordered handoff for every document and owned ShadowRoot:

1. Run the complete environment and transport preflight.
2. Read the existing open ShadowRoot. Do not call `attachShadow()` on a host
   with parsed DSD, because the platform would clear the declarative root.
3. Validate every carrier identifier, manifest entry, CSS digest, and server order.
4. Create or retrieve one constructed sheet for each `(Document, style ID)` pair
   and populate all new sheets before mutating adopted-sheet lists.
5. Snapshot every affected adopted-sheet list, then adopt the complete ordered
   sheet set while preserving unrelated sheets.
6. Bind and hydrate matching owned DOM without replacing the host, ShadowRoot,
   light DOM, or matching owned nodes.
7. Remove Gluon style carriers only after adoption and DOM hydration succeed.

The same style identifier in another Document receives a different
`CSSStyleSheet` object because CSSOM forbids adopting a constructed sheet across
constructor documents.

If validation, sheet construction, or adoption fails before DOM hydration
starts, Gluon restores every affected root's snapshot, retains the carriers,
leaves the server DOM untouched, and reports a deterministic style-handoff
diagnostic.

The platform does not provide transactional rollback for arbitrary DOM
hydration work. If DOM hydration fails after sheet adoption, Gluon retains the
carriers and adopted sheets so the result stays styled, releases bindings,
listeners, refs, and effects installed by the failed hydration attempt, and
reports the exact failure. It does not silently clear the root or retry as
client rendering. Issue #36 owns mismatch mutation rules and their cleanup
evidence; this ADR does not claim that arbitrary consumer DOM mutations can be
reversed.

After successful hydration, Gluon-owned styling in every hydrated root consists
only of adopted constructed sheets. No Gluon SSR carrier remains.

### Shared UI owner

`@gluonjs/atoms` supplies the optional UI-specific owner without reversing the
package graph. `createUiStyleSelection(theme)` names the layer-order,
foundation, token, and selected-theme entries once for server serialization.
The server manifest retains those stable IDs and the `gluon-ui` scope.
`installUi(target, { theme, hydrate: true })` checks only that scope and reports
`missing`, `duplicate`, `reordered`, or `mismatched` through
`GLUON_UI_HYDRATION_MISMATCH` before adopting or changing the target.

In the browser the active theme uses one constructed sheet per target. Theme
changes replace that sheet's text in place, preserving identity for adopters
and HMR-compatible ownership. Multiple logical UI owners share the base sheet
set through reference counts, while every returned handle has its own component
style owner. No UI package mutates DOM during module evaluation and no runtime
`<style>` fallback is introduced.

Usage-derived component carriers use the separate `gluon-component` scope and
`GLUON_COMPONENT_STYLE_HYDRATION_MISMATCH` diagnostic. Hydration validates
missing, extra, duplicate, reordered, mismatched, and wrong-target evidence,
then transfers ownership to the exact client sheets retained by the renderer.

## Why DSD and marked inline carriers

DSD is the canonical element-owned serialization because the HTML parser can
create the open ShadowRoot before element definition and JavaScript execution.
It preserves RFC 0002's ownership boundary and allows a styled static result.

The marked inline carrier is an explicit server-only bridge. It provides CSS
text synchronously with each shadow boundary, participates in CSP through a
nonce or hash, and gives hydration the exact manifest identity and order needed
for adoption.

An external `<link rel="stylesheet">` inside a ShadowRoot is not the canonical
transport because ShadowRoot links are not guaranteed to block its first paint.
Client-only adoption is not acceptable because it leaves the server result
without initial component styles until JavaScript runs.

## Rejected alternatives

### Permanent `<style>` elements

Rejected. They would establish a second browser-runtime styling model and lose
shared constructed-sheet identity. Server carriers are removed after handoff.

### External ShadowRoot stylesheets as the default transport

Rejected. They require one link per styled root, introduce a fetch/load state
inside every boundary, and do not provide Gluon's required initial-style and
handoff behavior without additional machinery.

### Client-only style adoption after SSR

Rejected. It does not deliver styled server output before JavaScript and cannot
meet the no-JavaScript or initial-render contract.

### A constructable stylesheet polyfill or `<style>` fallback

Rejected. It would expand the runtime and support surface while weakening the
project's single styling invariant.

### Runtime serialization of live browser `CSSStyleSheet` objects

Rejected. Node has no browser `CSSStyleSheet`, CSSOM may reject access to rules,
and request-time serialization would not provide a deterministic build manifest.

### Creating a new ShadowRoot during hydration

Rejected. Calling `attachShadow()` with the same mode on a host with a
declarative root clears its children; replacing the root would destroy server
node identity.

## Directly derivable verification matrix

Issues #35 through #38 must implement these release-gating fixtures:

| Contract area | Required evidence |
| --- | --- |
| Version resolution | Committed manifest with exact browser product, version, engine, OS/device, Node patch, date, and test mode |
| Browser capabilities | Positive probes in every supported target and one fixture per missing capability |
| Browser conformance | Full renderer, element, form, slot, event, ref, and stylesheet suites in every supported matrix row |
| Unsupported browser | Stable error code, complete missing-capability list, no target mutation, no fallback nodes |
| Node runtime | Build, SSR, streaming, hydration artifact, and SSG tests on every supported LTS line; rejection test outside the range |
| Constructed sheets | Same-document sharing, cross-document separation, ordering, deduplication, unrelated-sheet preservation, and `@import` diagnostic |
| DSD initial render | Parsed open ShadowRoot and styled screenshot/DOM evidence before hydration and with JavaScript disabled |
| Hydration identity | Host, ShadowRoot, light DOM, and matching owned node identities remain unchanged |
| Style handoff | Manifest/order validation, adopted sheet identity, style-phase rollback, carrier removal on success, and carrier retention plus binding cleanup after hydration failure |
| CSP | Nonce success, hash success, rejected-policy failure, and request-isolated nonce evidence |
| Streaming | Carriers precede dependent content; async boundaries preserve manifest order and request isolation |
| Final invariant | No Gluon `<style>` carrier or fallback remains after successful hydration |
| Early warning | Non-blocking current Node and browser prerelease results retained as CI artifacts |

The compatibility suite must test actual branded products where the support
claim names one. Engine-only substitutions are recorded separately and cannot
replace the release evidence.

## Standards basis

- [CSSOM: `CSSStyleSheet`, `replaceSync()`, and `adoptedStyleSheets`](https://drafts.csswg.org/cssom/#the-cssstylesheet-interface)
- [HTML Standard: the `template` element and Declarative Shadow DOM](https://html.spec.whatwg.org/multipage/scripting.html#the-template-element)
- [HTML Standard: declarative Shadow DOM parsing and serialization](https://html.spec.whatwg.org/multipage/parsing.html)
- [DOM Standard: `attachShadow()`](https://dom.spec.whatwg.org/#dom-element-attachshadow)
- [HTML Standard: style element processing](https://html.spec.whatwg.org/multipage/semantics.html#the-style-element)
- [Content Security Policy Level 3: style directives and nonces](https://w3c.github.io/webappsec-csp/#directive-style-src)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [Chrome for Testing release-channel data](https://github.com/GoogleChromeLabs/chrome-for-testing)
- [Microsoft Edge release schedule](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-release-schedule)
- [Mozilla Firefox release management](https://wiki.mozilla.org/Release_Management)
- [Apple security releases](https://support.apple.com/en-us/100100)

CSSOM defines constructed-sheet mutation and limits adopted sheets to the same
constructor document. HTML defines parser-created declarative ShadowRoots and
style-element processing. DOM specifies that `attachShadow()` clears an existing
same-mode declarative root. CSP defines the policy checks for style elements,
and the Node.js project defines its LTS lifecycle.

The presence of these standards is not compatibility evidence. The release
manifest and tests above establish Gluon's actual support claim.

## Follow-up delivery

- #17 aligns package engines and release metadata with the Node LTS rule.
- #21 implements stable capability and unsupported-environment diagnostics.
- #30 extracts styles and emits browser/server manifest modules.
- #35 implements the Node renderer, request isolation, DSD output, and carriers.
- #36 implements identity-preserving DOM hydration, mismatch recovery, and
  nested abortable progressive streaming.
- #37 implements transactional style handoff, the production manifest,
  streaming/SSG assets, and CSP metadata.
- #38 executes and publishes the browser, device, Node, CSP, accessibility,
  security, performance, and memory evidence.

## Acceptance checklist

- [x] A release-relative supported browser and Node runtime matrix is explicit.
- [x] Required platform capabilities and unsupported targets are explicit.
- [x] Missing capabilities have a stable, testable failure mode.
- [x] The runtime stylesheet invariant and polyfill policy are explicit.
- [x] Build-time extraction and DSD were evaluated and selected.
- [x] Initial SSR styles are compatible with the adopted-only hydrated runtime.
- [x] CSP, streaming, cross-document, and failure semantics are specified.
- [x] Future cross-browser, Node, SSR, and hydration tests derive directly from the contract.
