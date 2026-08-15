# Gluon upgrade guide

Use this guide when moving an existing application or workspace to a newer
Gluon release line.

## Supported upgrade path

Gluon is released as one lockstep package train. The current release line is
`1.9.0`, and every official `@gluonjs/*` package and `create-gluon` ship at
the same version in that line. When you upgrade, keep every consumed Gluon
package on the same release version as the rest of the train.

Supported release-to-release upgrades are the versioned lines recorded in the
release archive and changelog. For the maintained documentation set, the
current supported target is `1.9.0`; older versioned docs remain available in
the archive until their release line leaves support.

## Runtime prerequisites

- Use Node `^22.12.0 || ^24.0.0`; this is the published package-engine range.
- Run browser verification in the maintained Playwright Chromium, Firefox, and
  WebKit lanes. This is not a promise for every branded browser release.
- Browser styling requires constructable `CSSStyleSheet`, `replaceSync()`, and
  `adoptedStyleSheets`; Gluon does not provide a `<style>` fallback.

Read the [support matrix](/gluon/1.9.0/reference/support-matrix/) before changing
the application's Node or browser baseline in the same upgrade.

## Policy facts

- `1.0` introduced the current semver policy: an incompatible public API
  change requires a major release.
- A deprecated API remains for at least the next stable minor, and the
  documented alternative, migration instructions, changelog entry, and TypeScript
  metadata are provided where applicable.
- The documentation tree and package portal use the same versioned release line
  as the released packages.
- Application code must import public package entry points only. Private
  repository imports and deep package internals are unsupported, and Gluon
  does not provide automatic rewriting for them.

## Before upgrading

1. Start from a clean worktree or commit the pre-upgrade state on a dedicated
   branch so rollback cannot discard unrelated changes.
2. Record the installed Gluon version from `package.json` and the lockfile.
3. Inventory every consumed `@gluonjs/*` package and `create-gluon`.
4. Review the release archive, changelog, and diagnostic catalog for the
   version you are moving to.
5. Keep the package set lockstep on one version before and after the upgrade.

### single-package app

Use these commands from the application root:

```sh
npm pkg get dependencies devDependencies
npm ls --depth=0 @gluonjs/core @gluonjs/reactivity @gluonjs/router @gluonjs/store @gluonjs/ssr @gluonjs/i18n @gluonjs/vite @gluonjs/gluon-components-vite @gluonjs/test-utils @gluonjs/devtools @gluonjs/devtools-api @gluonjs/graph @gluonjs/language-server @gluonjs/vue-migration-analyzer @gluonjs/quarks @gluonjs/atoms @gluonjs/molecules @gluonjs/organisms @gluonjs/json-forms create-gluon
npm install --save-exact @gluonjs/core@1.9.0 @gluonjs/reactivity@1.9.0 @gluonjs/router@1.9.0 @gluonjs/store@1.9.0
npm ci
git diff -- package.json package-lock.json
npm run typecheck
npm run build
npm test
```

The install line is an example for an application consuming those four
packages. Remove packages it does not consume and add every other consumed
official package with the same exact `1.9.0` target.

### Workspace or root consumer

Use these commands from the workspace root:

```sh
npm pkg get workspaces
npm ls --depth=0 @gluonjs/core @gluonjs/reactivity @gluonjs/router @gluonjs/store @gluonjs/ssr @gluonjs/i18n @gluonjs/vite @gluonjs/gluon-components-vite @gluonjs/test-utils @gluonjs/devtools @gluonjs/devtools-api @gluonjs/graph @gluonjs/language-server @gluonjs/vue-migration-analyzer @gluonjs/quarks @gluonjs/atoms @gluonjs/molecules @gluonjs/organisms @gluonjs/json-forms create-gluon
npm install --workspace ./apps/storefront --save-exact @gluonjs/core@1.9.0 @gluonjs/router@1.9.0 @gluonjs/store@1.9.0
npm install --workspace ./apps/server --save-exact @gluonjs/ssr@1.9.0 @gluonjs/router@1.9.0 @gluonjs/store@1.9.0
npm ci
git diff -- package.json package-lock.json packages/*/package.json packages/*/package-lock.json
npm run typecheck
npm run build
npm test
```

Replace the example workspace paths and package lists with the real consumers.
If the workspace root itself consumes Gluon, update it with
`npm install --include-workspace-root --save-exact` and the same target version.

## Rollback

If the upgrade does not validate, first inspect `git diff` and confirm that the
listed files contain only upgrade changes. Then restore the previous lockstep
release before making further edits:

```sh
git restore package.json package-lock.json
npm ci
npm run typecheck
npm run build
npm test
```

For a workspace, restore the same files in every affected package before
re-running the clean install and verification commands.

## Verification matrix

Match the supported release with the existing customer-flow evidence:

| Surface | Point to the real command or API |
| --- | --- |
| SSR and hydration | `npm run test:ssr` and `tests/hydration.spec.ts` |
| Router deep links and back/forward | `npm run test:router-browser` and `tests/router.spec.ts` |
| Store persistence | `npm run test:store` and `tests/shop-example.spec.ts` |
| Usage-driven component styles | `npm run test:browser` and `tests/styles-and-element.spec.ts` |
| Language server and editor tooling | `npm run test:language-server` and `gluon-language-server --stdio` |

## Where to read next

- [Changelog](https://github.com/marcmalerei/gluon/blob/main/CHANGELOG.md)
- [Releases](https://github.com/marcmalerei/gluon/releases)
- [Release archive](/gluon/archive/)
- [Published package archive](https://www.npmjs.com/org/gluonjs)
- [Diagnostic catalog](/gluon/1.9.0/reference/diagnostics/)
- [Support matrix](/gluon/1.9.0/reference/support-matrix/)
- [Release operations](/gluon/1.9.0/guides/releasing/)
- [Migration index](/gluon/1.9.0/migration/)
- [Package portal](/gluon/1.9.0/packages/)
