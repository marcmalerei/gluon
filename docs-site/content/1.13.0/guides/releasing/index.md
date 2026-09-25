# Release readiness

The `1.13.0` documentation is the next lockstep release candidate. It includes
the additive GraphQL connector (#531), Lit lifecycle compatibility (#530), the
production graph registration fix (#533), the progressive learning path (#532),
and the reproducible SSR load evidence lane (#506).

The release group contains 22 public packages. All package manifests and
official internal dependencies are pinned to `1.13.0`; publication, registry,
and immutable-release verification remain owner-controlled steps of the
protected tag workflow.

The release runbook is maintained in
[`docs/releasing.md`](https://github.com/marcmalerei/gluon/blob/main/docs/releasing.md).
Validate the release candidate contract with:

```sh
npm run check:release-contract -- --candidate 1.13.0
```

Release-state wording follows the repository policy: stable describes shipped public contracts, experimental describes explicitly labeled opt-in surfaces, and unsupported marks boundaries the contract refuses.

The package and application APIs remain additive. Existing `1.12.3` imports,
rendering behavior, SSR request isolation, and store behavior remain supported;
the new capabilities are opt-in through their documented public entry points.
