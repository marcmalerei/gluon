import { parentPort } from 'node:worker_threads';
import { baseParse, NodeTypes, parserOptions } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';
import ts from 'typescript';
import type { InventoryCategory, InventoryKind, MigrationStage, RawBlock, RawFinding, RawInventory, WorkerResult } from './types.js';

interface WorkerRequest { readonly path: string; readonly kind: string; readonly source: string }

const reactivity = new Set(['ref', 'shallowRef', 'reactive', 'readonly', 'computed', 'watch', 'watchEffect', 'effectScope']);
const lifecycle = new Set(['onBeforeMount', 'onMounted', 'onBeforeUpdate', 'onUpdated', 'onBeforeUnmount', 'onUnmounted', 'onActivated', 'onDeactivated', 'onErrorCaptured', 'onServerPrefetch']);
const routerCalls = new Set(['createRouter', 'useRouter', 'useRoute', 'onBeforeRouteLeave', 'onBeforeRouteUpdate']);
const storeCalls = new Set(['defineStore', 'useStore', 'mapState', 'mapActions', 'mapGetters', 'mapWritableState']);
const asyncCalls = new Set(['defineAsyncComponent']);
const ssrCalls = new Set(['createSSRApp', 'renderToString', 'renderToNodeStream', 'pipeToNodeWritable']);
const hydrationCalls = new Set(['hydrate', 'createSSRApp']);
const nativeDirectives = new Set(['bind', 'on', 'model', 'slot', 'if', 'else-if', 'else', 'for', 'show', 'html', 'text', 'once', 'memo', 'pre']);

parentPort?.on('message', (request: WorkerRequest) => {
  try { parentPort?.postMessage({ ok: true, result: analyze(request) }); }
  catch (error) { parentPort?.postMessage({ ok: false, message: error instanceof Error ? error.message : 'Unknown parser failure.' }); }
});

