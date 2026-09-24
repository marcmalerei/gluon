# Release readiness

The `1.12.3` documentation describes the published lockstep release.
The release includes the additive public APIs delivered by issues #521-#524:
provider-independent analytics, request-scoped tenant context, machine-readable
agent tooling, and opt-in store persistence.

The release group contains 21 public packages. All package manifests and
official internal dependencies are pinned to `1.12.3`, and independent registry
verification confirms that all 21 packages are published at version and
`latest` `1.12.3` with provenance metadata.

The protected `v1.12.3` tag resolves to merge commit
`3185e48a3dcc1b3138eaa6bf19f1e51893d7e8f1`. The protected tag workflow
([`35985803820`](https://github.com/marcmalerei/gluon/actions/runs/35985803820))
completed candidate, reproducibility, browser-engine, Node-runtime,
performance, fixture, registry, provenance, and publication checks. The
GitHub release contains 131 assets.

The release runbook is maintained in
[`docs/releasing.md`](https://github.com/marcmalerei/gluon/blob/main/docs/releasing.md).
Validate the published release contract with:

```sh
npm run check:release-contract -- --candidate 1.12.3
```

Release-state wording follows the repository policy: stable describes shipped public contracts, experimental describes explicitly labeled opt-in surfaces, and unsupported marks boundaries the contract refuses.

The package and application APIs remain additive. Existing `1.12.2` imports,
rendering behavior, SSR request isolation, and store behavior remain supported;
the new capabilities are opt-in through their documented public entry points.
