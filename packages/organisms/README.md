# `@gluonjs/organisms`

Larger Gluon interface structures. The package is optional and depends only
downward on Core, Quarks, Atoms, and Molecules.

```ts
import { AppShell, organismStyles } from '@gluonjs/organisms';
```

`AppShell` emits native `header`, `nav`, `main`, and `footer` landmarks only for
content the caller supplies. When a page has multiple navigation landmarks, the
caller must give the supplied navigation content a distinct accessible name.
Its layout uses logical dimensions and collapses to one column below 48rem.

Install the shared foundation and theme once through `installUi()` from
`@gluonjs/atoms`. Style adoption remains explicit and import-time DOM mutation
is prohibited; the aggregate `organismStyles` export is the compatibility path
until #115 connects exact rendered component sheets to the UI owner.
`organismManifest` records the stable contract, compiled interactive example,
browser coverage, and visual-regression evidence.

`AppShell.attributes` extends its outer native div while its landmark children
remain owned by explicit props. App-local Organisms use the public
`defineOrganism()` metadata helper; it adds no lifecycle, registration,
styling, validation, or cleanup behavior. See the complete
[extension contract](../../docs/ui-extensibility.md).
