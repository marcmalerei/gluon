<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/atoms.png" alt="@gluonjs/atoms — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

Focused Gluon UI primitives plus the shared UI installation boundary, tokens,
and themes.

```ts
import { Button, Input, installUi } from '@gluonjs/atoms';

const ui = installUi(document, { theme: 'light' });

ui.setTheme('dark');
ui.dispose();
```

`installUi()` is the one public call for the shared cascade-layer order, Core
foundation, UI tokens, active theme, and target-scoped `styleOwner`. It accepts
a `Document` or `ShadowRoot`, exposes the current typed theme, changes the
target-local theme without replacing its active stylesheet object, and disposes
idempotently. Owners on one target are reference-counted. Existing adopted
sheets retain their relative order, pre-adopted shared sheets are never removed,
and the last owner restores a theme attribute only when Gluon still owns it.

`createUiStyleSelection(theme)` returns the same four named sheets for SSR.
`installUi(target, { theme, hydrate: true })` validates and consumes the matching
`gluon-ui` carriers. Missing, duplicate, reordered, and content/digest-mismatched
carriers throw `UiHydrationError` before target mutation. Importing the package
never changes a document or shadow root, and no browser `<style>` fallback is
provided.

`Button`, `Icon`, `Input`, and `Label` expose immutable `Component.styles`
metadata and have separately tree-shakable sheets. The renderer adopts only the
sheets reachable from its active value tree and releases them with the render
owner. `atomStyles` is deprecated; adopting it with exact rendering throws
`GLUON_LEGACY_COMPONENT_STYLE_CONFLICT` rather than applying duplicate rules.
`installUiTheme()` is deprecated in favor of `installUi()`.

## Concise app Atoms

Use `defineUiAtom()` for small presentational wrappers that would otherwise
repeat prop partitioning, native-tag branching, and stylesheet metadata:

```ts
import { defineUiAtom } from '@gluonjs/atoms';
import { css } from '@gluonjs/core';

interface TextLinkProps {
  readonly href?: string;
  readonly children?: string;
}

export const TextLink = defineUiAtom<TextLinkProps, 'a' | 'span'>({
  displayName: 'TextLink',
  tag: ({ href }) => href ? 'a' : 'span',
  style: {
    id: 'shop-text-link',
    sheet: css`:where(.shop-text-link) { text-underline-offset: 0.2em; }`,
  },
  nativeProps: ({ href, children }, tag) => ({
    class: 'shop-text-link',
    children,
    ...(tag === 'a' ? { href } : {}),
  }),
});
```

The component still returns an ordinary Gluon `TemplateResult`; the selected
tag is rendered by `quark()`, and the optional sheet becomes ordinary immutable
Atom style metadata. For a line-neutral native wrapper, omit `nativeProps` and
all caller props are forwarded in one object.

During an incremental migration, `{ loose: true }` additionally accepts legacy
`slot.content`; normal `children` wins if both are supplied. Strict mode rejects
`slot.content` instead of forwarding it as an accidental DOM attribute.
`defineUiAtom()` is for stateless presentational Atoms only. Use `defineAtom()`
and `q.*()` when a component needs several native nodes or precise prop
partitioning, `defineMolecule()`/`defineOrganism()` for larger composition, and
`defineGluonElement()` for state or lifecycle ownership.

`create-gluon --ui` is the maintained application-owner example for this
contract. It retains the `UiOwner` for the application lifetime, keeps its
`--starter-*` tokens in a separate application sheet, maps only
`.starter-action` to the public Button override properties, and relies on
`Button.styles` for exact usage-driven adoption. It does not add a blanket
native `button` rule or adopt `atomStyles`.

## Accessibility contracts

- `Button` renders a native `type="button"`, preserves disabled semantics, has
  a 44px minimum target, and receives a visible `:focus-visible` outline.
- `Icon` is `aria-hidden` without a label. With a label it exposes `role="img"`
  and the supplied accessible name.
- `Input` renders a native input and supports `aria-invalid`; use `Label`,
  `Field`, or `FormField` to provide its accessible name.
- `Label` is visible label text. `FormField` places it inside a native label;
  standalone callers must compose it with a native labeling relationship.

Every compatible Atom uses the named `attributes` extension contract. Use
`defineButtonPreset()` for app-owned brand/danger classes and analytics/ref/data
bindings while `ButtonVariant` and `ButtonSize` remain closed. Use
`defineIcon()` plus `Icon({ icon })` for app-owned SVG geometry; Icon continues
to own decorative/informative ARIA semantics. `defineIcon()` rejects empty
metadata and bodies not created by Core's `svg` template tag. Official
`.gluon-*` classes are
implementation details. The public Button override properties are
`--gluon-button-background`, `--gluon-button-color`, and
`--gluon-button-border-color`; shared public tokens retain their documented
`--gluon-*` names. See the
[extension matrix](../../docs/ui-extensibility.md).

Logical CSS properties support both text directions, and the maintained themes
define light/dark contrast and focus tokens. `atomManifest` is the stable
machine-readable inventory. All components appear in the compiled UI example
and the browser/visual evidence named by that manifest.

Atoms contain no translated interface copy; labels and visible strings remain
application inputs so localization stays with the consuming product.

GLUON GOODS is the production dogfood surface: its public Button presets cover
global navigation, dialogs, product add/retry, and bag quantity/remove actions;
catalog search uses `Input`. The application supplies only documented public
tokens/classes and owns the shared/exact sheets through one `UiOwner` lifecycle.
