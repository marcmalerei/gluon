# RFC 0004: Template-native functional-component composition

- **Status:** Accepted
- **Decision date:** 2026-07-12
- **Tracking issue:** [#111](https://github.com/marcmalerei/gluon/issues/111)
- **Parent:** [#107](https://github.com/marcmalerei/gluon/issues/107)
- **Depends on:** [RFC 0002](0002-unified-component-model.md)
- **Supersedes:** Nothing

## Decision

Gluon adds one optional public authoring helper:

```ts
compose(AppShell, { header, navigation })`
  ${compose(Card, { title: 'Delivery', actions })`
    <label>Email <input name="email" type="email" required></label>
  `}
`;
```

`compose(component, props)` returns a standard JavaScript tagged-template
function. The body is created with the existing public `html()` API and passed
to `component({ ...props, children: body })`. This is exactly one ordinary
functional-component call. The helper creates no component instance, host,
lifecycle, context, event system, renderer, file format, or serialization
format. Components remain importable functions and direct calls remain valid.

`CompositionProps<Props>` removes only `children` from the supplied object.
Required and optional props, callback parameter types, excess properties, and
whether the component accepts `TemplateValue` children are therefore checked by
TypeScript at the `compose()` call. Named content and scoped content remain
typed props. The body is an ordinary `html` template, so native elements,
callbacks, spreads, `model()`, refs, conditionals, `repeat()`, and `Suspense()`
retain their existing contracts.

## Compared alternatives

The retained checkout and confirmation-dialog fixtures live under
`benchmarks/dx/template-composition`. Each contains the observables Checkout,
Delivery, Confirm order, Email, Place order, and Close.

| Alternative | Example boundary | Decision |
| --- | --- | --- |
| Current calls | `Shell({ ..., children: Panel({ ..., children: html\`…\` }) })` | Retained and supported; repeated object properties obscure the visual body boundary. |
| Tagged component body | `compose(Shell, props)\`${compose(Panel, props)\`…\`}\`` | Accepted. It is valid TypeScript, uses the existing HTML template direction, and preserves stock TypeScript expression tooling. |
| Interpolated component tags | `html\`<${Shell}>…</${Shell}>\`` | Rejected. TypeScript cannot assign tag attributes to a component props type without a virtual-language transform, and the HTML parser cannot own this syntax directly. |
| `component` blocks | `component Shell(props) { component Panel(props) { html\`…\` } }` | Rejected. This adds proprietary JavaScript grammar and requires a separate parser/formatter boundary. |

The two rejected versions are retained in `alternatives/` against the same
checkout/dialog content. JSX-only and Vue SFC-only designs remain non-goals.

## Compiler and editor contract

The compiler recognizes aliased `compose()` tags as template boundaries. It
records the original body and interpolation locations, runs the existing inline
style diagnostic, and emits the source unchanged in production. Its
high-resolution source map continues to name the author file and content.
This is a versioned additive Core API amendment, not a renderer amendment.

The Gluon language server recognizes the same aliased boundary for native-tag
diagnostics, completion, hover, semantic tokens, and source locations.
TypeScript remains authoritative for the component symbol, props, callback
types, completion, hover, definition, and rename; the maintained VS Code client
runs beside the built-in TypeScript language service. Because the source is a
`.ts`/`.js` template literal, the TypeScript formatter owns the outer call and
literal boundary; Gluon preserves body whitespace and does not rewrite it.

## Runtime compatibility

The result of `compose()` is the direct component result, so CSR, SSR,
streaming, hydration, static generation, Devtools, and test utilities receive
the same public `TemplateValue` and observable DOM/component tree as direct
calls. HMR sees the same imported/exported function identities. Compatible
function/template edits retain the existing owner state. The existing reload
boundary still applies to incompatible Custom Element tag, superclass, form
association, initialization, schema, or stylesheet-count changes.

## Evidence and limitations

`npm run check:template-composition` typechecks the Gluon and React fixtures,
runs `vue-tsc` over the Vue fixtures, parses the Vue SFC, verifies fixture
observable parity, checks committed line/token/indentation/children metrics,
and proves compiler/source-map recognition. Core type tests retain missing,
invalid, callback, content, and excess-prop failures at the call site. Browser,
SSR, Vite/compiler, language-server, generated-starter, Playground, shop, and
full quality suites cover their respective boundaries.

No human participant tested these fixtures during this issue. Participant
count is therefore zero and there are no human usability findings. The metric
report makes no general readability or DX-superiority claim. It proves the
narrow result that the accepted fixture removes both call-site `children:`
properties while keeping the surrounding TypeScript/HTML contracts.
