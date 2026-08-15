import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import {
  GluonLanguageService,
  GluonProtocolServer,
  analyzeGluonDocument,
  analyzeGluonProject,
  analyzeStaticGluonProject,
  declarationsFromCustomElementsManifest,
} from '../packages/language-server/src/index.js';
import { parseGluonSfc } from '../packages/compiler/src/index.js';

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
  test('emits a deterministic versioned project inventory with explicit confidence', () => {
    const documents = [
      { uri: 'src/server.ts', text: `
        import { html, css, GluonElement } from '@gluonjs/core';
        import { defineStore } from '@gluonjs/store';
        import { renderRequest } from '@gluonjs/ssr';
        import './shop-styles.js';
        export class ProductCard extends GluonElement { render() { return html\`<button @click=\${() => {}}>Buy</button>\`; } }
        export const ProductGrid = () => html\`<section class=\${'grid'}>Grid</section>\`;
        export const sheet = css\`:host { display: block; }\`;
        export const store = defineStore('shop', () => ({}));
        export const routes = [{ path: '/shop' }, { path: getDynamicPath() }];
        void renderRequest;
      ` },
      { uri: 'src/element.ts', text: declaration },
    ];
    const first = analyzeStaticGluonProject(documents);
    const second = analyzeStaticGluonProject([...documents].reverse());
    expect(second).toEqual(first);
    expect(first.schemaVersion).toBe(1);
    expect(first.files.map((entry) => entry.file)).toEqual(['src/element.ts', 'src/server.ts']);
    expect(first.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ confidence: 'structural', value: { name: 'ProductCard', kind: 'class' } }),
      expect.objectContaining({ confidence: 'structural', value: { name: 'ProductGrid', kind: 'function' } }),
    ]));
    expect(first.elements[0]?.value.tagName).toBe('status-card');
    expect(first.bindings).toEqual(expect.arrayContaining([
      expect.objectContaining({ confidence: 'structural', value: { kind: 'event', name: 'click' } }),
      expect.objectContaining({ confidence: 'structural', value: { kind: 'attribute', name: 'class' } }),
    ]));
    expect(first.styles.map((entry) => entry.value.kind)).toEqual(expect.arrayContaining(['constructable-template', 'module-import']));
    expect(first.routes).toEqual(expect.arrayContaining([
      expect.objectContaining({ confidence: 'exact', value: { path: '/shop' } }),
      expect.objectContaining({ confidence: 'indeterminate', value: {} }),
    ]));
    expect(first.stores[0]).toEqual(expect.objectContaining({ confidence: 'exact', value: { name: 'shop' } }));
  });

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
    expect(declarationsFromCustomElementsManifest('file:///missing-modules.json', {})).toEqual([]);
    expect(declarationsFromCustomElementsManifest('file:///partial.json', {
      modules: [
        null,
        {},
        { declarations: null },
        { declarations: [
          null,
          {},
          { customElement: false, tagName: 'not-custom' },
          { customElement: true, tagName: 42 },
          { customElement: true, tagName: 'empty-contract' },
        ] },
      ],
    })).toEqual([
      expect.objectContaining({
        tagName: 'empty-contract',
        props: [],
        events: [],
        slots: [],
      }),
    ]);
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
  test('parses .gluon SFCs through the compiler and isolates malformed input', () => {
    const service = new GluonLanguageService();
    const valid = '<template component="Status" props="StatusProps" layer="atom"><p>{{ label }}</p></template>\n<script lang="ts">export interface StatusProps { label: string; }</script>\n<style id="status" />';
    expect(service.open('file:///Status.gluon', valid).diagnostics).toEqual([]);
    expect(service.open('file:///Broken.gluon', '<template><div></template>').diagnostics.length).toBeGreaterThan(0);
    expect(service.analysis('file:///Status.gluon')).toBeDefined();
  });

  test('maps every SFC feature to exact template and script offsets', () => {
    const service = new GluonLanguageService();
    const componentUri = 'file:///Card.gluon';
    const useUri = 'file:///Use.gluon';
    const component = `<script lang="ts">\nimport { defineElement } from '@gluonjs/core';\nclass Card { static properties = { status: String }; static events = { save: null }; }\nconst unrelated = 'status-card';\ndefineElement('status-card', Card);\n</script>\n<template component="Card" layer="atom">\n  <status-card></status-card>\n</template>\n<style>.card { color: red; }</style>`;
    const use = `<script lang="ts">\nimport Card from './Card.gluon';\nexport const view = Card;\n</script>\n<template component="Use" layer="molecule">\n  <status-card .status="ready" @save="save"></status-card>\n</template>`;
    service.open(componentUri, component);
    service.open(useUri, use);

    const tagOffset = use.indexOf('status-card');
    const tagPosition = positionFor(use, tagOffset + 2);
    const tagRange = (value: { range: { start: Position; end: Position } }) =>
      textForRange(use, value.range);
    const completion = service.complete(useUri, positionFor(use, use.indexOf('.status') + 2));
    expect(completion).toEqual(expect.arrayContaining([
      { label: '.status', kind: 10, detail: 'Gluon property' },
    ]));
    const hover = service.hover(useUri, tagPosition);
    expect(hover?.contents).toContain('**<status-card>**');
    expect(hover && tagRange(hover)).toBe('status-card');
    const definition = service.definition(useUri, tagPosition);
    expect(definition).toEqual([{ uri: componentUri, range: rangeForText(component, 'status-card', 1) }]);
    expect(service.references(useUri, tagPosition, { includeDeclaration: false })).toEqual([
      { uri: componentUri, range: rangeForText(component, 'status-card', 2) },
      { uri: componentUri, range: rangeForText(component, 'status-card', 3) },
      { uri: useUri, range: rangeForText(use, 'status-card') },
      { uri: useUri, range: rangeForText(use, 'status-card', 1) },
    ]);
    const rename = service.rename(useUri, tagPosition, 'state-card');
    expect(rename?.changes[useUri]).toEqual([
      { range: rangeForText(use, 'status-card'), newText: 'state-card' },
      { range: rangeForText(use, 'status-card', 1), newText: 'state-card' },
    ]);
    expect(rename?.changes[componentUri]).toEqual([
      { range: rangeForText(component, 'status-card', 1), newText: 'state-card' },
      { range: rangeForText(component, 'status-card', 2), newText: 'state-card' },
      { range: rangeForText(component, 'status-card', 3), newText: 'state-card' },
    ]);
  });

  test('keeps malformed SFCs isolated and does not invent cross-boundary results', () => {
    const service = new GluonLanguageService();
    const valid = '<template component="Valid" layer="atom"><status-card /></template>';
    service.open('file:///valid.gluon', valid);
    const malformed = '<template component="Broken"><status-card></template><script>';
    const analysis = service.open('file:///broken.gluon', malformed);
    expect(analysis.diagnostics.some((entry) => entry.code === 'GLUON_SFC_INVALID')).toBe(true);
    expect(service.hover('file:///valid.gluon', positionFor(valid, valid.indexOf('status-card') + 2))).toBeUndefined();
    expect(service.references('file:///broken.gluon', { line: 0, character: 20 })).toEqual([]);
  });

  test('links component imports and static style classes across every SFC block boundary', () => {
    const service = new GluonLanguageService();
    const cardUri = 'file:///components/Card.gluon';
    const useUri = 'file:///components/Use.gluon';
    const card = `<script lang="ts">\nexport interface CardProps { label: string }\n</script>\n<template component="Card" props="CardProps" layer="atom"><article class="card">Card</article></template>\n<style id="card-style">.card { color: navy; }</style>`;
    const use = `<script lang="ts">\nimport Card from './Card.gluon';\nexport const Selected = Card;\n</script>\n<template component="Use" layer="molecule"><section class="card featured">Use</section></template>\n<style id="use-style">.card { padding: 1rem; }\n.featured { font-weight: 700; }</style>`;
    service.open(cardUri, card);
    service.open(useUri, use);

    const componentPosition = positionFor(use, use.indexOf('Use', use.indexOf('<template')) + 1);
    const importedComponentPosition = positionFor(use, use.indexOf('Card') + 1);
    const importPathPosition = positionFor(use, use.indexOf('./Card.gluon') + 3);
    const classPosition = positionFor(use, use.indexOf('card featured') + 2);
    expect(service.complete(useUri, componentPosition)).toEqual(expect.arrayContaining([
      { label: 'Use', kind: 12, detail: 'Gluon SFC component name' },
    ]));
    expect(service.complete(useUri, classPosition)).toEqual(expect.arrayContaining([
      { label: 'card', kind: 10, detail: 'Gluon SFC style class' },
      { label: 'featured', kind: 10, detail: 'Gluon SFC style class' },
    ]));
    expect(service.complete(useUri, importPathPosition)).toEqual(expect.arrayContaining([
      { label: './Card.gluon', kind: 12, detail: cardUri },
    ]));
    expect(service.hover(useUri, importPathPosition)?.contents).toContain('Open Gluon SFC module');
    expect(service.definition(useUri, importPathPosition)).toEqual([
      { uri: cardUri, range: rangeForText(card, 'Card', 1) },
    ]);
    expect(service.definition(useUri, importedComponentPosition)).toEqual([
      { uri: cardUri, range: rangeForText(card, 'Card', 1) },
    ]);
    expect(service.definition(useUri, componentPosition)).toEqual([
      { uri: useUri, range: rangeForText(use, 'Use') },
    ]);
    expect(service.references(cardUri, positionFor(card, card.indexOf('Card', card.indexOf('<template')) + 1))).toEqual(expect.arrayContaining([
      { uri: cardUri, range: rangeForText(card, 'Card', 1) },
      { uri: useUri, range: rangeForText(use, 'Card') },
      { uri: useUri, range: rangeForText(use, 'Card', 2) },
    ]));
    expect(service.rename(useUri, importedComponentPosition, 'ProductCard')).toEqual({ changes: {
      [useUri]: [
        { range: rangeForText(use, 'Card'), newText: 'ProductCard' },
        { range: rangeForText(use, 'Card', 2), newText: 'ProductCard' },
      ],
    } });
    expect(service.rename(useUri, componentPosition, 'ProductView')).toEqual({ changes: {
      [useUri]: [{ range: rangeForText(use, 'Use'), newText: 'ProductView' }],
    } });
    expect(service.rename(useUri, classPosition, 'product-card')).toEqual({ changes: {
      [useUri]: [
        { range: rangeForText(use, 'card'), newText: 'product-card' },
        { range: rangeForText(use, 'card', 1), newText: 'product-card' },
      ],
    } });
    expect(service.rename(useUri, importPathPosition, 'Renamed.gluon')).toBeUndefined();
    expect(service.open('file:///components/BrokenScript.gluon', '<script lang="ts">const =</script><template component="Broken" layer="atom"><div /></template>').diagnostics)
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'GLUON_SFC_INVALID' })]));
  });

  test('keeps unresolved SFC imports and local style symbols navigable without invented targets', () => {
    const service = new GluonLanguageService();
    const firstUri = 'file:///components/First.gluon';
    const secondUri = 'file:///components/Second.gluon';
    const first = `<script lang="ts">\nimport Missing from './Missing.gluon';\nexport const Selected = Missing;\n</script>\n<template component="First" layer="molecule"><section class="local">First</section></template>\n<style>.local { color: navy; }</style>`;
    const second = `<script lang="ts">\nimport Missing from './Missing.gluon';\nexport const Selected = Missing;\n</script>\n<template component="Second" layer="molecule"><section>Second</section></template>`;
    service.open(firstUri, first);
    service.open(secondUri, second);

    const importPath = positionFor(first, first.indexOf('./Missing.gluon') + 3);
    const importedComponent = positionFor(first, first.indexOf('Missing') + 2);
    const localClass = positionFor(first, first.indexOf('local') + 2);
    expect(service.hover(firstUri, importPath)?.contents).toContain('Unresolved Gluon SFC module');
    expect(service.hover(firstUri, importedComponent)?.contents).toContain('Imported Gluon SFC component');
    expect(service.hover(firstUri, localClass)?.contents).toContain('Gluon SFC style class');
    expect(service.definition(firstUri, importPath)).toEqual([]);
    expect(service.definition(firstUri, importedComponent)).toEqual([]);
    expect(service.references(firstUri, importPath)).toHaveLength(2);
    expect(service.rename(firstUri, localClass, '123 invalid')).toBeUndefined();
  });

  test('exposes all typed SFC blocks and protocol features on the real shop fixture', async () => {
    const source = await readFile(new URL('../examples/shop/src/shop-editorial-link.gluon', import.meta.url), 'utf8');
    const parsed = parseGluonSfc(source, 'shop-editorial-link.gluon');
    expect(parsed.errors).toEqual([]);
    expect(parsed.blocks.map((block) => block.type)).toEqual(['template', 'script', 'style']);
    expect(parsed.blocks.every((block) => block.range.end > block.range.start)).toBe(true);

    const server = new GluonProtocolServer();
    const uri = 'file:///shop-editorial-link.gluon';
    const opened = server.handle({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: { textDocument: { uri, languageId: 'gluon', text: source } },
    });
    expect(opened[0]?.params).toMatchObject({ uri });
    const featureUri = 'file:///feature.gluon';
    const featureSource = `<script lang="ts">
import { defineElement } from '@gluonjs/core';
class DemoCard {}
defineElement('demo-card', DemoCard);
</script>
<template component="Feature" layer="atom"><demo-card /></template>`;
    server.handle({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: featureUri, languageId: 'gluon', text: featureSource } } });
    const templateOffset = featureSource.lastIndexOf('demo-card') + 2;
    const position = positionFor(featureSource, templateOffset);
    const requests = [
      ['textDocument/completion', { textDocument: { uri: featureUri }, position }],
      ['textDocument/hover', { textDocument: { uri: featureUri }, position }],
      ['textDocument/definition', { textDocument: { uri: featureUri }, position }],
      ['textDocument/references', { textDocument: { uri: featureUri }, position, context: { includeDeclaration: false } }],
      ['textDocument/rename', { textDocument: { uri: featureUri }, position, newName: 'new-demo-card' }],
      ['textDocument/semanticTokens/full', { textDocument: { uri: featureUri }, position }],
    ] as const;
    const responses = requests.map(([method, params], index) => server.handle({ jsonrpc: '2.0', id: index + 1, method, params })[0]);
    expect(responses[0]?.result).toEqual(expect.arrayContaining([
      { label: 'demo-card', kind: 12, detail: 'Gluon Custom Element' },
    ]));
    expect(responses[1]?.result).toEqual({
      contents: '**<demo-card>**\n\nProperties: none\n\nEvents: none',
      range: rangeForText(featureSource, 'demo-card', 1),
    });
    expect(responses[2]?.result).toEqual([
      { uri: featureUri, range: rangeForText(featureSource, 'demo-card') },
    ]);
    expect(responses[3]?.result).toEqual([
      { uri: featureUri, range: rangeForText(featureSource, 'demo-card', 1) },
    ]);
    expect(responses[4]?.result).toEqual({ changes: {
      [featureUri]: [
        { range: rangeForText(featureSource, 'demo-card'), newText: 'new-demo-card' },
        { range: rangeForText(featureSource, 'demo-card', 1), newText: 'new-demo-card' },
      ],
    } });
    expect(responses[5]?.result).toEqual({ data: expect.arrayContaining([expect.any(Number)]) });
  });

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
    expect(service.references('file:///use.ts', position)).toEqual(expect.arrayContaining([
      expect.objectContaining({ uri: 'file:///use.ts' }),
      expect.objectContaining({ uri: 'file:///component.ts' }),
    ]));
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

function rangeForText(text: string, value: string, occurrence = 0) {
  let offset = -1;
  for (let index = 0; index <= occurrence; index += 1) offset = text.indexOf(value, offset + 1);
  if (offset < 0) throw new Error(`fixture text not found: ${value}#${occurrence}`);
  return { start: positionFor(text, offset), end: positionFor(text, offset + value.length) };
}
