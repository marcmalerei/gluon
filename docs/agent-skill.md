# Gluon agent skill

Installing `@gluonjs/core` normally creates `SKILL.md` in the installing
project's root. The file gives coding agents a repository-verified map of the
published Gluon packages, public boundaries, performance guidance, and working
Vite, Storybook, Quark, Atom, Molecule, and Organism examples.

The installer recognizes the lifecycle roots exposed by npm and pnpm
(`INIT_CWD` and `npm_config_local_prefix`) and Yarn (`INIT_CWD` or
`PROJECT_CWD`). It then verifies the root by finding its `package.json`.
Typical Vite applications therefore need no configuration.

## Safety and lifecycle behavior

- An existing `SKILL.md` is never changed during installation.
- Repeated installation is idempotent.
- Set `GLUON_SKIP_AGENT_SKILL=1` before installation to opt out.
- Package managers configured with `--ignore-scripts`, `ignore-scripts=true`,
  or an equivalent security policy intentionally skip automatic creation.
  Run `npx gluon-skill` afterwards to create the file explicitly.
- Read-only projects and unusual monorepo layouts do not make dependency
  installation fail. The lifecycle hook emits a warning and exits successfully;
  run `npx gluon-skill --root /path/to/package` after choosing a writable
  package root.
- The Gluon source checkout is excluded so installing repository dependencies
  cannot generate a root skill file.

To refresh an installer-owned file after upgrading Gluon, run:

```sh
npx gluon-skill --regenerate
```

Regeneration is allowed only while the first line still contains Gluon's
generated-file marker. Removing that marker makes the file user-owned and
protects it from replacement. To adopt a new generated file after customizing
or removing the marker, move the current file aside and run `npx gluon-skill`.

Use `npx gluon-skill --root packages/storefront` for a specific package in a
workspace. The selected directory must contain `package.json`; the command
never guesses a destination outside a verified project root.
