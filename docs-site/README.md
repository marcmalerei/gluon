# Gluon documentation system

The public documentation is a static, versioned VitePress site published by
GitHub Pages at `https://marcmalerei.github.io/gluon/`. VitePress supplies the
navigation, accessible responsive layout, local full-text search, Markdown
rendering, and static output. The Gluon theme and documentation structure are
maintained in this repository; Pages needs no application server or secrets.

## Read and review locally

```sh
npm ci
npm run docs:dev
```

Open the local URL printed by VitePress. The package API is generated before the
server starts. To inspect the exact production output instead:

```sh
npm run build:docs
npm run docs:preview
```

The preview is static and uses the same `/gluon/` base path as GitHub Pages.
Do not merge or publish until the local site has been reviewed at desktop and
mobile widths.

## Information architecture

- `content/index.md` is the cross-version landing page.
- `content/<version>/guides/` teaches complete workflows in a recommended order.
- `guides/sfc-authoring/` publishes the maintained `docs/sfc-authoring.md`
  tutorial inside each versioned site, with links from component, compiler, and
  Vite entry points.
- `content/<version>/packages/` is generated from each maintained package
  README, so GitHub, npm, and the site share one package guide and examples.
- `content/<version>/cookbook/` composes multiple public packages into real
  application tasks.
- `content/<version>/api/` contains the maintained API introduction and
  generated TypeDoc pages for every public entry point and symbol.
- `content/<version>/migration/` and `reference/` hold migration playbooks and
  precise operational contracts.
- `examples/` contains the TypeScript/Vue source compiled by the docs checks and
  linked from Markdown; examples are not copied into prose by hand.
- `.vitepress/` owns routes, version navigation, search, theme, and layout.

`versions.json` declares supported lines and the latest line. New release lines
must be added deliberately; historical content is retained according to the
repository's release policy. `/latest/` is created as a static mirror after the
versioned site and runnable example hosts have built. This keeps deep links
working on GitHub Pages while the source and canonical URLs stay versioned.

## Package documentation contract

`package-contract.json` is the source of truth for package names, runtimes,
exports, dependencies, and release state. `package-docs.json` adds reviewed
purpose, use cases, non-goals, starter snippets, integration notes, and related
guides. `scripts/generate-package-readmes.mjs` renders the same overview into
every current package README. Each README keeps its package-specific guide and
examples below the generated overview; the site includes that README instead
of maintaining a divergent copy.

`scripts/generate-package-doc-pages.mjs` generates the matching versioned site
routes and package index. Its `--check` mode fails when a committed route is
out of date. `scripts/build-docs-api.mjs` emits TypeDoc Markdown directly into
the latest version's API tree; generated API output is ignored by Git and
recreated for local development, CI, and Pages builds.

## Examples and verification

The docs checks are designed to fail on broken contracts, not just on a failed
site build:

```sh
npm run typecheck:docs
npm run docs:api
node scripts/generate-package-readmes.mjs --check
node scripts/generate-package-doc-pages.mjs --check
npm run build:docs
node scripts/validate-docs.mjs
npm run check:docs-search-browser
```

The generated API corpus contains a reviewed, typechecked example for every
public symbol page. Package starters and shared guides use official package
imports; cookbook examples are sourced from compiled example files. Static
validation checks version routes, package coverage, API symbol examples,
selected architectural and migration contracts, and local links. Chromium
verification checks the real VitePress search interaction, keyboard selection,
deep-link reloads, desktop/mobile layouts, and server-rendered navigation with
JavaScript disabled.

`npm run check:docs` is the complete local gate. GitHub Actions runs the same
gate before assembling the Pages artifact, then adds the separate Playground
build under `/playground/`. Pages deployment remains an explicit CI operation;
`npm run build:docs` only writes local static files to `docs-site/dist/`.

## Editing rules

- Keep public imports and examples on the supported package entry points.
- Prefer a complete task flow over disconnected API inventories; link precise
  details to the generated API reference.
- Give every package a clear purpose, when-to-use guidance, non-goals,
  installation, a small quick start, and links into package combinations.
- Keep examples executable or compile-checked. Link exact maintained sources
  with Markdown includes rather than duplicating code.
- State verified behavior and limits; do not turn a source inventory,
  benchmark, or migration estimate into a broader product claim.
- Preserve the versioned page tree and the mobile-first Swiss-editorial theme.
