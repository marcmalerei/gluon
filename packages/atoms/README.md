<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/atoms.png" alt="@gluonjs/atoms — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

Focused Gluon UI primitives plus the shared UI installation boundary, tokens,
and themes.

```ts
import { Button, Checkbox, Input, Select, Textarea, installUi } from '@gluonjs/atoms';

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

`Button`, `Checkbox`, `Icon`, `Input`, `Label`, `Progress`, `Radio`, `Select`,
`StatusBadge`, `Switch`, `Textarea`, and `ToggleButton` expose immutable `Component.styles`
metadata and have separately tree-shakable sheets. The renderer adopts only the
sheets reachable from its active value tree and releases them with the render
owner. Nested composition stays on that same path, so a public Molecule that
calls `Radio()` directly still contributes the exact `radioStyles` sheet before
the first measurable render and through hydration. `atomStyles` is deprecated; adopting it with exact rendering throws
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
- `Checkbox` preserves native Space-key, label, form, reset, required,
  disabled, checked, and indeterminate behavior. Indeterminate remains a DOM
  presentation state and does not create a third submitted form value.
- `Icon` is `aria-hidden` without a label. With a label it exposes `role="img"`
  and the supplied accessible name.
- `Input` renders a native input and supports `aria-invalid`; use `Label`,
  `Field`, or `FormField` to provide its accessible name.
- `Label` is visible label text. `FormField` places it inside a native label;
  standalone callers must compose it with a native labeling relationship.
- `Progress` preserves native determinate `value`/`max` semantics and omits the
  `value` attribute for indeterminate work. Give every instance an accessible
  name through `attributes` or a native labeling relationship.
- `Radio` preserves native same-name grouping, Arrow/Space keyboard, label,
  form, required, checked, and disabled behavior. Place related controls in a
  labeled `fieldset` or compose them with `ChoiceGroup`.
- `Select` preserves native option, keyboard, disabled, and required semantics;
  compose it with `Label` or another native labeling relationship. Its public
  sizes are `small`, `medium`, and `large`, and `fullWidth` is opt-in.
- `StatusBadge` is a presentational span. It owns only neutral, info, success,
  warning, or danger tone styling; applications own domain mapping, translated
  status copy, and whether a surrounding surface is a live region. Its default
  presentation stays on one line and bounds pathological tokens with an ellipsis
  instead of breaking short labels mid-word. When a product genuinely needs a
  multiline badge, apply that behavior in the consuming surface rather than by
  changing the atom contract.
- `Switch` is a native checkbox with `role="switch"` for binary on/off settings.
  Keep its caller-owned accessible label stable when the checked state changes.
- `Textarea` preserves native multiline editing, selection, resize, form,
  disabled, readonly, and required semantics. Associate it with visible label
  text and use `invalid` only with useful validation copy.
- `ToggleButton` is a native Button with a required caller-controlled boolean
  `pressed` value reflected as `aria-pressed`. Use it for an independent pressed
  choice, not for an on/off setting (`Switch`) or an ordinary action (`Button`).

Every compatible Atom uses the named `attributes` extension contract. Use
`defineButtonPreset()` for app-owned brand/danger classes and analytics/ref/data
bindings while `ButtonVariant` and `ButtonSize` remain closed. Use
`defineIcon()` plus `Icon({ icon })` for app-owned SVG geometry; Icon continues
to own decorative/informative ARIA semantics. `defineIcon()` rejects empty
metadata and bodies not created by Core's `svg` template tag. Official
`.gluon-*` classes are
implementation details. The public Button override properties are
`--gluon-button-background`, `--gluon-button-color`, and
`--gluon-button-border-color`. Select exposes `--gluon-select-background`,
`--gluon-select-color`, and `--gluon-select-border-color`. Textarea exposes
`--gluon-textarea-background`,
`--gluon-textarea-color`, `--gluon-textarea-border-color`,
`--gluon-textarea-readonly-background`, and `--gluon-textarea-resize`.
Checkbox exposes `--gluon-checkbox-accent`; Radio exposes
`--gluon-radio-accent`. Switch exposes `--gluon-switch-track`,
`--gluon-switch-on`, `--gluon-switch-thumb`, and
`--gluon-switch-border-color`. ToggleButton exposes
`--gluon-toggle-button-pressed-background`,
`--gluon-toggle-button-pressed-color`, and
`--gluon-toggle-button-pressed-border-color`. Progress exposes
`--gluon-progress-track`, `--gluon-progress-value`,
`--gluon-progress-track-border`, `--gluon-progress-width`, and
`--gluon-progress-height`. StatusBadge exposes
`--gluon-status-badge-background`, `--gluon-status-badge-color`, and
`--gluon-status-badge-border`. Shared public tokens retain their documented
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
catalog search uses `Input`, catalog sorting uses the native `Select`, and
checkout delivery instructions use `Textarea`; checkout consent uses
`Checkbox`; product configuration uses native `Radio` groups; async inventory
feedback uses indeterminate `Progress`. The application supplies only
documented public tokens/classes; completed inventory feedback uses
`StatusBadge` with application-owned availability-to-tone mapping. The app owns
the shared and exact sheets through one `UiOwner` lifecycle.
