import { describe, expect, test } from 'vitest';
import {
  GluonLanguageService,
  GluonProtocolServer,
  analyzeGluonDocument,
  analyzeGluonProject,
  declarationsFromCustomElementsManifest,
} from '../packages/language-server/src/index.js';

const declaration = `
import { GluonElement, defineElement, html } from '@gluonjs/core';
class StatusCard extends GluonElement {
  static properties = { status: String };
  static events = { save: null };
  static slots = { default: null };
  render() { return html\`<p>\${this.status}</p>\`; }
}
defineElement('status-card', StatusCard);
`;

const consumer = `
import { html as view } from '@gluonjs/core';
export const page = view\`
  <status-card .missing=\${'value'} @unknown=\${() => {}} aria-labl="Status"></status-card>
  <missing-card></missing-card>
  <img>invalid</img>
  <\${'dynamic'}></\${'dynamic'}>
\`;
`;

describe('Gluon template analysis', () => {
  test('infers declarations and reports stable template diagnostics', () => {
    const analyses = analyzeGluonProject([
      { uri: 'file:///component.ts', text: declaration },
      { uri: 'file:///consumer.ts', text: consumer },
    ]);
    expect(analyses[0]?.declarations[0]).toMatchObject({
      tagName: 'status-card',
      props: ['status'],
      events: ['save'],
      slots: ['default'],
    });
    expect(analyses[1]?.diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      'GLUON_TEMPLATE_ARIA_UNKNOWN',
      'GLUON_TEMPLATE_BINDING_POSITION',
      'GLUON_TEMPLATE_CUSTOM_ELEMENT_UNKNOWN',
      'GLUON_TEMPLATE_EVENT_UNKNOWN',
      'GLUON_TEMPLATE_PROP_UNKNOWN',
      'GLUON_TEMPLATE_VOID_CHILDREN',
    ]));
  });

  test('shares compiler style diagnostics and understands SVG aliases', () => {
    const result = analyzeGluonDocument('file:///view.ts', `
      import { html, svg as icon } from '@gluonjs/core';
      html\`<style>p { color: red }</style><p>Text</p>\`;
      icon\`<svg><path></path><unknown-vector></unknown-vector></svg>\`;
    `);
    expect(result.diagnostics.map((entry) => entry.code)).toContain('GLUON_TEMPLATE_STYLE_ELEMENT');
    expect(result.diagnostics.map((entry) => entry.code)).toContain('GLUON_TEMPLATE_CUSTOM_ELEMENT_UNKNOWN');
  });

  test('analyzes native markup at original locations inside compose template bodies', () => {
    const source = `import { compose, html, type TemplateValue } from '@gluonjs/core';
      const Panel = (props: { children: TemplateValue }) => html\`<section>\${props.children}</section>\`;
      compose(Panel, {})\`<button aria-labl="Pay">Pay</button><img>invalid</img>\`;`;
    const result = analyzeGluonDocument('file:///compose.ts', source);
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      'GLUON_TEMPLATE_ARIA_UNKNOWN',
      'GLUON_TEMPLATE_VOID_CHILDREN',
    ]));
    expect(result.diagnostics.every((entry) => entry.range.start.line === 2)).toBe(true);
  });

  test('derives the public contract from a functional element definition', () => {
    const source = `
      import { defineGluonElement, html } from '@gluonjs/core';
      defineGluonElement({
        tagName: 'shop-quantity',
        properties: { value: Number, product: Object },
        events: { change: { cancelable: true } },
        slots: { default: { required: true }, help: { fallback: true } },
        setup: () => ({ render: () => html\`<slot></slot><slot name="help"></slot>\` }),
      });
      html\`<shop-quantity .value=\${1} .missing=\${1} @change=\${() => {}} @missing=\${() => {}}><span slot="help">Valid</span><span slot="shipping">Invalid</span></shop-quantity>\`;
    `;
    const result = analyzeGluonDocument('file:///quantity.ts', source);
    expect(result.declarations[0]).toMatchObject({
      tagName: 'shop-quantity',
      props: ['value', 'product'],
      events: ['change'],
      slots: ['default', 'help'],
    });
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      'GLUON_TEMPLATE_EVENT_UNKNOWN',
      'GLUON_TEMPLATE_PROP_UNKNOWN',
      'GLUON_TEMPLATE_SLOT_UNKNOWN',
    ]));
    expect(result.diagnostics).toHaveLength(3);
    const slotDiagnostic = result.diagnostics.find((entry) => entry.code === 'GLUON_TEMPLATE_SLOT_UNKNOWN');
    expect(slotDiagnostic?.range.start.line).toBe(9);
    expect(slotDiagnostic && textForRange(source, slotDiagnostic.range)).toBe('shipping');
  });

  test('derives public properties from aliased decorators and keeps state internal', () => {
    const source = `
      import { GluonElement, html } from '@gluonjs/core';
      import { customElement as element, property as prop, state } from '@gluonjs/core/decorators';
      @element('decorated-status')
      class DecoratedStatus extends GluonElement {
        static events = { save: null };
        static slots = { default: null };
        @prop({ reflect: true }) status = 'ready';
        @state() private renders = 0;
        render() { return html\`<slot></slot><p>\${this.status}</p>\`; }
      }
      html\`<decorated-status .status=\${'saved'} .renders=\${1} @save=\${() => {}}></decorated-status>\`;
    `;
    const result = analyzeGluonDocument('file:///decorated-status.ts', source);
    expect(result.declarations[0]).toMatchObject({
      tagName: 'decorated-status',
      props: ['status'],
      events: ['save'],
      slots: ['default'],
    });
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(['GLUON_TEMPLATE_PROP_UNKNOWN']);
  });

  test('accepts public Custom Elements Manifest metadata', () => {
    const declarations = declarationsFromCustomElementsManifest('file:///custom-elements.json', {
      modules: [{ declarations: [{
        customElement: true,
        tagName: 'manifest-card',
        members: [{ kind: 'field', name: 'status' }, { kind: 'method', name: 'save' }],
        events: [{ name: 'change' }],
        slots: [{ name: 'content' }],
      }] }],
    });
    expect(declarations[0]).toMatchObject({ props: ['status'], events: ['change'], slots: ['content'] });
    const analysis = analyzeGluonDocument(
      'file:///manifest-use.ts',
      "import { html } from '@gluonjs/core'; html`<manifest-card .status=${'ok'} @change=${() => {}}></manifest-card>`;",
      declarations,
    );
    expect(analysis.diagnostics).toEqual([]);
    expect(declarationsFromCustomElementsManifest('file:///invalid.json', null)).toEqual([]);
  });

  test('checks only direct literal light-DOM assignments against the owning element', () => {
    const result = analyzeGluonDocument('file:///slots.ts', `
      import { defineGluonElement, html } from '@gluonjs/core';
      defineGluonElement({
        tagName: 'slot-owner',
        slots: { help: { fallback: true } },
        setup: () => ({ render: () => html\`<slot name="help"></slot>\` }),
      });
      html\`<slot-owner><span slot="help">Valid</span><div><span slot="nested">Not assigned to the host</span></div></slot-owner>\`;
    `);
    expect(result.diagnostics).toEqual([]);
  });
});

