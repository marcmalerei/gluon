# Keyed adjacent swap experiment (#634)

The experiment tested a udomdiff-inspired, narrowly guarded fast path for one
adjacent keyed swap in a 1,000-row list. The prototype compared the existing
Gluon-style prefix/suffix, key-map, stable-run, and group-movement strategy
with the candidate direct group move. Both implementations passed order and
DOM-identity checks.

| Browser | Existing-style prototype | Candidate prototype | Speedup |
| --- | ---: | ---: | ---: |
| Chromium | 0.1315 ms | 0.0006 ms | 205.18x |
| Firefox | 0.1369 ms | 0.0009 ms | 152.11x |
| WebKit | 0.1413 ms | 0.0009 ms | 157.00x |

The production Gluon benchmark was also run after implementation with the
same 1,000-row workload. It measured 0.0645 ms/op in Chromium, 0.1024 ms/op in
Firefox, and 0.0399 ms/op in WebKit. These are candidate-only production
measurements; this file does not claim a cross-commit production speedup.

The optimization applies only when the list length is unchanged, exactly one
adjacent pair is swapped, all other keys remain at the same index, and the
current nodes are in place. Every other shape uses the existing reconciliation
path.

Raw values and commands are retained in
[`keyed-adjacent-swap-634.json`](./keyed-adjacent-swap-634.json).
