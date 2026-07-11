# `@gluonjs/atoms`

Focused Gluon UI primitives plus shared tokens and themes.

```ts
import { Button, Input, atomStyles, installUiTheme } from '@gluonjs/atoms';
import { adoptStyles, foundationStyles, layerOrderStyles } from '@gluonjs/core';

adoptStyles(document, layerOrderStyles, foundationStyles, atomStyles);
const uninstallTheme = installUiTheme(document, 'light');
```

Style adoption is explicit. `uiTokenStyles`, `lightThemeStyles`, and
`darkThemeStyles` are shared stylesheet instances; `getThemeStyles()` returns
the same instance for repeated requests. Importing the package never changes a
document or shadow root. `installUiTheme()` reference-counts ownership per style
target, so one consumer cannot remove a shared sheet still owned by another.

## Accessibility contracts

- `Button` renders a native `type="button"`, preserves disabled semantics, has
  a 44px minimum target, and receives a visible `:focus-visible` outline.
- `Icon` is `aria-hidden` without a label. With a label it exposes `role="img"`
  and the supplied accessible name.
- `Input` renders a native input and supports `aria-invalid`; use `Label`,
  `Field`, or `FormField` to provide its accessible name.
- `Label` is visible label text. `FormField` places it inside a native label;
  standalone callers must compose it with a native labeling relationship.

Logical CSS properties support both text directions, and the maintained themes
define light/dark contrast and focus tokens. `atomManifest` is the stable
machine-readable inventory. All components appear in the compiled UI example
and the browser/visual evidence named by that manifest.

Atoms contain no translated interface copy; labels and visible strings remain
application inputs so localization stays with the consuming product.
