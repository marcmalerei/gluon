# Spread-binding benchmark

## Purpose

The benchmark compares a bounded spread-binding workload while preserving
observable DOM, identity, style, and cleanup parity.

## Run

Run the production Chromium comparison from the repository root:

```sh
npm run benchmark:spread-bindings -- \
  --samples=25 \
  --warmup=6 \
  --output=.tmp/spread-binding-results.json
```

The fixture renders 80 equivalent product cards. Gluon forwards fresh native
props objects through spread bindings; Lit uses explicit bindings. The runner
measures cold commit, stable text-only updates, end-to-end template creation,
and cleanup while enforcing DOM, identity, text, style, and cleanup parity.
JSON contains every sample and the Markdown file beside it summarizes medians
and p95 values.

## Interpret results

Results describe this fixture and recorded host only; they are not a universal
framework ranking.
