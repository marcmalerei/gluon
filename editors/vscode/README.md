# Gluon for VS Code

This client starts the same-version `gluon-language-server` over stdio for
TypeScript and JavaScript documents. Leave `gluon.languageServerPath` empty to
resolve the executable from `PATH`, or set an absolute/workspace-specific path
when the server is installed elsewhere. `gluon.languageServerArgs` defaults to
`["--stdio"]` and is validated before the client starts.

## Distribution contract

The extension version advances with the lockstep Gluon release and the
`publisher`/repository metadata is part of the checked release surface. The
extension does not bundle a second compiler or language server: the selected
server executable must be the matching `@gluonjs/language-server` distribution.
Run `npm run check:vscode-client` from the repository root before packaging.

## Install and package

Install the matching server and build the VSIX from the repository checkout:

```sh
npm install --global @gluonjs/language-server@1.8.1
cd editors/vscode
npm install
npm run package
code --install-extension gluon-vscode-1.8.1.vsix
```

The extension starts the installed server over stdio. The metadata gate and a
VSIX smoke build are release evidence; the generated `.vsix` is an operator
artifact and is not committed.

The repository currently provides the source and deterministic metadata gate;
Marketplace publication remains a separate operator action requiring the
publisher account and a VSIX signing/publishing decision.
