import ts from 'typescript';
import { analyzeGluonProject, type ProjectDocument, type TemplateDiagnostic } from './index.js';

export type AnalysisConfidence = 'exact' | 'structural' | 'indeterminate';

export interface ProjectEvidence<T> {
  readonly value: T;
  readonly confidence: AnalysisConfidence;
  readonly file: string;
  readonly line: number;
}

export interface ProjectAnalysisDiagnostic extends ProjectEvidence<TemplateDiagnostic> {}

export interface GluonProjectAnalysis {
  readonly schemaVersion: 1;
  readonly files: readonly ProjectEvidence<{ readonly language: 'javascript' | 'typescript' }>[];
  readonly components: readonly ProjectEvidence<{ readonly name: string; readonly kind: 'class' | 'function' }>[];
  readonly elements: readonly ProjectEvidence<{
    readonly tagName: string;
    readonly properties: readonly string[];
    readonly events: readonly string[];
    readonly slots: readonly string[];
  }>[];
  readonly templates: readonly ProjectEvidence<{ readonly kind: 'compose' | 'css' | 'html' | 'svg' }>[];
  readonly bindings: readonly ProjectEvidence<{ readonly kind: 'attribute' | 'child' | 'event' | 'property'; readonly name?: string }>[];
  readonly styles: readonly ProjectEvidence<{ readonly kind: 'constructable-template' | 'module-import'; readonly source?: string }>[];
  readonly routes: readonly ProjectEvidence<{ readonly path?: string }>[];
  readonly stores: readonly ProjectEvidence<{ readonly name?: string }>[];
  readonly ssrBoundaries: readonly ProjectEvidence<{ readonly api: string }>[];
  readonly diagnostics: readonly ProjectAnalysisDiagnostic[];
}

/** Machine-readable JSON Schema for the versioned static project report. */
export const GLUON_PROJECT_ANALYSIS_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://gluonjs.dev/schemas/project-analysis-v1.json',
  title: 'Gluon static project analysis',
  type: 'object',
  required: ['schemaVersion', 'files', 'components', 'elements', 'templates', 'bindings', 'styles', 'routes', 'stores', 'ssrBoundaries', 'diagnostics'],
  properties: { schemaVersion: { const: 1 } },
  additionalProperties: true,
} as const);

const templateApis = new Set(['compose', 'css', 'html', 'svg']);
const ssrApis = new Set([
  'generateStaticSite', 'hydrateApplication', 'hydrateRequestState', 'prepareForHydration',
  'renderProgressively', 'renderRequest', 'renderToChunks', 'renderToReadableStream',
  'renderToString', 'readHydrationState',
]);

/** Inventories verified static evidence without importing or executing application modules. */
export function analyzeStaticGluonProject(documents: readonly ProjectDocument[]): GluonProjectAnalysis {
  const ordered = [...documents].sort((left, right) => left.uri.localeCompare(right.uri));
  const shared = analyzeGluonProject(ordered);
  const files: GluonProjectAnalysis['files'][number][] = [];
  const components: GluonProjectAnalysis['components'][number][] = [];
  const elements: GluonProjectAnalysis['elements'][number][] = [];
  const templates: GluonProjectAnalysis['templates'][number][] = [];
  const bindings: GluonProjectAnalysis['bindings'][number][] = [];
  const styles: GluonProjectAnalysis['styles'][number][] = [];
  const routes: GluonProjectAnalysis['routes'][number][] = [];
  const stores: GluonProjectAnalysis['stores'][number][] = [];
  const ssrBoundaries: GluonProjectAnalysis['ssrBoundaries'][number][] = [];
  const diagnostics: ProjectAnalysisDiagnostic[] = [];

  for (const [index, document] of ordered.entries()) {
    const source = ts.createSourceFile(document.uri, document.text, ts.ScriptTarget.Latest, true, scriptKind(document.uri));
    const imports = collectImports(source);
    files.push(evidence(document.uri, 1, 'exact', {
      language: /\.tsx?$/.test(document.uri) ? 'typescript' : 'javascript',
    }));
    for (const declaration of shared[index]!.declarations) {
      elements.push(evidence(document.uri, declaration.range.start.line + 1, 'exact', {
        tagName: declaration.tagName,
        properties: declaration.props,
        events: declaration.events,
        slots: declaration.slots,
      }));
    }
    for (const diagnostic of shared[index]!.diagnostics) {
      diagnostics.push(evidence(document.uri, diagnostic.range.start.line + 1, 'exact', diagnostic));
    }

    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.name && extendsGluonElement(node, imports)) {
        components.push(atNode(source, document.uri, node.name, 'structural', { name: node.name.text, kind: 'class' }));
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
        && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
        && containsTemplate(node.initializer, imports)) {
        components.push(atNode(source, document.uri, node.name, 'structural', { name: node.name.text, kind: 'function' }));
      }
      if (ts.isTaggedTemplateExpression(node)) collectTemplateEvidence(node, source, document.uri, imports, templates, bindings, styles);
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)
        && /(?:styles?|theme)(?:\.[cm]?[jt]s)?$/.test(node.moduleSpecifier.text)) {
        styles.push(atNode(source, document.uri, node.moduleSpecifier, 'exact', { kind: 'module-import', source: node.moduleSpecifier.text }));
      }
      if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'path') {
        const path = literalText(node.initializer);
        routes.push(atNode(source, document.uri, node, path === undefined ? 'indeterminate' : 'exact', path === undefined ? {} : { path }));
      }
      if (ts.isCallExpression(node)) {
        const api = calledImport(node.expression, imports);
        if (api === 'defineStore') {
          const name = literalText(node.arguments[0]);
          stores.push(atNode(source, document.uri, node, name === undefined ? 'indeterminate' : 'exact', name === undefined ? {} : { name }));
        }
        if (api && ssrApis.has(api)) ssrBoundaries.push(atNode(source, document.uri, node, 'structural', { api }));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return Object.freeze({
    schemaVersion: 1,
    files: frozenSorted(files), components: frozenSorted(components), elements: frozenSorted(elements),
    templates: frozenSorted(templates), bindings: frozenSorted(bindings), styles: frozenSorted(styles),
    routes: frozenSorted(routes), stores: frozenSorted(stores), ssrBoundaries: frozenSorted(ssrBoundaries),
    diagnostics: frozenSorted(diagnostics),
  });
}

