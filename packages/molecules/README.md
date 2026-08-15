<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/molecules.png" alt="@gluonjs/molecules — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

Reusable compositions built only from Core, Quarks, and Atoms.

```ts
import { Accordion, ButtonGroup, Card, ChoiceGroup, ControlField, DialogSurface, Disclosure, EmptyState, FormField, InlineNotice, NavigationStrip, SegmentedControl, TableRegion, Tabs, createDialogSurfaceController } from '@gluonjs/molecules';
```

`Card` renders a native article. Its optional title is an `h3`; callers must
place cards under a compatible heading hierarchy. `FormField` uses implicit
native label association. An error sets the child input's `aria-invalid` state
and exposes a visible `role="alert"`; helper text is visible supplementary copy.
`createFormController()` is the request-free behavioral companion for these
field compositions. It exposes typed `register()`, values, touched/dirty
state, field errors, async `validate()`, `submit()`, reset, subscriptions, and
an abort-owned `signal` for validators and submit handlers. It does not render
controls, read `FormData`, send requests, or depend on `window`/`document`.
`snapshot()` and `hydrate()` carry serializable initial/value/error/touched
state across SSR when the application supplies the same validator and submit
handler on the browser side. The controller uses shallow record snapshots;
nested schema traversal remains the responsibility of `@gluonjs/json-forms`
or the application.
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
`ButtonGroup` renders an accessible named `role="group"` around caller-owned
buttons. It preserves source and Tab order, supports horizontal or vertical
layout, optional wrapping, and spaced or attached presentation, but never adds
selection, menu, routing, tab, or pressed-state behavior to its children.
`SegmentedControl` is a controlled, single-choice toolbar of native toggle
buttons for a small finite option set. It exposes one Tab stop and Arrow/Home/End
navigation, skips disabled options, and supports horizontal, vertical, and RTL
layout. It is deliberately not a tablist or radio group: callers own the value,
routing, panels, persistence, and async effects.
`Tabs` implements the WAI-ARIA tablist/tab/tabpanel pattern with stable caller
IDs, controlled selection, one Tab stop, disabled-option skipping,
Arrow/Home/End navigation, and manual or automatic activation. Horizontal,
vertical, RTL, overflow, forced-colors, and reduced-motion presentation are
included; panel content, loading, routing, persistence, and effects remain
caller-owned.
`DialogSurface` composes the Quarks ARIA `Dialog`, `Overlay`, and
`createFocusScope` contracts into a styled, controlled surface. Create one
stable controller per openable surface, call `controller.activate(trigger)`
when opening, pass it to the component, and call `controller.deactivate()` as
part of closing or teardown. The controller defers initial focus until mount,
contains Tab and Shift+Tab, and restores a connected trigger. Escape and direct
overlay pointer dismissal call `onDismiss`; open state, close controls, copy,
async state, and destructive decisions remain caller-owned. This component
uses an ARIA dialog on a `div`; it deliberately does not call native
`HTMLDialogElement.showModal()`, enter the top layer, or make background content
inert. Applications that require the native-dialog boundary should own a
native `<dialog>` lifecycle instead.
`Disclosure` renders native `details` and `summary`, preserving browser
keyboard toggling, find-in-page expansion, semantics, and form behavior. Use
`open` with `onToggle` for controlled state or `defaultOpen` for the initial
native state. It deliberately has no silent disabled prop. When content is not
yet available, pass `unavailable: true` with a concrete `unavailableReason`;
the summary remains focusable, exposes `aria-disabled`, shows and references
the reason, and prevents Enter, Space, and pointer activation.
`ResponsiveDisclosure` is the responsive variant for panels such as mobile
filters. It keeps one native `details`/`summary` tree, is always open outside
`compactBreakpoint`, and starts with `compactInitialOpen` in compact view. A
compact user's toggle is restored after breakpoint round-trips; a new
`compactResetToken` deliberately replaces that remembered choice. It mirrors
native `open` to `summary[aria-expanded]`, works during SSR, removes its media
query listener on disconnect, and uses the same constructable Disclosure
stylesheet. Consequently its marker uses the existing reduced-motion rule,
its border remains visible in forced-colors mode, and its logical grid follows
RTL without a second responsive-specific style contract. Invalid IDs,
breakpoints, initial state, and reset tokens throw stable
`GLUON_RESPONSIVE_DISCLOSURE_*_INVALID` diagnostics. If `matchMedia` is missing
or fails, the server-selected compact initial state is retained and the root
exposes the corresponding stable diagnostic through
`data-gluon-responsive-disclosure-error`.
`Accordion` composes caller-owned Disclosure items inside a labelled group. It
supports controlled single or multiple open values, stable item IDs, an
explicit heading level, optional non-collapsible single selection, and
Arrow/Home/End focus movement that skips unavailable summaries without
changing native activation or Tab order. Callers retain item copy, open state,
routing, loading, unavailable reasons, and effects; it deliberately does not
implement a custom tree widget.
`InlineNotice` renders bounded neutral, info, success, warning, or danger
feedback with a non-color marker. Its `auto` announcement maps info/success to
a polite status, warning/danger to an assertive alert, and neutral content to a
static region; use `polite`, `assertive`, or `off` when message timing requires
an explicit choice. Optional caller-owned action and dismiss controls render
outside the live region. The application continues to own copy, lifecycle,
events, retries, and dismissal state.
`EmptyState` composes optional caller-owned media, a semantic heading level,
body copy, and recovery action in compact or full layouts. It is intentionally
static and adds no status, alert, or live-region semantics, avoiding repeated
announcements on ordinary rerenders. When an empty result is newly produced by
an asynchronous action, announce that transition separately with the bounded
`InlineNotice` contract while keeping the persistent empty state static.
`TableRegion` wraps a caller-owned native table in a named region. Optional
summary copy labels the data set, while an optional scroll hint becomes visible
and the horizontal viewport joins Tab order only when content actually
overflows. Empty content is an explicit mutually exclusive variant. Captions,
headers, rows, sorting, pagination, selection, editing, and virtualization stay
caller-owned; the component deliberately does not implement DataGrid behavior.
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

