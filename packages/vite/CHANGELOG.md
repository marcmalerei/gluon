# Changelog

## 0.0.0

- Added the opt-in universal client asset manifest for SSR and static builds.
- Added development and production Gluon transforms with high-resolution
  template source maps and diagnostics.
- Added compatible Custom Element, functional component, Store, and
  constructable stylesheet HMR without full page reloads.
- Preserve `compose()` template locations and the existing compatible
  functional-component HMR identity through the compiler integration.
- Added functional Custom Element setup refresh that preserves registered host,
  explicit local/form state, ShadowRoot, and stylesheet identities.
- Preserve functional `styles` metadata through stable HMR proxies while
  replacing active component CSS in place without changing sheet identity.
- Retain generated UI-starter state, Button DOM, and application-sheet identity
  across compatible consumer and token edits.
