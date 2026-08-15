# Gluon for VS Code

This client bundles the same-version `@gluonjs/language-server` runtime and
starts it over stdio for TypeScript, JavaScript, and first-class `.gluon`
documents. `.gluon` files use the registered `gluon` language id, maintained
language configuration, and TextMate syntax definition. Leave
`gluon.languageServerPath` empty to use that self-contained runtime, or set an
absolute/workspace-specific path for a deliberate override. The override is a
diagnostic escape hatch; it is not part of the release artifact contract.

## Distribution contract

The extension version advances with the lockstep Gluon release and the
`publisher`/repository metadata is part of the checked release surface. The
VSIX contains one same-version `@gluonjs/language-server` runtime and its
required compiler and TypeScript runtime dependencies; it does not introduce an
independently versioned compiler. Run `npm run check:vscode-client` from the
repository root before packaging.

## Install and package

Build and install the self-contained VSIX from a clean repository checkout:

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm run release:vscode
code --install-extension .tmp/release/vscode/gluon-vscode-1.9.0.vsix
```

The generated `.vsix` is a release artifact and is not committed. The release
job attaches it together with `VSIX-SHA256SUMS` and
`vscode-release-manifest.json` to the matching immutable GitHub release tag.

GLUON GOODS runtime remains unchanged: its existing
`src/shop-editorial-link.gluon` source is an honest parser and editor fixture,
while this issue changes authoring and protocol behavior rather than the
compiled customer flow.

## Publishing, signing, and recovery

Marketplace publication is guarded: the release workflow only runs `vsce
publish` when the `VSCE_PAT` secret is configured. The publisher is owned by
`marcmalerei`; a maintainer must provision that publisher account and token.
VSIX integrity is provided by the SHA-256 evidence and GitHub artifact
attestation; Marketplace signing/verification remains controlled by the
publisher service.

To roll back, unpublish or hide the affected extension version in the
`marcmalerei` Marketplace publisher account, then install a previously attached
VSIX manually with `code --install-extension <path> --force`. Never overwrite a
tag or regenerate a released VSIX under the same version.

Without `VSCE_PAT`, GitHub still publishes the reviewed VSIX and integrity
evidence while the guarded Marketplace step is skipped. Configuring that
credential is an explicit publisher-owner action.
