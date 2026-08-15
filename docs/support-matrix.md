# Gluon support matrix

This matrix states what Gluon verifies and what it deliberately does not claim.
It is a compatibility boundary, not a promise that every package exercises
every platform feature in every environment.

The current lockstep package line is **1.9.0**. Package membership and version
ownership come from [`package-contract.json`](../package-contract.json); this
page names every current official package so omissions fail the repository
support-matrix check.

## Runtime and browser engines

| Surface | Verified baseline | Support statement | Evidence |
| --- | --- | --- | --- |
| Node packages and SSR | Node `^22.12.0 || ^24.0.0` | The published package engines are the supported Node range. DOM-free Router, Store, SSR, compiler, language-server, and API suites run without a browser global. | `package.json`, Node 22/24 CI, `tests-node/` |
| Chromium browser lane | Playwright Chromium | Browser behavior is verified in the maintained Chromium lane. No branded Chrome version, OS, or device guarantee is implied. | `.github/workflows/ci.yml`, browser CI |
| Firefox browser lane | Playwright Firefox | Browser behavior is verified in the maintained Firefox lane. No branded Firefox version, OS, or device guarantee is implied. | `.github/workflows/ci.yml`, browser CI |
| WebKit browser lane | Playwright WebKit | Browser behavior is verified in the maintained WebKit lane. This is not a claim for every Safari release or Apple device. | `.github/workflows/ci.yml`, browser CI |
| Browser styling baseline | Constructable `CSSStyleSheet`, `replaceSync()`, and `adoptedStyleSheets` | Gluon browser styling requires the native stylesheet APIs. Unsupported environments receive the documented explicit capability error; there is no `<style>` fallback path. | `docs/adrs/0001-browser-runtime-and-style-transport.md`, `tests/styles-and-element.spec.ts` |
| Progressive platform APIs | Observers, declarative Shadow DOM, and native form/Custom Element APIs where used | Features either use their documented progressive fallback or fail at the owning boundary. An individual API's presence does not expand the package support claim. | package READMEs and focused browser suites |

## Accessibility and responsive behavior

| Area | Verified | Claim boundary |
| --- | --- | --- |
| Automated rules | axe-core WCAG 2 A/AA, 2.1 AA, and 2.2 AA rules on GLUON GOODS and the stable UI composition in all three browser lanes | Automated rules do not establish reading order, useful announcements, speech output, or assistive-technology interoperability. |
| Keyboard and focus | Native control semantics, focus visibility, dialog containment/return, navigation, configuration, bag, and checkout flows | The matrix records browser automation evidence; it does not claim a manual screen-reader certification. |
| Reduced motion | `prefers-reduced-motion` behavior in customer-flow and component evidence | Applications may add their own motion; Gluon only guarantees the documented component and shop behavior. |
| Forced colors and contrast | Component accessibility/visual gates and native semantic controls | No color-theme or operating-system-specific guarantee is made beyond the checked evidence. |
| Small screens | Shop acceptance at 390px and 320px with 44px minimum actions | This is a responsive regression boundary, not a device compatibility list. |
| Assistive technology | No branded AT support claim | VoiceOver, NVDA, TalkBack, braille output, and real mobile Safari/Chrome require a separately recorded manual matrix before being claimed. |

## Package-specific boundaries

