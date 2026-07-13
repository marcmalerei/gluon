import { GluonLanguageService, type Position } from './index.js';

export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id?: number | string;
  readonly method: string;
  readonly params?: any;
}

export interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id?: number | string;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
  readonly method?: string;
  readonly params?: unknown;
}

export class GluonProtocolServer {
  readonly service = new GluonLanguageService();
  private shutdownRequested = false;

  handle(message: JsonRpcRequest): readonly JsonRpcResponse[] {
    try {
      const result = this.dispatch(message);
      if (message.id === undefined) return result.notifications;
      return [{ jsonrpc: '2.0', id: message.id, result: result.value }, ...result.notifications];
    } catch (error) {
      if (message.id === undefined) return [];
      return [{
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
      }];
    }
  }

  private dispatch(message: JsonRpcRequest): { readonly value?: unknown; readonly notifications: readonly JsonRpcResponse[] } {
    const params = message.params ?? {};
    if (message.method === 'initialize') return { value: initializeResult, notifications: [] };
    if (message.method === 'initialized') return { notifications: [] };
    if (message.method === 'shutdown') { this.shutdownRequested = true; return { value: null, notifications: [] }; }
    if (message.method === 'exit') {
      if (!this.shutdownRequested) throw new Error('LSP_EXIT_BEFORE_SHUTDOWN');
      return { notifications: [] };
    }
    if (message.method === 'textDocument/didOpen') {
      const document = params.textDocument;
      const analysis = this.service.open(document.uri, document.text);
      return { notifications: [publishDiagnostics(document.uri, analysis.diagnostics)] };
    }
    if (message.method === 'textDocument/didChange') {
      const document = params.textDocument;
      const text = params.contentChanges?.at(-1)?.text;
      if (typeof text !== 'string') throw new Error('LSP_INCREMENTAL_CHANGE_UNSUPPORTED');
      const analysis = this.service.update(document.uri, text);
      return { notifications: [publishDiagnostics(document.uri, analysis.diagnostics)] };
    }
    if (message.method === 'textDocument/didClose') {
      this.service.close(params.textDocument.uri);
      return { notifications: [publishDiagnostics(params.textDocument.uri, [])] };
    }
    const uri = params.textDocument?.uri;
    const position = params.position as Position;
    if (message.method === 'textDocument/completion') return { value: this.service.complete(uri, position), notifications: [] };
    if (message.method === 'textDocument/hover') return { value: this.service.hover(uri, position) ?? null, notifications: [] };
    if (message.method === 'textDocument/definition') return { value: this.service.definition(uri, position), notifications: [] };
    if (message.method === 'textDocument/rename') return { value: this.service.rename(uri, position, params.newName) ?? null, notifications: [] };
    if (message.method === 'textDocument/semanticTokens/full') return { value: { data: this.service.semanticTokens(uri) }, notifications: [] };
    throw new Error(`LSP_METHOD_NOT_FOUND: ${message.method}`);
  }
}

const initializeResult = Object.freeze({
  serverInfo: { name: '@gluonjs/language-server', version: '1.0.1' },
  capabilities: {
    textDocumentSync: 1,
    completionProvider: { triggerCharacters: ['<', ' ', '.', '@'] },
    hoverProvider: true,
    definitionProvider: true,
    renameProvider: { prepareProvider: false },
    semanticTokensProvider: {
      full: true,
      legend: { tokenTypes: ['class', 'property'], tokenModifiers: [] },
    },
  },
});

function publishDiagnostics(uri: string, diagnostics: readonly unknown[]): JsonRpcResponse {
  return { jsonrpc: '2.0', method: 'textDocument/publishDiagnostics', params: { uri, diagnostics } };
}
