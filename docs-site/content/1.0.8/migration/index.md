# Migration

Gluon is an alternative application platform, not a Vue compatibility layer.
There is no automatic Vue-to-Gluon source converter, production SFC compiler,
compatibility runtime, or migration codemod in version `1.0.8`.

## Automation boundary

Supported automation starts after Gluon source exists:

- `create-gluon` scaffolds maintained Gluon applications;
- `gluon-template-check` and the Language Server validate Gluon templates;
- TypeScript validates public package and component types;
- `@gluonjs/vite` builds and hot-updates supported Gluon modules;
- the Playground packages stable Gluon reproductions.
- `gluon-vue-analyze` statically inventories the bounded Vue 3.5 source surface
  accepted by RFC 0003 and emits reports without executing or changing it.

Only the report-only analyzer reads Vue source. It performs no semantic
conversion. The retained 14-class
[codemod evaluation](./vue-codemod-decision/) records a source-writer no-go:
syntax inventory established behavioral equivalence for `0/14` candidate
classes. A Vue migration remains a manual redesign against Gluon's public
contracts.

[RFC 0003](https://github.com/marcmalerei/gluon/blob/main/docs/rfcs/0003-report-only-vue-migration-analyzer.md)
defines the Node-only analyzer for bounded static Vue 3.5 inventory. Follow the
[analyzer guide](./vue-analyzer/) for the package, CLI, report schema,
diagnostics, exit codes, and safety boundary. RFC 0003 authorizes reports only,
not application execution, compatibility, Gluon source generation, source
rewriting, or a codemod.

For a reversible route from coexistence to full application ownership, follow
the [tested Vue-to-Gluon cutover playbook](./vue-to-gluon-cutover/). It uses the
production GLUON GOODS product configurator below as one continuous case study.

## Vue-to-Gluon concept map

| Vue concept | Gluon contract | Migration work |
| --- | --- | --- |
| `.vue` Single-File Component | TypeScript module plus `html`/`svg` templates | Split script, template, and constructed styles into explicit modules. |
| Vue component instance | `GluonElement` Custom Element or functional render function | Choose a native stateful boundary only where lifecycle and host identity are needed. |
| Props and emits | Declared properties and native `CustomEvent` outputs | Map transport explicitly; structured values use properties. |
| Slots | Native Shadow DOM slots or typed scoped-slot functions | Preserve native light-DOM ownership and fallback behavior. |
| `ref`/`computed`/watchers | `@gluonjs/reactivity` | Rewrite imports and verify scheduling and cleanup ownership. |
| Vue Router | `@gluonjs/router` | Redesign records, guards, lazy routes, and deployment fallback through Gluon APIs. |
| Pinia/Vuex | application-scoped `@gluonjs/store` managers | Replace process-wide live stores with per-app/request managers. |
| `<Teleport>`, `<KeepAlive>`, `<Suspense>` | Gluon rendering built-ins | Re-check cancellation, ownership, cache keys, and server behavior. |
| scoped CSS / `<style>` | `CSSStyleSheet` plus `adoptedStyleSheets` | Remove style-tag fallbacks and define explicit sheet ownership. |

## Interoperability first

Incremental adoption can start by publishing a Gluon Custom Element and hosting
it inside Vue. The maintained fixture uses Vue `3.5.39`,
`@vitejs/plugin-vue` `6.0.7`, and the plugin's
`compilerOptions.isCustomElement` setting for
`gluon-product-configurator`. Vue transfers the structured `product` and
`configuration` values as DOM properties, owns the light-DOM title and facts,
and observes the native `configuration-change` and `add-to-bag` events:

<<< ../../../examples/vue-host.ts

The exact same form-associated element is the production configuration surface
in GLUON GOODS. Browser evidence covers registration and pre-definition
upgrade, property updates, event detail and flags, native named/default slots,
stable identity, disconnect/reconnect cleanup, adopted stylesheets, form
submission/reset/state restore/validation/labels/focus/disabled behavior, and
the configured line item delivered to the bag. The existing ShadowRoot owns
both the product configurator sheet and the usage-derived official Button sheet;
Vue does not adopt or duplicate either sheet. Run the compiled
[Vue host](/gluon/1.0.8/examples/vue.html) or execute:

```sh
npx vitest run tests/vue-migration-interop.spec.ts tests/docs-examples.spec.ts tests/shop-example.spec.ts
npm run build:shop
npm run build:docs-examples
```

This preserves the native element boundary while surrounding routes and state
remain in the existing host. Neither host reaches into the other framework's
store or owns the same DOM subtree. A later application rewrite is a separate
decision.

## Gluon release upgrades

Starting with 1.0, an incompatible public API change requires a major release.
A deprecated API remains for at least the next stable minor and includes an
alternative, migration instructions, changelog entry, and TypeScript metadata
where applicable. Use the [release archive](/gluon/archive/) to select the
documentation matching an installed version.
