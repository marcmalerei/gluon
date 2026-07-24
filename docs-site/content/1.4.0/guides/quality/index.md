# Quality, accessibility, and security

Gluon's release evidence is executable. The repository check covers public
types, Node behavior, browser behavior, production builds, documentation, and
package archives. The CI browser matrix runs the complete GLUON GOODS acceptance
flow in Chromium, Firefox, and WebKit.

## Accessibility workflow

Application markup uses semantic landmarks and native controls. Interactive
targets have visible focus, dialogs own focus while open, reduced-motion media
queries disable nonessential movement, and mobile targets remain at least 44px.
Run the shop browser suite at desktop, 390px, and 320px widths when a visible
customer flow changes:

```sh
GLUON_BROWSER=chromium npx vitest run tests/shop-example.spec.ts
```

The browser assertions verify the maintained keyboard, dialog, alternative-text,
and mobile interaction contracts. They are automated engine regression evidence,
not branded-browser, operating-system, device, or assistive-technology support
evidence.

The stable UI composition also has per-engine screenshot references. When a
browser-matrix job fails that comparison, CI retains the Vitest actual and diff
images for seven days in a `browser-differences-<engine>-<commit>` artifact.
Review those images before accepting a new reference or changing the allowed
pixel difference.

## Component-library and performance evidence

The component-library gate packs the real library, installs it with local Gluon
release archives in an empty consumer, typechecks and production-builds it, and
verifies interaction plus teardown in Chromium. A separate loader build proves
that only requested entry chunks and styles are loaded, while the Storybook
gate retains interaction, accessibility, and visual evidence for the picker and
loading, cached, and failed loader states.

```sh
npm run check:component-library-clean-install
npm run check:component-library-loader-build
npm run check:storybook:component-library
npm run benchmark:bundle
npm run benchmark:components
npm run benchmark:runtime
```

Bundle and performance reports retain raw samples, exact package/browser
versions, source identity, environment metadata, and observable parity. They
state results per workload and engine; they do not establish a universal
framework ranking.

## Security workflow

Universal rendering never invents a Content Security Policy nonce. A server may
provide a request nonce; the renderer transports it into the exact initial style
carriers described by the deployment contract. Module scripts remain external
asset URLs under the application's policy. Request-local apps,
stores, routers, effects, and snapshots are isolated between concurrent renders.

Run the repository security and dependency checks from a clean checkout:

```sh
npm audit --audit-level=moderate
npm run test:ssr
npm run check:packages
npm run test:vue-analyzer
npm run check:vue-analyzer-fixtures
npm run test:property-fuzz
npm run check:security
npm run check:shop-performance
```

Review the [deployment reference](/gluon/1.4.0/reference/deployment/) before
changing CSP, asset, or server behavior. Diagnostics and runtime failures remain
visible; production code does not report a successful state after a failed
compile, import, hydration, or render step.

The report-only Vue analyzer treats source, SFCs, tests, and Vite configuration
as untrusted inert input. Its adversarial fixtures fail if any project code is
executed, and its fixed path/resource limits plus schema validation are part of
the repository check. See the [analyzer guide](/gluon/1.4.0/migration/vue-analyzer/).

The repository [security threat model](https://github.com/marcmalerei/gluon/blob/main/docs/security.md),
[accessibility protocol](https://github.com/marcmalerei/gluon/blob/main/docs/accessibility.md),
and [browser/device protocol](https://github.com/marcmalerei/gluon/blob/main/docs/browser-device-evidence.md)
define the automated 1.0 boundary and the manual evidence required before any
future branded-product or assistive-technology support claim.
