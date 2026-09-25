<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/quarks.png" alt="@gluonjs/quarks — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

# @gluonjs/quarks

Typed native-element factories and headless interaction primitives. The package
depends on Core but Core never imports it, so applications that only need the
renderer do not install or bundle UI code.

<!-- gluon-package-overview:start -->
## @gluonjs/quarks at a glance

**Runtime:** browser · **Release:** 1.13.0

[Documentation guide](https://marcmalerei.github.io/gluon/latest/packages/quarks/) · [npm](https://www.npmjs.com/package/@gluonjs/quarks) · [Source](https://github.com/marcmalerei/gluon/blob/main/packages/quarks/README.md)

**Public API:** [`@gluonjs/quarks`](https://marcmalerei.github.io/gluon/1.13.0/api/generated/packages/quarks/src/)

### Install

```sh
npm install @gluonjs/quarks
```

### Quick start

```ts
import { Dialog, Listbox, createFocusScope, q } from '@gluonjs/quarks';
```

### Choose this package when

- Factory helpers for native elements and headless behavior primitives.
- Semantic building blocks without inventing roles or names.
- Low-level interaction helpers for higher UI packages.

**Choose another boundary when:**

- Does not create accessibility semantics on behalf of callers.
- Callers remain responsible for roles, names, and labels.

### Related documentation

- [Components](https://marcmalerei.github.io/gluon/latest/guides/components/)
- [Accessibility](https://marcmalerei.github.io/gluon/latest/reference/support-matrix/)

<!-- gluon-package-overview:end -->

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

For stable, safe option-key shapes, a Quark factory caches a bounded explicit
binding template per factory and sends class, style, data, ARIA, property,
boolean, event, ref, URL, and child values to their dedicated Core Parts. This
avoids repeating generic spread-key classification during commit while keeping
open or unsupported prop bags on the generic spread path. Shape transitions
remain correct but are not treated as stable template updates, so callers that
need identity across changing key sets should keep the option-key set stable.

Quark factories do not add generic `gluon` or `quark` classes. Supply a
component-specific class when styling a native element; headless primitives
retain only their documented component classes such as `gluon-overlay`.

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
