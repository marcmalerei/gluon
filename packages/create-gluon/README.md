<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/gluon-hero.jpg" alt="Gluon create-gluon — native UI layers growing from a glowing core" width="100%">
</p>

<h1 align="center">Gluon / <code>create-gluon</code></h1>
<!-- gluon-package-header:end -->

`create-gluon` scaffolds supported TypeScript applications that consume only
public Gluon package entry points.

It also adds verified app-local UI boundaries to an existing generated or
compatible strict-TypeScript project:

```sh
create-gluon add-component PurchaseAction --kind molecule --yes
create-gluon add-component AccountControl --kind element --tag app-account-control --yes
create-gluon add-component DialogFocus --kind headless --dry-run --yes
```

Run `create-gluon add-component` without `--yes` for the ownership-guided
interactive prompt. Stable kinds are `atom`, `molecule`, `organism`, `element`,
and `headless`. `--root` selects the project, while `--path` selects a safe
relative component directory. `--dry-run` reports every planned source, test,
barrel, manifest, and test-config mutation without writing.

Names are PascalCase and paths must remain project-relative. Absolute paths,
traversal, symbolic-link segments, invalid Custom Element tags, malformed
manifests, and collisions fail during planning. A generated source or test is
replaced only when both `--overwrite` and the separate
`--confirm-overwrite` flag are present; interactive runs ask the second
confirmation directly. Managed `package.json` fields and the marked barrel
region are deterministic application integrations, not template overwrites.

Visual kinds export a constructable sheet, an SSR/hydration selection, and a
target-scoped style-owner helper. Stateful elements use `defineGluonElement`,
own their ShadowRoot sheet and connection cleanup, publish typed properties and
native events, and include a standalone HTML example. Every kind includes a
strict Playwright-backed browser test using `@gluonjs/test-utils`. Generated
imports use public entry points and preserve Quark → Atom → Molecule → Organism
dependency direction.

Every generated project includes `src/quantity-control.ts`, a strict public-API
`defineGluonElement` example with typed local state, a cancelable event, slots,
validation, and form participation. The generated README shows its plain-HTML
tag and import boundary.

```sh
npm create gluon@latest my-app -- --router --store --testing
```

Use `create-gluon my-app` for interactive selection or add `--yes` for stable
non-interactive defaults. Available feature switches are `--[no-]router`,
`--[no-]store`, `--[no-]testing`, `--[no-]ui`, and `--[no-]ssr`. SSR enables
Router and Store; explicitly combining `--ssr` with `--no-router` or
`--no-store` fails before files are written.

Every selection includes TypeScript, Vite, typecheck, template-check, test, and build scripts.
Router starters author link children with the public
`compose(RouterLink, props)\`body\`` path, so generated projects demonstrate
typed nested composition without an additional file format.
`npm run check:templates` runs the same diagnostics exposed by the Gluon editor service.
`--ui` uses the separately consumable public `@gluonjs/atoms` package. Generated
Button calls retain only the Button stylesheet through renderer-owned component
metadata; generated applications do not import or adopt the deprecated aggregate
Atom sheet. The generated application calls `installUi()` once, retains its
separate application sheet through `createStyleSheetOwner()`, maps app-owned
tokens to the public Button custom properties, and disposes both owners with the
application. Its typed `StarterAction` forwards native attributes, an accessible
name, a click callback, and reactive count state. `--testing` adds the official
browser fixture utilities and a Playwright-backed Vitest test that also checks
the rendered Button's computed 44px target and app-token background color.
`--ssr` adds one request-isolated server entry plus hydration. All Gluon
dependencies use the exact `create-gluon` release version; framework packages
and this CLI are released as one lockstep group.

UI + SSR starters serialize the shared UI/theme selection, the usage-derived
Button sheet, and the application sheet in deterministic order. Hydration lets
`installUi({ hydrate: true })` consume the shared carriers and hands only the
application selection to `hydrateApplication()`; the renderer consumes the
Button carrier from actual usage. The generated browser regression requires
retained DOM, no recovery or mismatches, one adopted Button sheet, one adopted
application sheet, and complete cleanup.

For stable automation, this is a ready-to-run UI starter command with no
interactive answers:

```sh
npm create gluon@latest my-app -- --yes --ui --testing
```

Add `--ssr` for the maintained universal selection; Router and Store are then
enabled by the compatibility rule described above. The generated README names
the app token, theme, local component, and `add-component` extension points.

The supported matrix is every independent Router, Store, testing, and UI
selection, plus SSR with its required Router and Store selections. Repository
fixture verification generates all 20 combinations. Each fixture is installed,
typechecked, tested, and built against packed workspace artifacts. UI fixtures
install packed `@gluonjs/quarks` and `@gluonjs/atoms` archives so the repository
gate verifies the exact locally packed artifacts rather than another registry
version.

The blocking component matrix separately generates all five kinds into clean
universal starters, then installs, typechecks, template-checks, runs their
browser tests, builds client and SSR entries, and verifies `npm pack --dry-run`.
See [the component-generator contract](../../docs/component-generator.md) for
the exact ownership and integration evidence.

## License

MIT License, Copyright © 2026 Marc Malerei.
