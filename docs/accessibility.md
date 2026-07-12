# Accessibility evidence and manual protocol

Gluon accessibility claims require both automated checks and task-based manual
review. `tests/accessibility-gates.spec.ts` runs axe-core WCAG 2 A/AA, 2.1 AA,
and 2.2 AA rules against the GLUON GOODS home, product, bag-dialog, and checkout
surfaces in every Playwright engine lane. Before each axe scan, the test waits
for every finite Web Animation on the surface to finish so that transient entry
opacity cannot change the computed contrast result. The customer-flow suite
separately asserts initial dialog focus, focus containment, Escape behavior,
focus return, native labels, and mobile navigation.

`tests/ui-system.spec.ts` applies the same WCAG A/AA rule set to the stable
Quark, Atom, Molecule, and Organism composition. It also verifies focus-scope
entry, Tab containment, focus return, listbox keyboard selection, dialog naming,
validation alerts, and manifest evidence links in every browser engine lane.
`tests/ui-extensibility.spec.ts` additionally verifies that extension refs,
events, ARIA/data, class/style merging, theme rendering, keyboard activation,
cleanup, Button presets, and custom Icon semantics preserve those contracts.
Component-owned role, naming, disabled, children, and validation bindings are
excluded from the corresponding `attributes` type and remain explicit props;
the complete matrix is in [`ui-extensibility.md`](ui-extensibility.md).

GLUON GOODS additionally exercises official Button presets in global
navigation, dialogs, the form-associated product configurator, and the bag
quantity Custom Element. Checkout contains exactly one form and five required
official `FormField` compositions with implicit native labels. Customer-flow
tests verify the skip link, empty-submit constraint validation, 44px mobile
actions, visible cobalt focus, reduced-motion styles, theme tokens, dialog
focus entry/containment/return, and release of shared, app, and exact-component
styles after unmount in Chromium, Firefox, and WebKit.

Automated rules cannot establish reading order quality, useful announcements,
zoom usability, speech output, or whether a keyboard sequence is understandable.
The following protocol is therefore release-blocking for changed customer flows.

## Keyboard protocol

Record the commit, browser product/version, OS, viewport, input method, date,
tester, and outcome for each run.

1. At 1536px, 390px, and 320px, traverse from the skip link through global
   navigation, product cards, configuration, bag, checkout, and footer using
   only Tab, Shift+Tab, Enter, Space, arrow keys where native controls require
   them, and Escape.
2. Confirm every focused control has a visible indicator and every target is
   reachable in a sequence matching the visual and document order.
3. Open mobile navigation, search, and bag dialogs. Confirm focus enters the
   dialog, cannot move behind it, Escape closes it, and focus returns to the
   exact opener.
4. Configure a product, add it to the bag, change quantity, remove a line, and
   complete checkout without pointer input. Confirm selected native radios and
   form errors are programmatically associated with their labels.
5. At 200% and 400% browser zoom, repeat navigation and checkout. Confirm no
   control or required content is clipped or requires two-dimensional page
   scrolling.

## Assistive-technology protocol

At release-candidate cut, execute the same browse-to-checkout task with the
latest supported combinations named in the frozen browser manifest:

- VoiceOver with real Safari on macOS and iOS/iPadOS;
- NVDA with supported Chrome, Edge, and Firefox on Windows;
- TalkBack with supported Chrome and Firefox on Android.

Verify landmarks, headings, link/control names, product price and configuration,
dialog name/state, live inventory status, bag quantity changes, required checkout
fields, and order confirmation. Record speech/braille output where it differs
from visible copy. A failed task blocks the affected support claim; Playwright
WebKit or an accessibility-tree snapshot cannot replace real assistive technology.

## Evidence status

The automated axe and focus-behavior gates are blocking in CI. The branded
browser and assistive-technology runs are intentionally not claimed for the
private `0.0.0` line; their signed evidence record is created at the Gluon 1.0
release-candidate cut under the browser/device protocol.