type Imports = Map<string, { readonly imported: string; readonly source: string }>;

function collectImports(source: ts.SourceFile): Imports {
  const imports: Imports = new Map();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const item of bindings.elements) {
      imports.set(item.name.text, { imported: item.propertyName?.text ?? item.name.text, source: statement.moduleSpecifier.text });
    }
  }
  return imports;
}

function collectTemplateEvidence(
  node: ts.TaggedTemplateExpression,
  source: ts.SourceFile,
  file: string,
  imports: Imports,
  templates: GluonProjectAnalysis['templates'][number][],
  bindings: GluonProjectAnalysis['bindings'][number][],
  styles: GluonProjectAnalysis['styles'][number][],
): void {
  const called = ts.isIdentifier(node.tag) ? imports.get(node.tag.text)?.imported
    : ts.isCallExpression(node.tag) ? calledImport(node.tag.expression, imports) : undefined;
  if (!called || !templateApis.has(called)) return;
  const kind = called as 'compose' | 'css' | 'html' | 'svg';
  templates.push(atNode(source, file, node, 'exact', { kind }));
  if (kind === 'css') styles.push(atNode(source, file, node, 'exact', { kind: 'constructable-template' }));
  if (!ts.isTemplateExpression(node.template)) return;
  const full = node.getText(source);
  for (const span of node.template.templateSpans) {
    const offset = span.expression.getStart(source) - node.getStart(source);
    const before = full.slice(Math.max(0, offset - 40), offset);
    const attribute = before.match(/([@.]?[\w:-]+)\s*=\s*[^=]*$/)?.[1];
    const kind = attribute?.startsWith('@') ? 'event' : attribute?.startsWith('.') ? 'property' : attribute ? 'attribute' : 'child';
    bindings.push(atNode(source, file, span.expression, attribute ? 'structural' : 'exact', {
      kind,
      ...(attribute ? { name: attribute.replace(/^[@.]/, '') } : {}),
    }));
  }
}

function extendsGluonElement(node: ts.ClassDeclaration, imports: Imports): boolean {
  return node.heritageClauses?.some((clause) => clause.types.some((type) =>
    ts.isIdentifier(type.expression) && imports.get(type.expression.text)?.imported === 'GluonElement')) ?? false;
}

function containsTemplate(node: ts.Node, imports: Imports): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (ts.isTaggedTemplateExpression(child)) {
      const api = ts.isIdentifier(child.tag) ? imports.get(child.tag.text)?.imported : undefined;
      if (api && templateApis.has(api)) found = true;
    }
    if (!found) ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function calledImport(expression: ts.Expression, imports: Imports): string | undefined {
  return ts.isIdentifier(expression) ? imports.get(expression.text)?.imported : undefined;
}

function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
}

function literalText(node: ts.Node | undefined): string | undefined {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
}

function atNode<T>(source: ts.SourceFile, file: string, node: ts.Node, confidence: AnalysisConfidence, value: T): ProjectEvidence<T> {
  return evidence(file, source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, confidence, value);
}

function evidence<T>(file: string, line: number, confidence: AnalysisConfidence, value: T): ProjectEvidence<T> {
  return Object.freeze({ value: Object.freeze(value), confidence, file, line });
}

function frozenSorted<T extends ProjectEvidence<unknown>>(entries: T[]): readonly T[] {
  return Object.freeze(entries.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line
    || JSON.stringify(left.value).localeCompare(JSON.stringify(right.value))));
}

function scriptKind(uri: string): ts.ScriptKind {
  if (/\.tsx$/i.test(uri)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(uri)) return ts.ScriptKind.JSX;
  if (/\.js$/i.test(uri)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
