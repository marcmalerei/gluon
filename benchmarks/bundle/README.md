# Bundle-size matrix

`npm run benchmark:bundle` builds the same labelled counter interaction with
Gluon, Lit, Vue, and React in production mode. Every fixture renders a heading,
a native labelled button, and a polite live output; all use one entry and no
application router, component library, CSS framework, or code splitting.

The command rebuilds Gluon Core, records Node/npm/lockfile metadata, and writes
the raw, gzip level 9, and Brotli quality 11 byte totals to
`.tmp/bundle-matrix/report.json`. The Vite manifests remain beside each build
for chunk inspection. Results are a bounded import-and-render scenario, not a
general framework-size ranking.

Before changing fixture behavior, keep observable DOM and accessibility parity
across all four implementations. Add a separate fixture rather than silently
changing the measured scenario.
