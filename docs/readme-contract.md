# README contract

README files are scoped entry points. They should answer what a reader can do
here, how to run it, how it is verified, and where the deeper contract lives.
The structural checks run with `npm run check:readmes`.

## Root README

`README.md` must contain, in this order:

1. product introduction and shortest working start;
2. `Start here`;
3. `Build a complete application`;
4. `Package map`;
5. `Platform principles`;
6. `Release and stability`;
7. `Development`;
8. `Contributing`;
9. `License`.

The root page may contain a generated Core package overview because the root
package is also `@gluonjs/core`. It must link to the VitePress site rather than
repeating the complete guide tree.

## Package READMEs

Every current package README keeps the generated header and overview markers,
then follows this common order:

1. package title and one-sentence boundary;
2. `<package> at a glance` (generated);
3. `Install` and `Quick start` (generated);
4. `Choose this package when` and `Related documentation` (generated);
5. package-specific examples, contracts, limits, and `License` where needed.

The overview is generated from `package-contract.json` and
`docs-site/package-docs.json`. Do not hand-edit the generated block.

## Example READMEs

Every maintained application under `examples/` has these headings:

- `Purpose`
- `Run`
- `Verify`

The page may add `Design`, `Boundaries`, or detailed feature sections. The shop
remains the coherent customer application; other examples must state why they
are separate and must not present disconnected demo panels as product flows.

## Benchmark READMEs

Top-level benchmark pages use:

- `Purpose`
- `Run`
- `Interpret results`

The interpretation section states the workload, host/evidence scope, and what
the measurement does not prove. Retained automated runs additionally document
the schema and retention rule.

## Index READMEs

ADRs, RFCs, and diagnostic catalogs are indexes. They identify the records or
codes, their status, and the process for adding or superseding one. They do not
duplicate the full decision or diagnostic content.

## Link and freshness rules

- Prefer version-independent `/latest/` links for stable package landing pages.
- Use a versioned URL for a release-specific contract or generated API page.
- Use relative repository links for source files and contributor docs.
- Mark historical evidence with its release, date, environment, and limits.
- If a README needs more than an overview and a focused guide, move the detail
  into VitePress and leave a task-oriented link behind.
