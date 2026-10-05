# Release readiness

The `1.14.0` documentation is the current published lockstep release. It includes
the additive GraphQL connector (#531), Lit lifecycle compatibility (#530), the
production graph registration fix (#533), the progressive learning path (#532),
and the reproducible SSR load evidence lane (#506).

The canonical `v1.14.0` tag is immutable. Its first release workflow run
stopped before publication because the Chromium release lane omitted the
retained `ssr-load.json` artifact required by the aggregate performance gate.
Issue [#543](https://github.com/marcmalerei/gluon/issues/543) records the
allowlisted workflow repair and recovery tag; package and application inputs
remain unchanged.

The release group contains 22 public packages. All package manifests and
official internal dependencies are pinned to `1.14.0`; the protected tag,
GitHub release, and npm `latest` registry state have been verified.

The release runbook is maintained in
[`docs/releasing.md`](https://github.com/marcmalerei/gluon/blob/main/docs/releasing.md).
Validate the release contract with:

```sh
npm run check:release-contract
```

Release-state wording follows the repository policy: stable describes shipped public contracts, experimental describes explicitly labeled opt-in surfaces, and unsupported marks boundaries the contract refuses.

The package and application APIs remain additive. Existing `1.12.3` imports,
rendering behavior, SSR request isolation, and store behavior remain supported;
the new capabilities are opt-in through their documented public entry points.
