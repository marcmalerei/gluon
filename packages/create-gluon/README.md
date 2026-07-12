# `create-gluon`

`create-gluon` scaffolds supported TypeScript applications that consume only
public Gluon package entry points.

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

## License

MIT License, Copyright © 2026 Marc Malerei.
