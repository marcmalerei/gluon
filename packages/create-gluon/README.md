# `create-gluon`

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
Atom sheet. `--testing` adds the official browser fixture utilities and a
Playwright-backed Vitest test.
`--ssr` adds one request-isolated server entry plus hydration. All Gluon
dependencies use the exact `create-gluon` release version; framework packages
and this CLI are released as one lockstep group.

The supported matrix is every independent Router, Store, testing, and UI
selection, plus SSR with its required Router and Store selections. Repository
fixture verification generates all 20 combinations. Each fixture is installed,
typechecked, tested, and built against packed workspace artifacts. UI fixtures
install packed `@gluonjs/quarks` and `@gluonjs/atoms` archives rather than
resolving unpublished workspace versions from the registry.

The blocking component matrix separately generates all five kinds into clean
universal starters, then installs, typechecks, template-checks, runs their
browser tests, builds client and SSR entries, and verifies `npm pack --dry-run`.
See [the component-generator contract](../../docs/component-generator.md) for
the exact ownership and integration evidence.

## License

MIT License, Copyright © 2026 Marc Malerei.
