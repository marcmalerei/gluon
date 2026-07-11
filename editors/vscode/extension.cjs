const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');

let client;

async function activate(context) {
  const command = vscode.workspace.getConfiguration('gluon').get('languageServerPath');
  const serverOptions = { command, args: ['--stdio'], transport: TransportKind.stdio };
  const clientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'javascriptreact' },
    ],
  };
  client = new LanguageClient('gluon', 'Gluon Language Server', serverOptions, clientOptions);
  context.subscriptions.push(client);
  await client.start();
}

async function deactivate() {
  if (client) await client.stop();
}

module.exports = { activate, deactivate };
