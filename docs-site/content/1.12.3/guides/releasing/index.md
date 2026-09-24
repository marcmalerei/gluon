# Release readiness

The `1.12.3` documentation describes the current lockstep release candidate.
The candidate includes the additive public APIs delivered by issues #521-#524:
provider-independent analytics, request-scoped tenant context, machine-readable
agent tooling, and opt-in store persistence.

The release group contains 21 public packages. All package manifests and
official internal dependencies are pinned to `1.12.3`, while the registry
contract records `1.12.2` as the current `latest` baseline and confirms that
`1.12.3` has not been published.

The protected `v1.12.3` tag must not be created until the candidate passes the
complete repository Quality Gates. The release cut then records only the exact
tested commit, its successful Quality Gates run, compatibility evidence, and
the required operator preflight. Publication uses the protected tag workflow,
npm trusted publishing, provenance, and the `latest` dist-tag.

The release runbook is maintained in
[`docs/releasing.md`](https://github.com/marcmalerei/gluon/blob/main/docs/releasing.md).
Validate the candidate with:

```sh
npm run check:release-contract -- --candidate 1.12.3
```

Release-state wording follows the repository policy: stable describes shipped public contracts, experimental describes explicitly labeled opt-in surfaces, and unsupported marks boundaries the contract refuses.

The package and application APIs remain additive. Existing `1.12.2` imports,
rendering behavior, SSR request isolation, and store behavior remain supported;
the new capabilities are opt-in through their documented public entry points.