| Package/surface | Supported contract | Explicit non-goal or prerequisite |
| --- | --- | --- |
| `@gluonjs/core`, `@gluonjs/atoms`, `@gluonjs/molecules`, `@gluonjs/organisms` | Native Custom Elements/templates, constructable styles, semantic controls, the public UI contracts, and opt-in Trusted Types parser handoff under the tested Chromium enforcement page | No framework-specific runtime, branded-browser, sanitizer, or cross-browser Trusted Types claim. |
| `@gluonjs/router` | Browser/hash/memory histories, typed locations, static route data, URL query state, guards, and request-free navigation | Transport, authentication, caching, persistence, and domain requests belong to the application/Store. |
| `@gluonjs/store` | Request/application isolation, JSON-safe snapshots, persistence plugins, and hydration contracts | No server, database, auth, or cross-request singleton ownership. |
| `@gluonjs/ssr` | DOM-free Node serialization, request-local cleanup, progressive streaming, browser hydration handoff, and explicit Trusted Types-compatible parser handoff on opt-in application configuration | Hydration requires the documented declarative Shadow DOM/style transport. It is not a browser renderer. |
| `@gluonjs/json-forms` | Typed native fields for the documented JSON Schema subset, including nested objects and bounded arrays | Unsupported schema keywords fail explicitly; arbitrary JSON Schema, file widgets, and conditional/composed schemas are not supported by default. |
| `@gluonjs/i18n` | JSON-safe messages, ordered locale fallbacks, `Intl` formatting, plural/select interpolation, lazy namespaces, and SSR state transfer | Message loading, translation content, locale choice, and language-switch product UX remain application-owned. |
| `@gluonjs/graph` | Deterministic canvas graph for a few hundred nodes plus a synchronized semantic keyboard node list | It is not a large-graph editor, layout persistence system, or assistive-technology replacement for domain-specific graph views. |
| `@gluonjs/devtools` / `@gluonjs/devtools-api` | Opt-in development bridge, immutable protocol handshake, snapshots, ordered timeline, and redacted source-location metadata | Production is disabled by default; no browser-extension or remote-inspection security claim exists, and source labels are basename-redacted with bounded line/column data only. |
| `@gluonjs/language-server` and VS Code client | Node LSP/CLI and version-matched stdio VS Code client with the checked VSIX contract | Marketplace publication, publisher account, editor version breadth, and bundled server distribution require separate release evidence. |

## Official package coverage

| Package | Contract boundary |
| --- | --- |
| `@gluonjs/reactivity` | Universal reactive refs, effects, observers, and signal bridges; external signal implementations remain optional peers. |
| `@gluonjs/compiler` | Static template/SFC compilation and public diagnostics; it does not execute application code. |
| `@gluonjs/core` | Browser renderer, application runtime, Custom Elements, templates, and adopted styles. |
| `@gluonjs/router` | Browser/hash/memory navigation, route data, query state, guards, and links. |
| `@gluonjs/store` | Isolated store managers, snapshots, persistence plugins, and hydration. |
| `@gluonjs/i18n` | Optional JSON-safe translation, locale fallback, `Intl`, namespaces, and SSR transfer. |
| `@gluonjs/ssr` | Node serialization, request ownership, progressive streaming, hydration transport, and opt-in Trusted Types parser handoff. |
| `@gluonjs/vite` | Vite source maps, diagnostics, HMR, and public package resolution. |
| `@gluonjs/gluon-components-vite` | Native Gluon Storybook/Vite renderer and component-library integration. |
| `@gluonjs/test-utils` | Browser and SSR fixture/test ownership; it is not a production runtime. |
| `@gluonjs/devtools-api` | Environment-neutral versioned Devtools protocol and JSON-safe records. |
| `@gluonjs/devtools` | Opt-in browser bridge, inspector, and development-only Vite virtual module. |
| `@gluonjs/graph` | Deterministic network canvas plus semantic keyboard node list for bounded graphs. |
| `@gluonjs/language-server` | Node LSP server, static project analyzer, and template-check CLI. |
| `@gluonjs/vue-migration-analyzer` | Report-only Vue source inventory and migration evidence; no runtime codemod claim. |
| `@gluonjs/quarks` | Headless interaction ownership, focus scopes, loaders, and component-library manifests. |
| `@gluonjs/atoms` | Native-backed accessible controls and exact stylesheet ownership. |
| `@gluonjs/molecules` | Semantic composition, focus, dialogs, disclosure, overflow, and field relationships. |
| `@gluonjs/organisms` | Higher-level reusable UI compositions with caller-owned domain state. |
| `@gluonjs/json-forms` | Documented JSON Schema/UI-schema subset through native form controls. |
| `create-gluon` | Starter generation, feature selection, package linking, and clean-install evidence. |

## How to read a support result

“Verified” means the named repository test or build gate passed for the stated
surface. “Supported” means the public contract and runtime prerequisites are
documented here. A missing row is not an implied fallback. Before adding a new
claim, add an isolated test/evidence path, state the exact platform/version
scope, and update this matrix in the same change.

## Evidence limits

The matrix intentionally does not claim:

- a branded browser, operating system, device, or assistive technology;
- general performance superiority or a universal bundle-size guarantee;
- cross-browser Trusted Types enforcement compatibility;
- Marketplace distribution of the VS Code client;
- security of arbitrary remote Devtools connections.

These require separate reproducible evidence and an explicit product decision.
