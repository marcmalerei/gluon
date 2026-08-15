# Gluon for VS Code

This client bundles the same-version `@gluonjs/language-server` runtime and
starts it over stdio for TypeScript and JavaScript documents. Leave
`gluon.languageServerPath` empty to use that self-contained runtime, or set an
absolute/workspace-specific path for a deliberate override. The override is a
diagnostic escape hatch; it is not part of the release artifact contract.

## Distribution contract

The extension version advances with the lockstep Gluon release and the
`publisher`/repository metadata is part of the checked release surface. The
extension does not bundle a second compiler or language server: the selected
server executable must be the matching `@gluonjs/language-server` distribution.
Run `npm run check:vscode-client` from the repository root before packaging.

## Install and package

Build and install the self-contained VSIX from a clean repository checkout:

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm run release:vscode
code --install-extension gluon-vscode-1.9.0.vsix
```

The generated `.vsix` is a release artifact and is not committed. The release
job attaches it together with `VSIX-SHA256SUMS` and
`vscode-release-manifest.json` to the matching immutable GitHub release tag.

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

The repository currently provides the source and deterministic metadata gate;
Marketplace publication remains a separate operator action requiring the
publisher account and a VSIX signing/publishing decision.
