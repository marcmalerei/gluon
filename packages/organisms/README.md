<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/organisms.png" alt="@gluonjs/organisms — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

Larger Gluon interface structures. The package is optional and depends only
downward on Core, Quarks, Atoms, and Molecules.

```ts
import { AppShell } from "@gluonjs/organisms";
```

`WorkflowTimeline` renders a request-free, SSR-safe ordered workflow from typed
`steps`. Its `messages` API localizes every framework label and status; no
product copy is owned by the organism. Each instance requires a stable,
whitespace-free `id`; generated step, label, description, status, and summary
relationships are namespaced below it. When `state` is omitted, empty, active,
blocked, and complete states are derived from validated steps. Invalid IDs,
duplicate step IDs, unsupported status/state values, multiple current steps,
and contradictory explicit states fail closed with `data-state="invalid"`.
Default status and overall-state copy is human-readable English; override
`messages` to localize every framework-owned label without changing
caller-owned workflow content.
The component exposes `part`, `data-state`, and namespaced CSS custom-property
hooks for spacing, sizing, typography, borders, radii, markers, actions, and colors,
retains one DOM tree across stacked/wide layouts, supports RTL, 44px action
targets, forced colors, reduced motion, 200% text, and caller-owned native
`action`/`link` TemplateValue slots.

`AppShell` emits native `header`, `nav`, `main`, and `footer` landmarks only for
content the caller supplies. When a page has multiple navigation landmarks, the
caller must give the supplied navigation content a distinct accessible name.
Its layout uses logical dimensions and collapses to one column below 48rem.

Install the shared foundation and theme once through `installUi()` from
`@gluonjs/atoms`. `AppShell` carries its exact immutable stylesheet dependency,
and renderer ownership follows its target-local lifecycle. Import-time DOM
mutation remains prohibited. The deprecated `organismStyles` aggregate cannot
coexist silently with exact rendering.
`organismManifest` records the stable contract, compiled interactive example,
browser coverage, and visual-regression evidence.

`ConfirmationDialog` is a native `<dialog>` composition. Callers provide copy,
leading content, action controls, status content, and all mutation or routing.
Use controlled `open` for SSR/Storybook markup; a connected browser upgrades an
open surface into the modal top layer. Omit `open` when
`createConfirmationDialogController()` owns `showModal()` and `close()`.
The controller restores focus after its own close calls, native `close()`, and
Escape, and accepts an optional initial-focus element or selector. `busy` and
`disabled` make the caller-owned action region inert and block Escape/backdrop
dismissal. Backdrop dismissal is opt-in. Native `@cancel`, `@close`, and other
events remain available through `attributes`; caller listeners run before the
organism's bounded dismissal policy. At narrow widths and 200% text zoom the
surface stays horizontally contained and becomes vertically scrollable, so
every caller-owned action remains reachable within a short viewport. The
controller owns no domain decisions.
DOM relationship IDs fail closed when empty or when they contain whitespace.

`AppShell.attributes` extends its outer native div while its landmark children
remain owned by explicit props. App-local Organisms use the public
`defineOrganism()` metadata helper; it adds no lifecycle, registration,
styling, validation, or cleanup behavior. See the complete
[extension contract](../../docs/ui-extensibility.md).

GLUON GOODS defines its real `CheckoutExperience` page layout with
`defineOrganism()`. The composition contains the single delivery form, repeated
FormFields, app-local PurchaseAction, and live order summary; Router, Store,
form state, rendering, and lifecycle ownership remain with the application.
