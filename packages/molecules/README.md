# `@gluonjs/molecules`

Reusable compositions built only from Core, Quarks, and Atoms.

```ts
import { Card, FormField, moleculeStyles } from '@gluonjs/molecules';
```

`Card` renders a native article. Its optional title is an `h3`; callers must
place cards under a compatible heading hierarchy. `FormField` uses implicit
native label association. An error sets the child input's `aria-invalid` state
and exposes a visible `role="alert"`; helper text is visible supplementary copy.

Styles use logical properties and the shared Atom token names. Adoption is
explicit through Core `adoptStyles()`, with no import-time DOM mutation.
`moleculeManifest` records every stable component, its accessibility contract,
interactive example, browser test, and visual-regression evidence.