describe('Gluon language service', () => {
  test('provides completion, hover, definition, rename, and semantic tokens across documents', () => {
    const service = new GluonLanguageService();
    service.open('file:///component.ts', declaration);
    const use = `import { html } from '@gluonjs/core';\nhtml\`<status-card .status=\${'ready'} @save=\${() => {}}></status-card>\`;`;
    service.open('file:///use.ts', use);
    const tagOffset = use.indexOf('status-card') + 2;
    const position = positionFor(use, tagOffset);
    expect(service.complete('file:///use.ts', positionFor(use, use.indexOf('.status'))).length).toBeGreaterThan(0);
    expect(service.hover('file:///use.ts', position)?.contents).toContain('Properties: status');
    expect(service.definition('file:///use.ts', position)).toEqual([
      expect.objectContaining({ uri: 'file:///component.ts' }),
    ]);
    const rename = service.rename('file:///use.ts', position, 'state-card');
    expect(rename?.changes['file:///component.ts']).toEqual(expect.arrayContaining([
      expect.objectContaining({ newText: 'state-card' }),
    ]));
    expect(rename?.changes['file:///use.ts']).toHaveLength(2);
    expect(service.semanticTokens('file:///use.ts').length).toBeGreaterThan(0);
    expect(service.rename('file:///use.ts', position, 'Invalid')).toBeUndefined();
    service.close('file:///component.ts');
    expect(service.definition('file:///use.ts', position)).toEqual([]);
  });

  test('returns safe empty and native-element results outside declared tags', () => {
    const service = new GluonLanguageService();
    expect(service.analysis('file:///missing.ts')).toBeUndefined();
    expect(service.complete('file:///missing.ts', { line: 0, character: 0 })).toEqual([]);
    expect(service.semanticTokens('file:///missing.ts')).toEqual([]);
    expect(service.hover('file:///missing.ts', { line: 0, character: 0 })).toBeUndefined();
    service.open('file:///native.ts', "import { html } from '@gluonjs/core'; html`<button disabled>Save</button>`;");
    expect(service.hover('file:///native.ts', { line: 0, character: 49 })?.contents).toContain('Native HTML');
    expect(service.complete('file:///native.ts', { line: 0, character: 47 }).some((entry) => entry.label === 'button')).toBe(true);
    expect(service.definition('file:///native.ts', { line: 0, character: 49 })).toEqual([]);
    expect(service.rename('file:///native.ts', { line: 0, character: 49 }, 'new-button')).toBeUndefined();
  });

  test('provides template-body editor features inside compose calls', () => {
    const service = new GluonLanguageService();
    const source = `import { compose, html, type TemplateValue } from '@gluonjs/core';
const Panel = (props: { children: TemplateValue }) => html\`<section>\${props.children}</section>\`;
compose(Panel, {})\`<button type="button">Pay</button>\`;`;
    service.open('file:///compose.ts', source);
    const button = positionFor(source, source.lastIndexOf('button') + 2);
    expect(service.hover('file:///compose.ts', button)?.contents).toContain('Native HTML');
    expect(service.complete('file:///compose.ts', button).some((entry) => entry.label === 'button')).toBe(true);
    expect(service.semanticTokens('file:///compose.ts').length).toBeGreaterThan(0);
  });
});

