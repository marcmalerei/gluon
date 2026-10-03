<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/organisms.png" alt="@gluonjs/organisms — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

# @gluonjs/organisms

Larger Gluon interface structures. The package is optional and depends only
downward on Core, Quarks, Atoms, and Molecules.

<!-- gluon-package-overview:start -->
## @gluonjs/organisms at a glance

**Runtime:** browser · **Release:** 1.13.0

[Documentation guide](https://marcmalerei.github.io/gluon/latest/packages/organisms/) · [npm](https://www.npmjs.com/package/@gluonjs/organisms) · [Source](https://github.com/marcmalerei/gluon/blob/main/packages/organisms/README.md)

**Public API:** [`@gluonjs/organisms`](https://marcmalerei.github.io/gluon/1.13.0/api/generated/packages/organisms/src/)

### Install

```sh
npm install @gluonjs/organisms
```

### Quick start

```ts
import { AppShell } from '@gluonjs/organisms';
```

### Choose this package when

- App shell and larger layout structures built from lower-level packages.
- Landmarks, navigation, and responsive composition.
- Structured interface regions for browser apps.
- Bounded multi-stage workflows with explicit status and evidence.

**Choose another boundary when:**

- Does not generate content that the caller has not supplied.
- Layout remains dependent on consumer-owned content and semantics.

### Related documentation

- [Application](https://marcmalerei.github.io/gluon/latest/guides/application/)
- [Components](https://marcmalerei.github.io/gluon/latest/guides/components/)

<!-- gluon-package-overview:end -->

```ts
import { AppShell, MegaMenu } from "@gluonjs/organisms";
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

`AsyncState` renders a request-free, SSR-safe labelled section for `loading`,
`success`, `empty`, `error`, and `partial` states. It selects only the
caller-provided state content, announces loading/partial/error feedback through
one bounded live region, and keeps fetching, retry, authorization, routing,
localization, and state transitions outside the organism. `id`, `part`,
`data-state`, and CSS custom properties provide stable tenant-scoped styling
hooks without requiring a framework-owned theme.

`ProductCard` and `ProductGrid` are render-only commerce compositions. They
accept typed product identity and caller-rendered media, prices, availability,
actions, and cards; they do not fetch inventory, own prices, add payment or
analytics behavior, or decide routing. `ProductGrid` preserves source order,
supports an explicit empty surface, and falls back to one column on small
screens. Both expose parts, data attributes, and CSS custom properties for
tenant-specific themes.

`ProductGallery` renders typed product media in source order while allowing one
image to be the primary responsive panel. Decorative alternate views may use
empty alt text, every image has a stable caller-owned identifier, and the
component provides responsive scrolling, focus, forced-colors, reduced-motion,
and CSS-variable hooks. Zoom, lightbox state, crop choices, tenant media,
analytics, and routing remain application-owned.

`SiteHeader` renders a semantic, responsive header with caller-owned brand,
navigation, actions, and an optional controlled mobile navigation region. Its
mobile disclosure supports Escape/focus return, 44px controls, and CSS-variable
hooks for tenant-specific shells; routing, authorization, localization,
analytics, and open state remain application-owned.

`AdminShell` renders a responsive administration layout with semantic header,
labelled sidebar navigation, main workspace, and optional footer regions. It
keeps routing, permissions, data loading, mutations, mobile state, localization,
and tenant identity with the caller while exposing CSS-variable hooks and native
region attributes for application-specific shells.

`SiteFooter` renders a semantic, responsive footer with optional caller-owned
brand, labelled navigation, legal, and metadata regions. It keeps URLs,
content, routing, authorization, localization, analytics, tenant identity, and
content order with the caller while exposing native region attributes and
CSS-variable hooks for application-specific styling. The exact stylesheet
stacks the regions on small screens and includes focus-visible,
forced-colors, and reduced-motion behavior.

`MegaMenu` renders a controlled, labelled native navigation with grouped links,
responsive stacking, Escape/focus return, Arrow/Home/End traversal, disabled
links, and CSS-variable styling hooks. Routing, authorization, analytics,
localization, global shortcuts, and link data remain caller-owned.

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