function analyze(request: WorkerRequest): WorkerResult {
  const inventory: RawInventory[] = [];
  const findings: RawFinding[] = [];
  const blocks: RawBlock[] = [];
  let scriptMode: WorkerResult['scriptMode'] = null;
  let nodeCount = 0;
  let maxDepth = 0;

  const addInventory = (category: InventoryCategory, kind: InventoryKind, name: string | null, importSource: string | null, stage: MigrationStage, start: number, end: number, confidence: RawInventory['confidence'] = 'exact') => {
    inventory.push({ category, kind, name, importSource, confidence, stage, location: { start, end } });
  };
  const addFinding = (code: RawFinding['code'], severity: RawFinding['severity'], confidence: RawFinding['confidence'], message: string, stage: MigrationStage, start?: number, end?: number) => {
    findings.push({ code, severity, confidence, message, stage, location: start === undefined ? null : { start, end: end ?? start } });
  };

  const analyzeScript = (source: string, offset: number, jsx = false, typeScript = /\.[cm]?tsx?$/.test(request.path)) => {
    if (jsx) {
      addFinding('GVA1101', 'error', 'indeterminate', 'JSX and TSX script modes are unsupported.', 'leaf-boundary', offset, offset + source.length);
      return;
    }
    const file = ts.createSourceFile(request.path, source, ts.ScriptTarget.Latest, true, typeScript ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    const parseDiagnostics = (file as ts.SourceFile & { readonly parseDiagnostics?: readonly ts.DiagnosticWithLocation[] }).parseDiagnostics ?? [];
    for (const diagnostic of parseDiagnostics) {
      const start = offset + (diagnostic.start ?? 0);
      addFinding('GVA1103', 'error', 'indeterminate', 'Script syntax is malformed.', 'baseline', start, start + (diagnostic.length ?? 0));
    }
    const visit = (node: ts.Node, depth: number) => {
      nodeCount += 1;
      maxDepth = Math.max(maxDepth, depth);
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const sourceName = node.moduleSpecifier.text;
        const start = offset + node.getStart(file);
        const end = offset + node.end;
        if (sourceName === 'vue' || sourceName.startsWith('vue/')) addInventory('remaining-vue', 'vue-import', null, sourceName, 'shell-removal', start, end);
        if (sourceName === 'vue-router') {
          addInventory('router', 'router-import', null, sourceName, 'route-state-async', start, end, 'structural');
          addFinding('GVA1301', 'warning', 'structural', 'Router evidence requires route-owner redesign.', 'route-state-async', start, end);
        }
        if (sourceName === 'pinia' || sourceName === 'vuex') {
          addInventory('store', 'store-import', null, sourceName, 'route-state-async', start, end, 'structural');
          addFinding('GVA1302', 'warning', 'structural', 'Store evidence requires application/request ownership redesign.', 'route-state-async', start, end);
        }
        if (/test|vitest|jest/.test(sourceName)) {
          addInventory('test', 'test-import', null, sourceName, 'shell-removal', start, end, 'structural');
          addFinding('GVA1601', 'warning', 'structural', 'Test evidence requires a replacement or retention plan.', 'shell-removal', start, end);
        }
        if (sourceName === '@vitejs/plugin-vue') {
          addInventory('build', 'build-plugin', null, sourceName, 'shell-removal', start, end, 'structural');
          addFinding('GVA1601', 'warning', 'structural', 'Vue build-plugin evidence requires a removal plan.', 'shell-removal', start, end);
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        const start = offset + node.expression.getStart(file);
        const end = offset + node.expression.end;
        if (reactivity.has(name)) addInventory('reactivity-lifecycle', 'reactive-primitive', name, null, 'state-form', start, end);
        if (lifecycle.has(name)) addInventory('reactivity-lifecycle', 'lifecycle', name, null, 'state-form', start, end, 'structural');
        if (routerCalls.has(name)) addInventory('router', 'router-call', name, null, 'route-state-async', start, end, 'structural');
        if (storeCalls.has(name)) addInventory('store', 'store-call', name, null, 'route-state-async', start, end, 'structural');
        if (asyncCalls.has(name)) {
          addInventory('async', 'async-component', name, null, 'route-state-async', start, end, 'structural');
          addFinding('GVA1303', 'warning', 'structural', 'Async evidence requires cancellation and teardown redesign.', 'route-state-async', start, end);
        }
        if (ssrCalls.has(name)) {
          addInventory('ssr-hydration', 'ssr-call', name, null, 'styles-universal', start, end, 'structural');
          addFinding('GVA1501', 'warning', 'structural', 'SSR or hydration evidence requires single-renderer ownership review.', 'styles-universal', start, end);
        }
        if (hydrationCalls.has(name)) addInventory('ssr-hydration', 'hydration-call', name, null, 'styles-universal', start, end, 'structural');
        if (name === 'defineProps') extractDeclarationNames(node, file, offset, 'prop', addInventory);
        if (name === 'defineEmits') extractDeclarationNames(node, file, offset, 'emit', addInventory);
        if (name === 'defineModel') {
          const modelName = node.arguments[0] && ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : 'modelValue';
          addInventory('prop-event-model', 'model', modelName, null, 'leaf-boundary', start, end);
        }
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'component') {
        const start = offset + node.expression.getStart(file);
        const end = offset + node.expression.end;
        addFinding('GVA1203', 'warning', 'indeterminate', 'Runtime component registration requires review.', 'leaf-boundary', start, end);
      }
      if (ts.isExportAssignment(node)) {
        const expression = ts.isCallExpression(node.expression) && node.expression.arguments[0]
          ? node.expression.arguments[0]
          : node.expression;
        if (ts.isObjectLiteralExpression(expression)) inspectOptionsObject(expression, file, offset, addInventory);
      }
      ts.forEachChild(node, (child) => visit(child, depth + 1));
    };
    visit(file, 1);
  };

  if (request.kind !== 'sfc') {
    analyzeScript(request.source, 0, /\.[jt]sx$/.test(request.path));
    if (/vite\.config\./.test(request.path)) {
      addInventory('build', 'build-config', 'vite', null, 'shell-removal', 0, request.source.length, 'structural');
      addFinding('GVA1601', 'warning', 'structural', 'Vite build configuration requires a removal plan.', 'shell-removal', 0, request.source.length);
    }
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(request.path)) {
      addInventory('test', 'test-file', request.path.split('/').at(-1) ?? null, null, 'shell-removal', 0, request.source.length, 'structural');
      addFinding('GVA1601', 'warning', 'structural', 'Vue test file requires a replacement or retention plan.', 'shell-removal', 0, request.source.length);
    }
    return { inventory, findings, blocks, scriptMode, nodeCount, maxDepth };
  }

  const parsed = parseSfc(request.source, { filename: request.path, sourceMap: false });
  for (const error of parsed.errors) {
    const range = errorRange(error, request.source);
    addFinding('GVA1103', 'error', 'indeterminate', 'Single-File Component syntax is malformed.', 'baseline', range.start, range.end);
  }
  const descriptor = parsed.descriptor;
  scriptMode = descriptor.scriptSetup ? (descriptor.script ? 'setup-and-options' : 'setup') : (descriptor.script ? 'options' : 'none');
  const allBlocks = [descriptor.template, descriptor.script, descriptor.scriptSetup, ...descriptor.styles, ...descriptor.customBlocks].filter(Boolean);
  for (const block of allBlocks) {
    if (!block) continue;
    const kind = block === descriptor.template ? 'template' : block === descriptor.script ? 'script' : block === descriptor.scriptSetup ? 'script-setup' : descriptor.styles.includes(block as never) ? 'style' : 'custom';
    const start = block.loc.start.offset;
    const end = block.loc.end.offset;
    const attrs = block.attrs as Record<string, unknown>;
    blocks.push({ kind, lang: block.lang ?? null, scoped: Boolean('scoped' in block && block.scoped), module: 'module' in block && block.module ? String(block.module) : null, location: { start, end } });
    if (attrs.src !== undefined || kind === 'custom') addFinding('GVA1102', 'error', 'indeterminate', 'External and custom SFC blocks are unsupported.', 'leaf-boundary', start, end);
  }

  for (const block of [descriptor.script, descriptor.scriptSetup]) {
    if (!block) continue;
    const language = block.lang ?? 'js';
    if (!['js', 'ts'].includes(language)) addFinding('GVA1101', 'error', 'indeterminate', `Script language ${language} is unsupported.`, 'leaf-boundary', block.loc.start.offset, block.loc.end.offset);
    else analyzeScript(block.content, block.loc.start.offset, false, language === 'ts');
  }

  if (descriptor.template) {
    if (descriptor.template.lang) addFinding('GVA1101', 'error', 'indeterminate', 'Template preprocessors are unsupported.', 'leaf-boundary', descriptor.template.loc.start.offset, descriptor.template.loc.end.offset);
    else {
      try {
        const ast = baseParse(descriptor.template.content, parserOptions);
        const templateOffset = descriptor.template.loc.start.offset;
        const visitTemplate = (node: any, depth: number) => {
          nodeCount += 1;
          maxDepth = Math.max(maxDepth, depth);
          if (node.type === NodeTypes.ELEMENT) {
            const start = templateOffset + node.loc.start.offset;
            const end = templateOffset + node.loc.end.offset;
            const lower = String(node.tag).toLowerCase();
            const builtin = lower === 'suspense' ? 'suspense' : lower === 'teleport' ? 'teleport' : lower === 'keepalive' || lower === 'keep-alive' ? 'keep-alive' : null;
            const inventoryKind: InventoryKind = builtin ?? (node.tagType === 0 ? 'native-element' : 'component-element');
            addInventory(builtin ? 'async' : 'component', inventoryKind, node.tag, null, builtin ? 'route-state-async' : 'leaf-boundary', start, end, node.tagType === 0 ? 'exact' : 'structural');
            if (lower === 'slot') {
              const name = node.props?.find((property: any) => property.type === NodeTypes.ATTRIBUTE && property.name === 'name')?.value?.content ?? 'default';
              addInventory('slot-directive-ref', 'slot-use', name, null, 'leaf-boundary', start, end);
            }
            if (lower === 'component') addFinding('GVA1201', 'warning', 'indeterminate', 'Dynamic component identity requires review.', 'leaf-boundary', start, end);
            for (const property of node.props ?? []) {
              const propertyStart = templateOffset + property.loc.start.offset;
              const propertyEnd = templateOffset + property.loc.end.offset;
              if (property.type === NodeTypes.DIRECTIVE) {
                const directiveName = String(property.name);
                addInventory('slot-directive-ref', directiveName === 'slot' ? 'slot-declaration' : directiveName === 'model' ? 'model' : 'directive', staticArgument(property), null, directiveName === 'model' ? 'state-form' : 'leaf-boundary', propertyStart, propertyEnd, property.arg && property.arg.type !== NodeTypes.SIMPLE_EXPRESSION ? 'indeterminate' : 'structural');
                if (!nativeDirectives.has(directiveName)) addFinding('GVA1202', 'error', 'indeterminate', `Custom directive v-${directiveName} is unsupported.`, 'leaf-boundary', propertyStart, propertyEnd);
                else if (property.arg && property.arg.type !== NodeTypes.SIMPLE_EXPRESSION) addFinding('GVA1201', 'warning', 'indeterminate', 'Dynamic directive arguments require review.', 'leaf-boundary', propertyStart, propertyEnd);
              } else if (property.type === NodeTypes.ATTRIBUTE && property.name === 'ref') {
                addInventory('slot-directive-ref', 'ref', property.value?.content ?? null, null, 'leaf-boundary', propertyStart, propertyEnd);
              } else if (property.type === NodeTypes.ATTRIBUTE && node.tagType !== 0) {
                addInventory('prop-event-model', 'prop', property.name, null, 'leaf-boundary', propertyStart, propertyEnd, 'structural');
              }
            }
          }
          for (const child of node.children ?? []) visitTemplate(child, depth + 1);
          if (node.branches) for (const branch of node.branches) visitTemplate(branch, depth + 1);
        };
        visitTemplate(ast, 1);
      } catch {
        addFinding('GVA1103', 'error', 'indeterminate', 'Template syntax is malformed.', 'baseline', descriptor.template.loc.start.offset, descriptor.template.loc.end.offset);
      }
    }
  }

  for (const style of descriptor.styles) {
    const start = style.loc.start.offset;
    const end = style.loc.end.offset;
    const language = style.lang ?? 'css';
    addInventory('style', 'style-block', language, null, 'styles-universal', start, end, style.scoped || style.module ? 'structural' : 'exact');
    if (language !== 'css' || style.attrs.src !== undefined) addFinding('GVA1403', 'error', 'indeterminate', `Style language ${language} or external style source is unsupported.`, 'styles-universal', start, end);
    if (style.scoped) addFinding('GVA1401', 'warning', 'structural', 'Scoped-style behavior requires constructed-sheet review.', 'styles-universal', start, end);
    if (style.module) addFinding('GVA1402', 'warning', 'structural', 'CSS module behavior requires constructed-sheet review.', 'styles-universal', start, end);
    if (!balancedBraces(style.content)) addFinding('GVA1103', 'error', 'indeterminate', 'Style syntax is malformed.', 'baseline', start, end);
  }

  return { inventory, findings, blocks, scriptMode, nodeCount, maxDepth };
}

