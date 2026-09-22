# Spread-binding optimization evidence

Issue: #487

Environment: Apple M4, macOS 26.3, Node 24.18.0, npm 11.16.0,
Playwright Chromium 149.0.7827.55, Vite 8.2.1, Gluon 1.12.0 source.

Method: production builds, 80 equivalent product cards, six warm-up rounds,
25 interleaved measured rounds, and batches calibrated to at least 12 ms. The
Gluon cards receive fresh spread objects whose native values remain stable while
their text changes. The Lit cards use explicit bindings and produce the same
observable DOM. Lower latency is faster.

| Gluon scenario | Baseline median ms/op | Candidate median ms/op | Change |
| --- | ---: | ---: | ---: |
| Initial commit | 0.2484 | 0.2828 | +13.9% |
| Stable update commit | 0.1436 | 0.0632 | -55.9% |
| Initial end-to-end | 0.2361 | 0.2885 | +22.2% |
| Stable update end-to-end | 0.1503 | 0.0654 | -56.5% |
| Cleanup | 0.0613 | 0.0772 | +25.9% |

The measured claim is limited to stable spread updates in this fixture. The
cache adds work to cold construction and cleanup, and the allocation benchmark's
fully changing spread lane moved from 0.00147 to 0.00172 ms/op (+17.0%). Those
paths remain far below the repository's absolute runtime ceilings; the runtime
scorecard, shop performance budget, cleanup invariants, SSR, hydration,
security, and browser coverage remain blocking gates.

The production bundle fixture changed from 40,920 to 43,866 raw bytes, 12,646
to 13,408 gzip bytes, and 11,296 to 11,971 Brotli bytes. This is a 762-byte
(6.0%) gzip increase. The Chromium retained-result diagnostic changed from
5,890,152 to 5,872,164 bytes for 100,000 reachable `TemplateResult` values after
forced GC; that run-level difference is not treated as a portable per-object
memory claim.

Both spread runs passed equivalent DOM, stable element identity, style parity,
and empty-root cleanup checks. Focused browser tests additionally cover stable
write suppression, changed and removed keys, in-place aggregate mutation,
overlapping aliases, controlled property/native-boolean restoration, event and
ref lifecycle, unsafe URLs, suspension, and permanent unmount. Existing SSR and
hydration suites verify retained structure and output compatibility.

Raw samples and environment metadata:

- [`spread-bindings-issue-487-baseline.json`](spread-bindings-issue-487-baseline.json)
- [`spread-bindings-issue-487-candidate.json`](spread-bindings-issue-487-candidate.json)
- [`renderer-allocations-issue-487-baseline.json`](renderer-allocations-issue-487-baseline.json)
- [`renderer-allocations-issue-487-candidate.json`](renderer-allocations-issue-487-candidate.json)
- [`bundle-matrix-issue-487-baseline.json`](bundle-matrix-issue-487-baseline.json)
- [`bundle-matrix-issue-487-candidate.json`](bundle-matrix-issue-487-candidate.json)
