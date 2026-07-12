# `@gluonjs/molecules`

Reusable compositions built only from Core, Quarks, and Atoms.

```ts
import { Card, FormField } from '@gluonjs/molecules';
```

`Card` renders a native article. Its optional title is an `h3`; callers must
place cards under a compatible heading hierarchy. `FormField` uses implicit
native label association. An error sets the child input's `aria-invalid` state
and exposes a visible `role="alert"`; helper text is visible supplementary copy.

Styles use logical properties and shared Atom token names. `Card` and
`FormField` carry separate immutable stylesheet dependencies; `FormField`
collects its nested `Label` and `Input` sheets through ordinary renderer
traversal. Install the shared foundation and theme once through `installUi()`.
The deprecated `moleculeStyles` aggregate cannot coexist silently with exact
rendering.
`moleculeManifest` records every stable component, its accessibility contract,
interactive example, browser test, and visual-regression evidence.

`Card.attributes` extends its native article. `FormField.attributes` extends
the composed Input and `FormField.fieldAttributes` extends the outer native
label. Both exclude owned children so callers cannot silently replace baseline
composition. App-local Molecules use the public `defineMolecule()` metadata
helper described in the [extension contract](../../docs/ui-extensibility.md).

GLUON GOODS repeats `FormField` for its five required delivery inputs and uses
an app-local `PurchaseAction` defined with `defineMolecule()` in the same real
checkout form. Browser tests verify implicit labels, native constraint
validation, interaction, SSR/hydration styles, and teardown.
