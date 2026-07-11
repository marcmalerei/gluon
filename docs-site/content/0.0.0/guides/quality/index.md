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
and mobile interaction contracts. They are regression evidence, not a substitute
for reviewing a visible change in the supported browsers.

## Security workflow

Universal rendering never invents a Content Security Policy nonce. A server may
provide a request nonce; the renderer transports it into the exact initial style
and script carriers described by the deployment contract. Request-local apps,
stores, routers, effects, and snapshots are isolated between concurrent renders.

Run the repository security and dependency checks from a clean checkout:

```sh
npm audit --audit-level=moderate
npm run test:ssr
npm run check:packages
```

Review the [deployment reference](/gluon/0.0.0/reference/deployment/) before
changing CSP, asset, or server behavior. Diagnostics and runtime failures remain
visible; production code does not report a successful state after a failed
compile, import, hydration, or render step.
