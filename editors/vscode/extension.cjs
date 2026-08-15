const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');

let client;

async function activate(context) {
  const configuration = vscode.workspace.getConfiguration('gluon');
  const configuredPath = configuration.get('languageServerPath', '');
  const bundledServer = require('node:path').join(__dirname, 'server', 'dist', 'server-cli.js');
  const configuredArgs = configuration.get('languageServerArgs', ['--stdio']);
  const args = Array.isArray(configuredArgs) && configuredArgs.every((value) => typeof value === 'string')
    ? configuredArgs
    : ['--stdio'];
  const serverOptions = configuredPath.trim()
    ? { command: configuredPath.trim(), args, transport: TransportKind.stdio }
    : { module: bundledServer, args, transport: TransportKind.stdio };
  const clientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'javascriptreact' },
    ],
    outputChannelName: 'Gluon Language Server',
  };
  client = new LanguageClient('gluon', 'Gluon Language Server', serverOptions, clientOptions);
  context.subscriptions.push(client);
  await client.start();
}

async function deactivate() {
  if (client) await client.stop();
}

module.exports = { activate, deactivate };