function extractDeclarationNames(node: ts.CallExpression, file: ts.SourceFile, offset: number, kind: 'prop' | 'emit', add: (category: InventoryCategory, kind: InventoryKind, name: string | null, importSource: string | null, stage: MigrationStage, start: number, end: number, confidence?: RawInventory['confidence']) => void): void {
  const names = new Set<string>();
  const argument = node.arguments[0];
  if (argument && ts.isArrayLiteralExpression(argument)) for (const item of argument.elements) if (ts.isStringLiteral(item)) names.add(item.text);
  if (argument && ts.isObjectLiteralExpression(argument)) for (const property of argument.properties) if ('name' in property && property.name) names.add(property.name.getText(file).replace(/^['"]|['"]$/g, ''));
  const type = node.typeArguments?.[0];
  if (type && ts.isTypeLiteralNode(type)) {
    for (const member of type.members) {
      if (ts.isPropertySignature(member) && member.name) names.add(member.name.getText(file).replace(/^['"]|['"]$/g, ''));
      if (kind === 'emit' && ts.isCallSignatureDeclaration(member)) {
        const eventType = member.parameters[0]?.type;
        if (eventType && ts.isLiteralTypeNode(eventType) && ts.isStringLiteral(eventType.literal)) names.add(eventType.literal.text);
      }
    }
  }
  const start = offset + node.getStart(file);
  const end = offset + node.end;
  if (names.size === 0) add('prop-event-model', kind, null, null, 'leaf-boundary', start, end, 'indeterminate');
  else for (const name of [...names].sort()) add('prop-event-model', kind, name, null, 'leaf-boundary', start, end);
}

function inspectOptionsObject(object: ts.ObjectLiteralExpression, file: ts.SourceFile, offset: number, add: (category: InventoryCategory, kind: InventoryKind, name: string | null, importSource: string | null, stage: MigrationStage, start: number, end: number, confidence?: RawInventory['confidence']) => void): void {
  for (const property of object.properties) {
    if (!('name' in property) || !property.name) continue;
    const key = property.name.getText(file).replace(/^['"]|['"]$/g, '');
    const start = offset + property.getStart(file);
    const end = offset + property.end;
    if ((key === 'props' || key === 'emits') && ts.isPropertyAssignment(property)) {
      const kind = key === 'props' ? 'prop' : 'emit';
      const names: string[] = [];
      if (ts.isObjectLiteralExpression(property.initializer)) for (const entry of property.initializer.properties) if ('name' in entry && entry.name) names.push(entry.name.getText(file).replace(/^['"]|['"]$/g, ''));
      if (ts.isArrayLiteralExpression(property.initializer)) for (const entry of property.initializer.elements) if (ts.isStringLiteral(entry)) names.push(entry.text);
      for (const name of names.sort()) add('prop-event-model', kind, name, null, 'leaf-boundary', start, end);
    }
    if (lifecycle.has(`on${key[0]?.toUpperCase()}${key.slice(1)}`) || ['beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'beforeUnmount', 'unmounted', 'activated', 'deactivated', 'errorCaptured', 'serverPrefetch'].includes(key)) {
      add('reactivity-lifecycle', 'lifecycle', key, null, 'state-form', start, end, 'structural');
    }
  }
}

function staticArgument(property: any): string | null {
  return property.arg?.type === NodeTypes.SIMPLE_EXPRESSION && property.arg.isStatic ? property.arg.content : null;
}

function balancedBraces(source: string): boolean {
  let depth = 0;
  for (const character of source) {
    if (character === '{') depth += 1;
    if (character === '}' && --depth < 0) return false;
  }
  return depth === 0;
}

function errorRange(error: unknown, source: string): { start: number; end: number } {
  if (error && typeof error === 'object' && 'loc' in error) {
    const loc = (error as { loc?: { start?: { offset?: number }; end?: { offset?: number } } }).loc;
    return { start: loc?.start?.offset ?? 0, end: loc?.end?.offset ?? loc?.start?.offset ?? source.length };
  }
  return { start: 0, end: source.length };
}
