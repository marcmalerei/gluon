import { getGluonDiagnostic } from '@gluonjs/compiler';
import { analyzeGluonDocument, getGluonApiManifest, type ProjectDocument } from './index.js';

export interface McpRequest {
  readonly jsonrpc: '2.0';
  readonly id?: number | string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

export interface McpResponse {
  readonly jsonrpc: '2.0';
  readonly id?: number | string;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
}

const tools = Object.freeze([
  {
    name: 'get_api_manifest',
    description: 'Return the versioned Gluon public API and validation manifest.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'explain_error',
    description: 'Explain one stable Gluon diagnostic code and its repair pattern.',
    inputSchema: { type: 'object', required: ['code'], properties: { code: { type: 'string' } }, additionalProperties: false },
  },
  {
    name: 'validate_code',
    description: 'Analyze one Gluon source document without executing application code.',
    inputSchema: {
      type: 'object', required: ['text'],
      properties: { uri: { type: 'string' }, text: { type: 'string' } }, additionalProperties: false,
    },
  },
] as const);

/** Small read-only MCP surface backed by the same manifest and diagnostics as CI/editor tooling. */
export class GluonMcpServer {
  handle(request: McpRequest): McpResponse {
    try {
      if (request.method === 'initialize') {
        return { jsonrpc: '2.0', id: request.id, result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: '@gluonjs/language-server', version: '1.12.3' },
          capabilities: { tools: {} },
        } };
      }
      if (request.method === 'notifications/initialized' || request.method === 'ping') {
        return { jsonrpc: '2.0', ...(request.id === undefined ? {} : { id: request.id }), result: {} };
      }
      if (request.method === 'tools/list') return { jsonrpc: '2.0', id: request.id, result: { tools } };
      if (request.method === 'tools/call') return this.callTool(request);
      throw new Error(`MCP_METHOD_NOT_FOUND: ${request.method}`);
    } catch (error) {
      return {
        jsonrpc: '2.0',
        ...(request.id === undefined ? {} : { id: request.id }),
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  private callTool(request: McpRequest): McpResponse {
    const params = request.params ?? {};
    const name = params.name;
    const arguments_ = params.arguments && typeof params.arguments === 'object'
      ? params.arguments as Record<string, unknown>
      : {};
    let value: unknown;
    if (name === 'get_api_manifest') value = getGluonApiManifest();
    else if (name === 'explain_error') {
      const code = arguments_.code;
      if (typeof code !== 'string') throw new TypeError('MCP_TOOL_ARGUMENT_INVALID: code must be a string.');
      value = getGluonDiagnostic(code) ?? { code, message: 'Unknown Gluon diagnostic code.' };
    } else if (name === 'validate_code') {
      if (typeof arguments_.text !== 'string') throw new TypeError('MCP_TOOL_ARGUMENT_INVALID: text must be a string.');
      const document: ProjectDocument = { uri: typeof arguments_.uri === 'string' ? arguments_.uri : 'inline.ts', text: arguments_.text };
      value = analyzeGluonDocument(document.uri, document.text);
    } else throw new Error(`MCP_TOOL_NOT_FOUND: ${String(name)}`);
    return { jsonrpc: '2.0', id: request.id, result: { content: [{ type: 'text', text: JSON.stringify(value) }] } };
  }
}
