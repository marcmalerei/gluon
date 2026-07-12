# App-local component generator

`create-gluon add-component` adds one production-valid UI boundary to an
existing strict TypeScript application. It does not generate official Gluon
package components, replace application architecture, or create a gallery.

Run the command without `--yes` to see the five kinds and their owners before
answering the prompts:

```sh
create-gluon add-component
```

Automation supplies the same choices explicitly:

```sh
create-gluon add-component PurchaseAction --kind atom --yes
create-gluon add-component DeliveryPanel --kind molecule --root ./shop --yes
create-gluon add-component CheckoutRegion --kind organism --path src/ui --yes
create-gluon add-component AccountControl --kind element --tag app-account-control --yes
create-gluon add-component DialogFocus --kind headless --dry-run --yes
```

## Generated ownership

| Kind | Composition boundary | Style and lifecycle owner |
| --- | --- | --- |
| `atom` | A stateless Quark-based native primitive defined with `defineAtom()` | Exports one constructable sheet, named SSR/hydration selection, and target-scoped owner helper; the application disposes that owner. |
| `molecule` | A stateless `defineMolecule()` composition that imports an official Atom | Same application-owned sheet contract; it owns no independent state or lifecycle. |
| `organism` | A stateless `defineOrganism()` composition importing only downward Atom and Molecule layers | Same application-owned sheet contract; no upward or private package import is generated. |
| `element` | A stateful autonomous Custom Element defined by `defineGluonElement()` | The element owns an open ShadowRoot, its constructable sheet, keyed state, native event, slots, exposed focus method, and connection cleanup. |
| `headless` | A typed wrapper around Quark focus behavior with no visual template | The caller owns markup and styling and deactivates the returned scope during teardown. |

Every kind creates `<slug>.ts` and `<slug>.spec.ts` below
`src/components` by default. Stateful elements also create a standalone
`<slug>.usage.html`. The generated browser test verifies semantic output,
keyboard or pointer interaction, accessible naming/state, and the applicable
style, ref, listener, or connection cleanup contract through
`@gluonjs/test-utils`.

The command creates or updates `src/components/index.ts` using a marked export
region. Existing application-owned exports outside that region are preserved;
generated export lines are sorted. Required official runtime dependencies,
Playwright/Vitest test dependencies, and `test:components` are added to
`package.json` deterministically. An existing custom test command or Vitest
configuration is preserved.

## Planning and filesystem safety

Planning completes before mutation. It validates the project manifest,
PascalCase name, component kind, relative path, autonomous Custom Element name,
every existing path segment, and all generated-file collisions. Absolute paths,
empty or `..` segments, backslash ambiguity, NUL bytes, symbolic-link segments,
reserved Custom Element names, and malformed manifests fail without writes.

`--dry-run` prints the complete sorted plan with `CREATE`, `UPDATE`, or
`OVERWRITE` plus the exact UTF-8 byte count and then exits without mutation.
Generated source and test files are never replaced by an ordinary run.
Non-interactive replacement requires both:

```sh
create-gluon add-component PurchaseAction --kind atom \
  --overwrite --confirm-overwrite --yes
```

Interactive replacement still requires `--overwrite` and then asks a separate
yes/no question. Package fields and the marked barrel region are managed
updates, not blanket file replacement. Writes are staged in same-directory
temporary files; if a commit step fails, applied files are restored from their
pre-write contents and temporary files are removed.

## Toolchain behavior

- Source imports only `@gluonjs/core`, `@gluonjs/quarks`,
  `@gluonjs/atoms`, `@gluonjs/molecules`, and `@gluonjs/organisms` public roots.
- Constructable `css` templates and `defineAtom`/`defineMolecule`/
  `defineOrganism`/`defineGluonElement` exports are recognized by the existing
  compiler and Vite HMR transform. The retained generator test checks the
  development HMR hooks and rejects compiler diagnostics.
- Visual functional kinds export a `createStyleSheetSelection()` result for
  request-owned SSR/hydration manifests. Element styles remain on the element's
  ShadowRoot and its guarded connection listener is safe during server render.
- The generated test uses the public test utilities. The component matrix runs
  that test in real Chromium after a clean install.
- `gluon-template-check` analyzes every generated source/test file. The retained
  language-tooling test verifies the stateful tag plus its three properties,
  native event, and two slots are discoverable without private metadata.
- Stateful output is an autonomous Custom Element with declared properties and
  an adopted ShadowRoot sheet, so the existing Devtools component-tree protocol
  reports its attributes, declared properties, stylesheet count, and children.
  Stateless functions contribute ordinary semantic DOM to their application
  owner and do not invent a second Devtools component instance.

## Verification matrix

The existing 20-project feature matrix remains unchanged. A second blocking
matrix creates one clean Router + Store + testing + UI + SSR starter per
generated kind. Each of the five projects installs packed workspace artifacts,
typechecks, runs template diagnostics, executes its strict browser test, builds
client and SSR outputs, and passes `npm pack --dry-run`. This is compatibility
evidence, not a claim that an unused generated component is automatically added
to a customer route.

GLUON GOODS remains unchanged because code generation is a developer workflow
outside the customer browse, configure, bag, and checkout journey. Its honest
acceptance surface is the clean generated-project matrix, recorded in
`examples/shop/FEATURES.md`.
