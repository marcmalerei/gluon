<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/gluon-hero.jpg" alt="Gluon @gluonjs/quarks — native UI layers growing from a glowing core" width="100%">
</p>

<h1 align="center">Gluon / <code>@gluonjs/quarks</code></h1>
<!-- gluon-package-header:end -->

Typed native-element factories and headless interaction primitives. The package
depends on Core but Core never imports it, so applications that only need the
renderer do not install or bundle UI code.

```ts
import { Dialog, Listbox, createFocusScope, q } from '@gluonjs/quarks';
```

`q.<tag>()`, `quark()`, and `fragment()` preserve native HTML semantics. A
factory never invents a role or accessible name; the caller owns every semantic
requirement of the native element it selects. Void elements reject children.

`QuarkProps<ElementType>` has no general string index signature. It derives
native scalar values and explicit property/boolean bindings from the target DOM
interface and types ARIA, data, class, style, event, and ref bindings. Use
`unsafeQuarkProps()` only for a reviewed platform/vendor key that the typed
contract does not yet contain. The complete component matrix and TypeScript
diagnostic boundary are documented in
[`docs/ui-extensibility.md`](../../docs/ui-extensibility.md).

## Headless accessibility contracts

- `createFocusScope(container, options)` focuses the requested initial target,
  contains Tab and Shift+Tab, and restores a connected trigger on deactivation.
  Call `handleKeydown()` from the owning surface and always call `deactivate()`
  when that surface closes.
- `Overlay` adds no semantic role. Pointer dismissal runs only when the pointer
  target is the overlay itself, so interaction inside its child is preserved.
- `Dialog` requires `label` or `labelledBy`, emits `role="dialog"`, exposes
  `aria-modal`, and supports Escape dismissal when `onDismiss` is supplied. The
  owner composes it with a focus scope and controls background inertness.
- `Popover` uses the native `popover` attribute. Its trigger must use the native
  `popovertarget` relationship and retain an accessible name.
- `Listbox` requires a stable `id` and label. Arrow Up/Down, Home, and End select
  enabled options; disabled options are skipped. The owner persists `onChange`
  and rerenders the controlled `value`.
- `Field` uses an implicit native label. Error text uses `role="alert"`; callers
  must pass the corresponding invalid state to a custom child control.

The exported `quarkManifest` is the machine-readable stable-contract inventory.
Browser behavior is covered in Chromium, Firefox, and WebKit by
`tests/ui-system.spec.ts`. The interactive compiled example is
`docs-site/examples/ui-system.ts`.

The package does not read or mutate `document` at import time. DOM access occurs
only when a caller invokes a focus behavior.

All visible strings and accessible names are caller inputs. The package performs
no locale selection and supports either text direction through native semantics.
