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

Style adoption is explicit and import-time DOM mutation is prohibited.
`organismManifest` records the stable contract, compiled interactive example,
browser coverage, and visual-regression evidence.