describe('Gluon LSP protocol', () => {
  test('exposes capabilities and publishes the same diagnostics as project analysis', () => {
    const server = new GluonProtocolServer();
    const initialized = server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(initialized[0]?.result).toMatchObject({ capabilities: { renameProvider: { prepareProvider: false } } });
    const opened = server.handle({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: { textDocument: { uri: 'file:///consumer.ts', text: consumer } },
    });
    const protocolCodes = (opened[0]?.params as any).diagnostics.map((entry: any) => entry.code);
    const cliCodes = analyzeGluonProject([{ uri: 'file:///consumer.ts', text: consumer }])[0]!.diagnostics.map((entry) => entry.code);
    expect(protocolCodes).toEqual(cliCodes);
    const changed = server.handle({
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: { textDocument: { uri: 'file:///consumer.ts' }, contentChanges: [{ text: declaration }] },
    });
    expect((changed[0]?.params as any).diagnostics).toEqual([]);
    expect(server.handle({ jsonrpc: '2.0', id: 2, method: 'shutdown' })[0]?.result).toBeNull();
    expect(server.handle({ jsonrpc: '2.0', method: 'exit' })).toEqual([]);
  });

  test('returns JSON-RPC errors for unsupported methods and malformed changes', () => {
    const server = new GluonProtocolServer();
    expect(server.handle({ jsonrpc: '2.0', id: 1, method: 'unknown' })[0]?.error?.message).toContain('LSP_METHOD_NOT_FOUND');
    expect(server.handle({
      jsonrpc: '2.0', id: 2, method: 'textDocument/didChange',
      params: { textDocument: { uri: 'file:///a.ts' }, contentChanges: [] },
    })[0]?.error?.message).toContain('LSP_INCREMENTAL_CHANGE_UNSUPPORTED');
    expect(server.handle({ jsonrpc: '2.0', id: 3, method: 'exit' })[0]?.error?.message).toContain('LSP_EXIT_BEFORE_SHUTDOWN');
    expect(server.handle({ jsonrpc: '2.0', method: 'unknown' })).toEqual([]);
  });

  test('routes editor feature requests and close notifications', () => {
    const server = new GluonProtocolServer();
    server.handle({ jsonrpc: '2.0', method: 'initialized' });
    server.handle({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///component.ts', text: declaration } } });
    const use = "import { html } from '@gluonjs/core'; html`<status-card></status-card>`;";
    server.handle({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///use.ts', text: use } } });
    const params = { textDocument: { uri: 'file:///use.ts' }, position: { line: 0, character: 50 } };
    expect(server.handle({ jsonrpc: '2.0', id: 1, method: 'textDocument/completion', params })[0]?.result).toBeDefined();
    expect(server.handle({ jsonrpc: '2.0', id: 2, method: 'textDocument/hover', params })[0]?.result).toBeDefined();
    expect(server.handle({ jsonrpc: '2.0', id: 3, method: 'textDocument/definition', params })[0]?.result).toBeDefined();
    expect(server.handle({ jsonrpc: '2.0', id: 4, method: 'textDocument/rename', params: { ...params, newName: 'state-card' } })[0]?.result).toBeDefined();
    expect(server.handle({ jsonrpc: '2.0', id: 5, method: 'textDocument/semanticTokens/full', params })[0]?.result).toBeDefined();
    const closed = server.handle({ jsonrpc: '2.0', method: 'textDocument/didClose', params: { textDocument: { uri: 'file:///use.ts' } } });
    expect((closed[0]?.params as any).diagnostics).toEqual([]);
  });
});

function positionFor(text: string, offset: number) {
  const before = text.slice(0, offset).split('\n');
  return { line: before.length - 1, character: before.at(-1)!.length };
}

function textForRange(text: string, range: { start: { line: number; character: number }; end: { line: number; character: number } }): string {
  const line = text.split('\n')[range.start.line] ?? '';
  return line.slice(range.start.character, range.end.character);
}
