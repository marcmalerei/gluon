import MagicString from 'magic-string';
import ts from 'typescript';

export type GluonTemplateTag = 'html' | 'css';

export interface SourceLocation {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface GluonTemplatePart {
  readonly index: number;
  readonly start: SourceLocation;
  readonly end: SourceLocation;
}

export interface GluonTemplateLocation {
  readonly tag: GluonTemplateTag;
  readonly start: SourceLocation;
  readonly end: SourceLocation;
  readonly parts: readonly GluonTemplatePart[];
}

export interface GluonCompilerDiagnostic {
  readonly code: 'GLUON_TEMPLATE_STYLE_ELEMENT';
  readonly message: string;
  readonly location: SourceLocation;
}

export interface GluonTransformOptions {
  readonly development?: boolean;
}

export interface GluonTransformResult {
  readonly code: string;
  readonly map: GluonSourceMap;
  readonly diagnostics: readonly GluonCompilerDiagnostic[];
  readonly templates: readonly GluonTemplateLocation[];
  readonly hmr: boolean;
}

export interface GluonSourceMap {
  file: string;
  mappings: string;
  names: string[];
  sources: string[];
  sourcesContent?: string[];
  version: number;
}

type TransformKind = 'component' | 'element' | 'store' | 'style';

const coreTransforms = new Map<string, TransformKind>([
  ['css', 'style'],
  ['defineAtom', 'component'],
  ['defineElement', 'element'],
  ['defineMolecule', 'component'],
  ['defineOrganism', 'component'],
]);

export function transformGluonModule(
  code: string,
  id: string,
  options: GluonTransformOptions = {},
): GluonTransformResult {
  const development = options.development ?? false;
  const sourceFile = ts.createSourceFile(
    id,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(id),
  );
  const transforms = collectImportedTransforms(sourceFile);
  const htmlTags = collectImportedNames(sourceFile, '@gluonjs/core', 'html');
  const magic = new MagicString(code);
  const templates: GluonTemplateLocation[] = [];
  const diagnostics: GluonCompilerDiagnostic[] = [];
  const exportStatements: string[] = [];
  let transformSequence = 0;
  let changed = false;

  const visit = (node: ts.Node): void => {
    if (ts.isTaggedTemplateExpression(node) && ts.isIdentifier(node.tag)) {
      const kind = transforms.get(node.tag.text);
      if (kind === 'style' || htmlTags.has(node.tag.text)) {
        const tag: GluonTemplateTag = kind === 'style' ? 'css' : 'html';
        templates.push(templateLocation(sourceFile, node, tag));
        if (tag === 'html') {
          const templateText = node.template.getText(sourceFile);
          const styleOffset = templateText.search(/<style(?:\s|>)/i);
          if (styleOffset >= 0) {
            diagnostics.push(Object.freeze({
              code: 'GLUON_TEMPLATE_STYLE_ELEMENT',
              message: 'Gluon browser styles use constructable stylesheets and adoptedStyleSheets; inline <style> elements are not supported.',
              location: locationAt(sourceFile, node.template.getStart(sourceFile) + styleOffset),
            }));
          }
        }
        if (development && kind === 'style') {
          const key = `style:${transformSequence++}`;
          magic.prependLeft(node.getStart(sourceFile), '__gluonHmrStyle(');
          magic.appendRight(node.end, `, import.meta.url, ${JSON.stringify(key)})`);
          changed = true;
        }
      }
    }

    if (development && ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const kind = transforms.get(node.expression.text);
      if (kind === 'element') {
        const key = `element:${transformSequence++}`;
        const initializerSignature = elementInitializerSignature(sourceFile, node.arguments[1]);
        const expressionStart = node.expression.getStart(sourceFile);
        const argumentsStart = node.arguments.pos;
        magic.overwrite(expressionStart, node.expression.end, '__gluonHmrElement');
        magic.prependLeft(argumentsStart, `${node.expression.text}, `);
        magic.appendLeft(
          node.end - 1,
          `, import.meta.url, ${JSON.stringify(key)}, ${JSON.stringify(initializerSignature)}, import.meta.hot`,
        );
        changed = true;
      } else if (kind === 'component' || kind === 'store') {
        const helper = kind === 'component' ? '__gluonHmrComponent' : '__gluonHmrStore';
        const key = `${kind}:${transformSequence++}`;
        magic.prependLeft(node.getStart(sourceFile), `${helper}(`);
        magic.appendRight(node.end, `, import.meta.url, ${JSON.stringify(key)})`);
        changed = true;
      }
    }

    if (development && ts.isFunctionDeclaration(node) && node.body && node.name
      && hasModifier(node, ts.SyntaxKind.ExportKeyword)
      && !hasModifier(node, ts.SyntaxKind.DefaultKeyword)) {
      const exportModifier = node.modifiers?.find((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (exportModifier) {
        magic.remove(exportModifier.getStart(sourceFile), exportModifier.end);
        const local = `__gluon_hmr_export_${node.name.text}`;
        exportStatements.push(
          `const ${local} = __gluonHmrComponent(${node.name.text}, import.meta.url, ${JSON.stringify(`export:${node.name.text}`)});\nexport { ${local} as ${node.name.text} };`,
        );
        changed = true;
      }
    }

    if (development && ts.isVariableStatement(node)
      && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        if (!ts.isArrowFunction(declaration.initializer)
          && !ts.isFunctionExpression(declaration.initializer)) continue;
        magic.prependLeft(declaration.initializer.getStart(sourceFile), '__gluonHmrComponent(');
        magic.appendRight(
          declaration.initializer.end,
          `, import.meta.url, ${JSON.stringify(`export:${declaration.name.text}`)})`,
        );
        changed = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (changed) {
    magic.prepend('import { accept as __gluonHmrAccept, component as __gluonHmrComponent, element as __gluonHmrElement, store as __gluonHmrStore, style as __gluonHmrStyle } from "virtual:gluon-hmr";\n');
    if (exportStatements.length > 0) magic.append(`\n${exportStatements.join('\n')}\n`);
    magic.append('\nif (import.meta.hot) import.meta.hot.accept(() => __gluonHmrAccept(import.meta.url));\n');
  }

  const map = magic.generateMap({
    file: id,
    source: id,
    includeContent: true,
    hires: true,
  });
  return Object.freeze({
    code: magic.toString(),
    map: JSON.parse(map.toString()) as GluonSourceMap,
    diagnostics: Object.freeze(diagnostics),
    templates: Object.freeze(templates),
    hmr: changed,
  });
}

function collectImportedTransforms(sourceFile: ts.SourceFile): Map<string, TransformKind> {
  const transforms = new Map<string, TransformKind>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const imports = statement.importClause?.namedBindings;
    if (!imports || !ts.isNamedImports(imports)) continue;
    const source = statement.moduleSpecifier.text;
    for (const entry of imports.elements) {
      const imported = entry.propertyName?.text ?? entry.name.text;
      const kind = source === '@gluonjs/core'
        ? coreTransforms.get(imported)
        : source === '@gluonjs/store' && imported === 'defineStore'
          ? 'store'
          : undefined;
      if (kind) transforms.set(entry.name.text, kind);
    }
  }
  return transforms;
}

function collectImportedNames(
  sourceFile: ts.SourceFile,
  moduleName: string,
  importedName: string,
): Set<string> {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== moduleName) continue;
    const imports = statement.importClause?.namedBindings;
    if (!imports || !ts.isNamedImports(imports)) continue;
    for (const entry of imports.elements) {
      if ((entry.propertyName?.text ?? entry.name.text) === importedName) names.add(entry.name.text);
    }
  }
  return names;
}

function templateLocation(
  sourceFile: ts.SourceFile,
  node: ts.TaggedTemplateExpression,
  tag: GluonTemplateTag,
): GluonTemplateLocation {
  const parts: GluonTemplatePart[] = [];
  if (ts.isTemplateExpression(node.template)) {
    for (const [index, span] of node.template.templateSpans.entries()) {
      parts.push(Object.freeze({
        index,
        start: locationAt(sourceFile, span.expression.getStart(sourceFile)),
        end: locationAt(sourceFile, span.expression.end),
      }));
    }
  }
  return Object.freeze({
    tag,
    start: locationAt(sourceFile, node.template.getStart(sourceFile)),
    end: locationAt(sourceFile, node.template.end),
    parts: Object.freeze(parts),
  });
}

function locationAt(sourceFile: ts.SourceFile, offset: number): SourceLocation {
  const position = sourceFile.getLineAndCharacterOfPosition(offset);
  return Object.freeze({ offset, line: position.line + 1, column: position.character + 1 });
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === kind));
}

function scriptKindFor(id: string): ts.ScriptKind {
  if (/\.tsx(?:$|\?)/.test(id)) return ts.ScriptKind.TSX;
  if (/\.jsx(?:$|\?)/.test(id)) return ts.ScriptKind.JSX;
  if (/\.js(?:$|\?)/.test(id)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function elementInitializerSignature(
  sourceFile: ts.SourceFile,
  expression: ts.Expression | undefined,
): string {
  if (!expression) return '';
  let declaration: ts.ClassLikeDeclaration | undefined;
  if (ts.isClassExpression(expression)) declaration = expression;
  if (ts.isIdentifier(expression)) {
    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement) && statement.name?.text === expression.text) {
        declaration = statement;
        break;
      }
    }
  }
  if (!declaration) return '';
  return declaration.members
    .filter((member) => ts.isConstructorDeclaration(member)
      || (ts.isPropertyDeclaration(member) && !hasModifier(member, ts.SyntaxKind.StaticKeyword)))
    .map((member) => member.getText(sourceFile))
    .join('\n');
}
