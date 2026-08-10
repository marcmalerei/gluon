<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/molecules.png" alt="@gluonjs/molecules — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

Reusable compositions built only from Core, Quarks, and Atoms.

```ts
import { Card, ChoiceGroup, ControlField, FormField, NavigationStrip } from '@gluonjs/molecules';
```

`Card` renders a native article. Its optional title is an `h3`; callers must
place cards under a compatible heading hierarchy. `FormField` uses implicit
native label association. An error sets the child input's `aria-invalid` state
and exposes a visible `role="alert"`; helper text is visible supplementary copy.
`ControlField` generalizes that composition for any caller-rendered control. Its
render callback receives stable control/label/helper/error IDs and matching ARIA
relationships without cloning the control or owning its value, events, or
validation. Pass the returned IDs/ARIA metadata to the official Atom or native
control and forward `required`/`invalid` when that control supports them.
`ChoiceGroup` renders a native fieldset and visible legend around caller-owned
Checkbox or Radio options. It provides helper/error relationships, disabled
fieldset propagation, and horizontal or vertical layout without taking option
values, checked state, validation decisions, copy, or keyboard behavior away
from the native controls.
`NavigationStrip` renders a named native `nav`, keeps destinations in source
and Tab order, and shows 44px previous/next controls only when its viewport
overflows. Resize and content changes update the available directions, while
the exact `[aria-current]` destination is revealed without moving focus. A
focused edge control remains focusable with `aria-disabled="true"` until focus
moves, then returns to native disabled behavior.

```ts
NavigationStrip({
  label: 'Project sections',
  children: [
    q.a({ href: '#overview', children: 'Overview' }),
    q.a({ href: '#activity', 'aria-current': 'page', children: 'Activity' }),
    q.a({ href: '#settings', children: 'Settings' }),
  ],
});
```

Styles use logical properties and shared Atom token names. `Card`, `ChoiceGroup`,
`ControlField`, and `FormField` carry separate immutable stylesheet dependencies;
`NavigationStrip` carries its own layout/control sheet, and `FormField` collects
its nested `Label` and `Input` sheets through ordinary renderer traversal.
Install the shared foundation and theme once through `installUi()`. The
deprecated `moleculeStyles` aggregate remains the legacy Card/FormField sheet
and cannot coexist silently with their exact rendering.
`moleculeManifest` records every stable component, its accessibility contract,
interactive example, browser test, and visual-regression evidence.

Applications can set `--gluon-navigation-strip-gap`,
`--gluon-navigation-strip-control-background`,
`--gluon-navigation-strip-control-border-color`, and
`--gluon-navigation-strip-control-color` on the root through
`attributes.class` or `attributes.style` without targeting implementation
classes.
ControlField exposes `--gluon-control-field-required-color`,
`--gluon-control-field-helper-color`, and `--gluon-control-field-error-color`.
ChoiceGroup exposes `--gluon-choice-group-gap`,
`--gluon-choice-group-helper-color`, and `--gluon-choice-group-error-color`.

`Card.attributes` extends its native article. `ControlField.attributes` extends
its outer div while structural content stays explicit. `FormField.attributes` extends
the composed Input and `FormField.fieldAttributes` extends the outer native
label. Both exclude owned children so callers cannot silently replace baseline
composition. `NavigationStrip.attributes` extends its native navigation
landmark while its internal viewport and controls stay owned. App-local
Molecules use the public `defineMolecule()` metadata helper described in the
[extension contract](../../docs/ui-extensibility.md).

GLUON GOODS repeats `FormField` for its five required delivery inputs, uses
`ControlField` for optional delivery instructions with deterministic help, and uses
an app-local `PurchaseAction` defined with `defineMolecule()` in the same real
checkout form. Product configuration uses three `ChoiceGroup` fieldsets with
native Radio options. Its catalog filter uses `NavigationStrip` to keep every category
discoverable at constrained widths. Browser tests verify implicit labels,
native constraint validation, overflow interaction, SSR/hydration styles, and
teardown.
