import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';
import { parse } from '@vue/compiler-sfc';
import { transformGluonModule } from '../packages/compiler/dist/index.js';

const root = resolve(import.meta.dirname, '..');
const fixtureRoot = resolve(root, 'benchmarks/dx/template-composition');
const fixtures = {
  'gluon-current': 'gluon-current.ts',
  'gluon-compose': 'gluon-compose.ts',
  react: 'react.tsx',
  vue: 'vue.vue',
};

const expected = JSON.parse(await readFile(resolve(fixtureRoot, 'evidence.json'), 'utf8'));
const actual = {};
for (const [name, file] of Object.entries(fixtures)) {
  const source = await readFile(resolve(fixtureRoot, file), 'utf8');
  if (!source.includes('Checkout') || !source.includes('Delivery') || !source.includes('Confirm order') || !source.includes('Email')) {
    throw new Error(`TEMPLATE_COMPOSITION_FIXTURE_PARITY: ${file} is missing a retained observable.`);
  }
  actual[name] = Object.freeze({
    nonEmptyLines: source.split('\n').filter((line) => line.trim()).length,
    tokens: tokenCount(source, file),
    maximumIndentation: Math.max(...source.split('\n').filter((line) => line.trim()).map((line) => line.length - line.trimStart().length)),
    explicitChildrenProperties: [...source.matchAll(/\bchildren\s*:/g)].length,
    callSiteChildrenProperties: file.endsWith('.vue') ? 0 : callSiteChildrenCount(source, file),
  });
}

if (JSON.stringify(actual) !== JSON.stringify(expected.metrics)) {
  throw new Error(`TEMPLATE_COMPOSITION_EVIDENCE_DRIFT\nExpected ${JSON.stringify(expected.metrics, null, 2)}\nActual ${JSON.stringify(actual, null, 2)}`);
}

execFileSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', resolve(fixtureRoot, 'tsconfig.json')], { stdio: 'inherit' });
execFileSync(process.execPath, [resolve(root, 'node_modules/vue-tsc/bin/vue-tsc.js'), '--noEmit', '-p', resolve(fixtureRoot, 'tsconfig.vue.json')], { stdio: 'inherit' });

const vueSource = await readFile(resolve(fixtureRoot, 'vue.vue'), 'utf8');
const parsed = parse(vueSource, { filename: 'vue.vue' });
if (parsed.errors.length > 0) throw new Error(`TEMPLATE_COMPOSITION_VUE_PARSE: ${parsed.errors.join('\n')}`);

const composeSource = await readFile(resolve(fixtureRoot, 'gluon-compose.ts'), 'utf8');
const transformed = transformGluonModule(composeSource, resolve(fixtureRoot, 'gluon-compose.ts'));
if (!transformed.templates.some((template) => template.tag === 'compose')) throw new Error('TEMPLATE_COMPOSITION_COMPILER_BOUNDARY_MISSING');
if (transformed.code !== composeSource || transformed.map.sourcesContent?.[0] !== composeSource) throw new Error('TEMPLATE_COMPOSITION_SOURCE_MAP_CONTRACT');

validateTypeScriptEditorContract(composeSource);

console.log(`Validated template composition evidence: ${Object.keys(fixtures).join(', ')}.`);

function tokenCount(source, file) {
  if (file.endsWith('.vue')) return source.match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s\w]/g)?.length ?? 0;
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, file.endsWith('.tsx') ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard, source);
  let count = 0;
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    if (scanner.getToken() !== ts.SyntaxKind.WhitespaceTrivia && scanner.getToken() !== ts.SyntaxKind.NewLineTrivia) count += 1;
  }
  return count;
}

function callSiteChildrenCount(source, file) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let count = 0;
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(sourceFile) === 'children') count += 1;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return count;
}

function validateTypeScriptEditorContract(composeSource) {
  const configFile = ts.readConfigFile(resolve(fixtureRoot, 'tsconfig.json'), ts.sys.readFile);
  if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, fixtureRoot);
  const composeFile = resolve(fixtureRoot, 'gluon-compose.ts');
  const completionFile = resolve(fixtureRoot, '__composition-completion.ts');
  const completionSource = `import { compose, html, type TemplateValue } from '@gluonjs/core';
interface PanelProps { title: string; onSave: (event: Event) => void; children: TemplateValue }
const Panel = (props: PanelProps) => html\`<section>\${props.children}</section>\`;
compose(Panel, {  })\`body\`;`;
  const files = new Map(parsed.fileNames.map((file) => [file, ts.sys.readFile(file) ?? '']));
  files.set(composeFile, composeSource);
  files.set(completionFile, completionSource);
  const service = ts.createLanguageService({
    getCompilationSettings: () => parsed.options,
    getScriptFileNames: () => [...files.keys()],
    getScriptVersion: () => '0',
    getScriptSnapshot: (file) => {
      const text = files.get(file) ?? ts.sys.readFile(file);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => root,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  });
  if (service.getSyntacticDiagnostics(composeFile).length || service.getSemanticDiagnostics(composeFile).length) {
    throw new Error('TEMPLATE_COMPOSITION_TYPESCRIPT_DIAGNOSTICS');
  }
  const shellPosition = composeSource.indexOf('compose(Shell') + 'compose('.length + 1;
  if (!service.getQuickInfoAtPosition(composeFile, shellPosition)) throw new Error('TEMPLATE_COMPOSITION_HOVER_MISSING');
  if (!service.getDefinitionAtPosition(composeFile, shellPosition)?.some((entry) => entry.fileName === composeFile)) throw new Error('TEMPLATE_COMPOSITION_DEFINITION_MISSING');
  if ((service.findRenameLocations(composeFile, shellPosition, false, false, true)?.length ?? 0) < 2) throw new Error('TEMPLATE_COMPOSITION_RENAME_MISSING');
  const completionPosition = completionSource.indexOf('{  }') + 2;
  const completions = service.getCompletionsAtPosition(completionFile, completionPosition, {});
  if (!completions?.entries.some((entry) => entry.name === 'title') || !completions.entries.some((entry) => entry.name === 'onSave')) {
    throw new Error('TEMPLATE_COMPOSITION_COMPLETION_MISSING');
  }
  const bodyStart = composeSource.indexOf(')`') + 2;
  const bodyEnd = composeSource.lastIndexOf('`;');
  const formatting = service.getFormattingEditsForDocument(composeFile, {
    indentSize: 2,
    tabSize: 2,
    convertTabsToSpaces: true,
    newLineCharacter: '\n',
    indentStyle: ts.IndentStyle.Smart,
  });
  if (formatting.some((edit) => edit.span.start < bodyEnd
    && edit.span.start + edit.span.length > bodyStart
    && (!/^\s*$/.test(edit.newText) || !/^\s*$/.test(composeSource.slice(edit.span.start, edit.span.start + edit.span.length))))) {
    throw new Error('TEMPLATE_COMPOSITION_FORMATTING_BOUNDARY');
  }
}
