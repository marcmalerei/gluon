# Retained automated runs

## Purpose

This directory stores schema-valid, non-human output from
`npm run benchmark:dx`. An automated run always has `humanPasses: []` and does
not satisfy the completed-run contract. Scheduled CI also uploads the raw run
for each execution; a reviewed run may be committed here when its source commit
is stable.

## Run

Run the producer from the repository root with `npm run benchmark:dx`.

## Interpret results

These files are retained automation evidence, not a completed human scorecard
and not a general developer-experience ranking.
