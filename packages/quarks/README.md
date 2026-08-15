<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/quarks.png" alt="@gluonjs/quarks — Gluon package header" width="100%">
</p>
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
`q.textarea()` maps primitive `children` to the native `defaultValue` property
because HTML parses textarea contents as raw text; use `.value` for controlled
content. Template, Node, directive, and collection children are rejected.
Direct template child interpolation inside raw-text and RCDATA elements
(`textarea`, `title`, `script`, and `style`) is rejected with a runtime error
that points to the supported complete binding form.

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
- `Tooltip` and `HoverCard` are separate request-free anchored contracts.
  Tooltip is a non-interactive `role="tooltip"` description. HoverCard is a
  labelled, focusable `role="dialog"` surface. Their typed `trigger` renderer
  receives the ARIA, event, id, data, and ref properties that must be spread
  onto the actual native trigger; a wrapper is never presented as the control.

```ts
import { HoverCard, Tooltip, q } from '@gluonjs/quarks';

const help = Tooltip({
  id: 'delivery-help',
  trigger: ({ aria, ...owned }) => q.button({
    ...owned,
    aria: { ...aria, label: 'How delivery timing works' },
    type: 'button',
    children: 'Delivery details',
  }),
  content: 'Timing is confirmed for the configured item.',
  placement: 'block-end',
  delay: 300,
  contentAttributes: { class: 'delivery-tooltip' },
});

const details = HoverCard({
  id: 'maker-details',
  label: 'Maker details',
  trigger: (owned) => q.button({ ...owned, type: 'button', children: 'Maker' }),
  content: q.a({ href: '/makers/ada', children: 'Read the maker profile' }),
});
```

Mouse hover honors `delay`; focus opens without moving focus; touch pointerdown
and click form one deterministic toggle. Tooltip content is not a focus target
and must not contain interactive descendants. HoverCard content can be entered
with Arrow Down or Enter, or by ordinary pointer interaction. Escape closes the
topmost overlay and restores its trigger when focus was inside the HoverCard.
Document outside-interaction listeners, resize/scroll listeners,
`ResizeObserver`, and timers exist only while needed and are removed on close
or unmount. Reduced-motion preference removes the opening delay.

`placement` accepts `block-start`, `block-end`, `inline-start`, or `inline-end`.
The opposite main-axis side is selected on collision and both viewport axes are
clamped to an 8px edge. Logical inline placement follows the trigger's computed
direction. The contract owns inline `position`, `inset`, `margin`, `left`,
`top`, and the Tooltip's non-interactive `pointer-events`; consumers style appearance through `contentAttributes.class` and
constructable stylesheets. `hostAttributes` and `contentAttributes` are
separate, and owned semantics, behavior, ref, visibility, and position fields
throw when supplied through the wrong extension point. IDs are unique per live
document and use the HTML-safe `[A-Za-z][A-Za-z0-9_-]*` subset.
- `Listbox` requires a stable `id` and label. Arrow Up/Down, Home, and End select
  enabled options; disabled options are skipped. The owner persists `onChange`
  and rerenders the controlled `value`.
- `Field` uses an implicit native label. Error text uses `role="alert"`; callers
  must pass the corresponding invalid state to a custom child control.

The exported `quarkManifest` is the machine-readable stable-contract inventory.
Browser behavior is covered in Chromium, Firefox, and WebKit by
`tests/ui-system.spec.ts`. The interactive compiled example is
`docs-site/examples/ui-system.ts`.

The package does not read or mutate `document` at import or SSR construction
time. Anchored overlays install browser ownership only after a rendered trigger
opens and release it on close or removal.

All visible strings and accessible names are caller inputs. The package performs
no locale selection and supports either text direction through native semantics.
