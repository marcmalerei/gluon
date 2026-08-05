# Gluon agent skill

Installing `@gluonjs/core` leaves the consumer source tree unchanged. Run
`npx gluon-skill` explicitly when a project wants a `SKILL.md` with a
repository-verified map of the published Gluon packages, public boundaries,
performance guidance, and working Vite, Storybook, Quark, Atom, Molecule, and
Organism examples.

The explicit command recognizes the project roots exposed by npm and pnpm
(`INIT_CWD` and `npm_config_local_prefix`) and Yarn (`INIT_CWD` or
`PROJECT_CWD`). It verifies the destination by finding its `package.json`.
Typical Vite applications therefore need no additional configuration.

## Safety and lifecycle behavior

- Normal package installation never creates or changes `SKILL.md`.
- An existing `SKILL.md` is never changed by the explicit command.
- Repeated explicit generation is idempotent.
- Read-only projects and unusual monorepo layouts do not affect dependency
  installation because generation is not an install lifecycle hook.
- The Gluon source checkout remains excluded from explicit generation.

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