Styles use logical properties and shared Atom token names. `ButtonGroup`, `Card`, `ChoiceGroup`,
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
ButtonGroup exposes `--gluon-button-group-gap`,
`--gluon-button-group-border-color`, and `--gluon-button-group-radius`.
SegmentedControl exposes `--gluon-segmented-control-border-color`,
`--gluon-segmented-control-background`,
`--gluon-segmented-control-selected-background`,
`--gluon-segmented-control-selected-color`, and
`--gluon-segmented-control-radius`.
Tabs exposes `--gluon-tabs-border-color`, `--gluon-tabs-background`,
`--gluon-tabs-color`, `--gluon-tabs-selected-border-color`,
`--gluon-tabs-selected-color`, and `--gluon-tabs-panel-padding`.
DialogSurface exposes `--gluon-dialog-z-index`,
`--gluon-dialog-overlay-background`, `--gluon-dialog-inline-size`,
`--gluon-dialog-max-block-size`, `--gluon-dialog-background`,
`--gluon-dialog-color`, `--gluon-dialog-border`, `--gluon-dialog-radius`,
`--gluon-dialog-shadow`, and section padding variables for header,
description, content, and footer.
Disclosure exposes `--gluon-disclosure-border`, summary gap/padding/color and
weight variables, `--gluon-disclosure-marker`, marker color/size/motion,
`--gluon-disclosure-content-padding`, and
`--gluon-disclosure-unavailable-color`.
Accordion exposes a minimal layout wrapper and inherits the Disclosure custom
properties for every native item.
InlineNotice exposes gap, padding, border, accent width, radius, background,
color, and action-gap custom properties. Tone defaults remain contrast-aware,
and application overrides must preserve readable text and state distinction.
EmptyState exposes gap, minimum block size, padding, media size, heading/body
width and typography, body color, and action-gap custom properties.
TableRegion exposes gap, summary and hint colors, and
`--gluon-table-region-content-min-inline-size` for application-owned column
layouts that need horizontal overflow at constrained widths.

`Card.attributes` extends its native article. `ControlField.attributes` extends
its outer div while structural content stays explicit. `FormField.attributes` extends
the composed Input and `FormField.fieldAttributes` extends the outer native
label. Both exclude owned children so callers cannot silently replace baseline
composition. `NavigationStrip.attributes` extends its native navigation
landmark while its internal viewport and controls stay owned. App-local
Molecules use the public `defineMolecule()` metadata helper described in the
[extension contract](../../docs/ui-extensibility.md).

GLUON GOODS creates one `createFormController()` for the checkout lifecycle,
reuses it through hydration, and updates the same request-free state alongside
the store-owned order data. It repeats `FormField` for its five required delivery inputs, uses
`ControlField` for optional delivery instructions with deterministic help, and uses
an app-local `PurchaseAction` defined with `defineMolecule()` in the same real
checkout form. Native constraint validation remains authoritative for required
controls and terms; the controller adds application-level validation and
cancellation without taking over submission transport. Product configuration uses three `ChoiceGroup` fieldsets with
native Radio options. Its catalog filter uses `NavigationStrip` to keep every category
discoverable at constrained widths. Browser tests verify implicit labels,
native constraint validation, overflow interaction, SSR/hydration styles, and
teardown.
The site header uses `ButtonGroup` for the search, bag, and mobile-menu action
cluster without changing the individual actions' semantics.
The catalog uses `SegmentedControl` for a URL-backed Grid/List view choice; the
shop owns the route update and the corresponding product layout.
Product details use `Tabs` for URL-backed Story and Details panels while the
shop owns routing and restores focus to the activated tab after navigation.
The bag uses `DialogSurface` for its labelled end drawer, overlay and Escape
dismissal, initial close-button focus, focus containment, and trigger-focus
restoration while the shop continues to own bag state and checkout decisions.
The Shipping policy uses `Accordion` over native `Disclosure` items for
URL-backed tracking, packaging, and remote-area details without replacing
native summary behavior.
The order-confirmation route uses a polite success `InlineNotice` for the real
order ID, delivery email, total, and caller-owned continue-shopping action.
The empty bag uses compact `EmptyState` composition with a semantic heading and
caller-owned shop route while the enclosing DialogSurface retains focus and
dismissal ownership.
Checkout uses `TableRegion` around its native captioned order table. The shop
owns every header, row, price, and total; the molecule adds the region summary
and narrow-layout overflow affordance without introducing grid interaction.
