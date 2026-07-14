import ts from 'typescript';
import { getGluonDiagnostic, transformGluonModule } from '@gluonjs/compiler';

export type TemplateDiagnosticCode =
  | 'GLUON_ELEMENT_SETUP_CLEANUP_MISSING'
  | 'GLUON_ELEMENT_SETUP_LIFECYCLE_DEFERRED'
  | 'GLUON_ELEMENT_TAG_INVALID'
  | 'GLUON_TEMPLATE_ARIA_UNKNOWN'
  | 'GLUON_TEMPLATE_BINDING_POSITION'
  | 'GLUON_TEMPLATE_CUSTOM_ELEMENT_UNKNOWN'
  | 'GLUON_TEMPLATE_EVENT_UNKNOWN'
  | 'GLUON_TEMPLATE_PROP_UNKNOWN'
  | 'GLUON_TEMPLATE_SLOT_UNKNOWN'
  | 'GLUON_TEMPLATE_STYLE_ELEMENT'
  | 'GLUON_TEMPLATE_VOID_CHILDREN';

export interface Position { readonly line: number; readonly character: number }
export interface Range { readonly start: Position; readonly end: Position }
export interface TextEdit { readonly range: Range; readonly newText: string }
export interface Location { readonly uri: string; readonly range: Range }

export interface TemplateDiagnostic {
  readonly code: TemplateDiagnosticCode;
  readonly message: string;
  readonly range: Range;
  readonly severity: 1 | 2;
  readonly source: 'gluon';
}

export interface CustomElementDeclaration {
  readonly tagName: string;
  readonly uri: string;
  readonly range: Range;
  readonly props: readonly string[];
  readonly events: readonly string[];
  readonly slots: readonly string[];
}

export interface DocumentAnalysis {
  readonly uri: string;
  readonly diagnostics: readonly TemplateDiagnostic[];
  readonly declarations: readonly CustomElementDeclaration[];
}

export interface ProjectDocument { readonly uri: string; readonly text: string }

/** Runs the same two-pass declaration and diagnostic analysis used by the CI CLI. */
export function analyzeGluonProject(documents: readonly ProjectDocument[]): readonly DocumentAnalysis[] {
  const declarations = documents.flatMap((document) => analyzeGluonDocument(document.uri, document.text).declarations);
  return Object.freeze(documents.map((document) => analyzeGluonDocument(
    document.uri,
    document.text,
    declarations.filter((entry) => entry.uri !== document.uri),
  )));
}

export interface CompletionItem {
  readonly label: string;
  readonly kind: 10 | 12;
  readonly detail: string;
}

/** Converts Custom Elements Manifest modules into language-service declarations. */
export function declarationsFromCustomElementsManifest(
  uri: string,
  manifest: unknown,
): readonly CustomElementDeclaration[] {
  if (!manifest || typeof manifest !== 'object') return [];
  const modules = (manifest as { modules?: unknown }).modules;
  if (!Array.isArray(modules)) return [];
  const declarations: CustomElementDeclaration[] = [];
  for (const module of modules) {
    const entries = module && typeof module === 'object'
      ? (module as { declarations?: unknown }).declarations
      : undefined;
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const candidate = entry as Record<string, unknown>;
      if (candidate.customElement !== true || typeof candidate.tagName !== 'string') continue;
      const members = Array.isArray(candidate.members) ? candidate.members : [];
      const events = Array.isArray(candidate.events) ? candidate.events : [];
      const slots = Array.isArray(candidate.slots) ? candidate.slots : [];
      declarations.push(Object.freeze({
        tagName: candidate.tagName,
        uri,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        props: Object.freeze(namedEntries(members, (item) => item.kind === 'field' || item.kind === 'property')),
        events: Object.freeze(namedEntries(events)),
        slots: Object.freeze(namedEntries(slots)),
      }));
    }
  }
  return Object.freeze(declarations);
}

export interface Hover { readonly contents: string; readonly range?: Range }
export interface WorkspaceEdit { readonly changes: Readonly<Record<string, readonly TextEdit[]>> }

interface TemplateSpan { readonly tag: 'compose' | 'css' | 'html' | 'svg'; readonly start: number; readonly end: number }
interface OpenDocument { readonly uri: string; readonly text: string; readonly analysis: DocumentAnalysis }

const nativeTags = new Set('a article aside button code div footer form h1 h2 h3 h4 h5 h6 header img input label li main nav ol option p section select small span strong textarea ul'.split(' '));
const svgTags = new Set('circle defs g line path polygon polyline rect svg text use'.split(' '));
const voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
const ariaAttributes = new Set('aria-atomic aria-busy aria-checked aria-controls aria-current aria-describedby aria-disabled aria-expanded aria-haspopup aria-hidden aria-label aria-labelledby aria-live aria-modal aria-pressed aria-required aria-selected'.split(' '));

export function analyzeGluonDocument(
  uri: string,
  text: string,
  externalDeclarations: readonly CustomElementDeclaration[] = [],
): DocumentAnalysis {
  const source = ts.createSourceFile(uri, text, ts.ScriptTarget.Latest, true, scriptKind(uri));
  const declarations = collectDeclarations(uri, source);
  const declarationMap = new Map([...externalDeclarations, ...declarations].map((entry) => [entry.tagName, entry]));
  const diagnostics: TemplateDiagnostic[] = [];

  for (const compilerDiagnostic of transformGluonModule(text, uri).diagnostics) {
    diagnostics.push(diagnostic(
      compilerDiagnostic.code,
      compilerDiagnostic.message,
      compilerDiagnostic.location.offset,
      compilerDiagnostic.location.offset + 6,
      source,
    ));
  }

  for (const template of collectTemplates(source)) {
    if (template.tag === 'css') continue;
    const contentStart = template.start + 1;
    const content = text.slice(contentStart, template.end - 1);
    for (const match of content.matchAll(/<\s*\$\{|<\/?[\w-]+\s+[^>]*\$\{[^}]+\}\s*=/g)) {
      const start = contentStart + match.index;
      diagnostics.push(diagnostic(
        'GLUON_TEMPLATE_BINDING_POSITION',
        'Bindings are supported in child or attribute-value positions, not tag or attribute names.',
        start,
        start + match[0].length,
        source,
      ));
    }
    const markup = maskBindings(content);
    for (const tag of voidTags) {
      const expression = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
      for (const match of markup.matchAll(expression)) {
        const start = contentStart + match.index;
        diagnostics.push(diagnostic(
          'GLUON_TEMPLATE_VOID_CHILDREN',
          `<${tag}> is void and cannot have children or a closing tag.`,
          start,
          start + match[0].length,
          source,
        ));
      }
    }
    for (const match of markup.matchAll(/<\/?([A-Za-z][\w-]*)\b/g)) {
      const tagName = match[1]!.toLowerCase();
      if (template.tag === 'svg' ? svgTags.has(tagName) : nativeTags.has(tagName) || voidTags.includes(tagName)) continue;
      if (!tagName.includes('-') || declarationMap.has(tagName)) continue;
      const start = contentStart + match.index + match[0].indexOf(match[1]!);
      diagnostics.push(diagnostic(
        'GLUON_TEMPLATE_CUSTOM_ELEMENT_UNKNOWN',
        `Custom Element <${tagName}> has no Gluon declaration or supplied manifest entry.`,
        start,
        start + tagName.length,
        source,
      ));
    }
    for (const match of markup.matchAll(/<([A-Za-z][\w-]*)\b([^>]*)>/g)) {
      const tagName = match[1]!.toLowerCase();
      const declaration = declarationMap.get(tagName);
      const attributes = match[2]!;
      const attributesOffset = contentStart + match.index + match[0].indexOf(attributes);
      for (const attribute of attributes.matchAll(/(?:^|\s)([@.]?[A-Za-z_:][\w:.-]*)(?=\s|=|$)/g)) {
        const name = attribute[1]!;
        const start = attributesOffset + attribute.index + attribute[0].lastIndexOf(name);
        if (name.startsWith('aria-') && !ariaAttributes.has(name)) {
          diagnostics.push(diagnostic('GLUON_TEMPLATE_ARIA_UNKNOWN', `${name} is not a recognized ARIA attribute.`, start, start + name.length, source));
        } else if (declaration && name.startsWith('.') && !declaration.props.includes(name.slice(1))) {
          diagnostics.push(diagnostic('GLUON_TEMPLATE_PROP_UNKNOWN', `<${tagName}> does not declare property ${name}.`, start, start + name.length, source));
        } else if (declaration && name.startsWith('@') && !declaration.events.includes(name.slice(1))) {
          diagnostics.push(diagnostic('GLUON_TEMPLATE_EVENT_UNKNOWN', `<${tagName}> does not declare event ${name}.`, start, start + name.length, source));
        }
      }
    }
    diagnoseSlotAssignments(markup, contentStart, declarationMap, source, diagnostics);
  }
  return Object.freeze({ uri, diagnostics: Object.freeze(diagnostics), declarations: Object.freeze(declarations) });
}

export class GluonLanguageService {
  private readonly documents = new Map<string, OpenDocument>();

  open(uri: string, text: string): DocumentAnalysis { return this.update(uri, text); }

  update(uri: string, text: string): DocumentAnalysis {
    const external = [...this.documents.values()].flatMap((document) => document.analysis.declarations);
    const analysis = analyzeGluonDocument(uri, text, external);
    this.documents.set(uri, { uri, text, analysis });
    this.refreshAnalyses();
    return this.documents.get(uri)!.analysis;
  }

  close(uri: string): void { this.documents.delete(uri); this.refreshAnalyses(); }

  analysis(uri: string): DocumentAnalysis | undefined { return this.documents.get(uri)?.analysis; }

  complete(uri: string, position: Position): readonly CompletionItem[] {
    const document = this.documents.get(uri);
    if (!document) return [];
    const offset = offsetAt(document.text, position);
    const before = document.text.slice(Math.max(0, offset - 80), offset);
    const declarations = this.allDeclarations();
    const customMatch = before.match(/<([\w-]+)\s+[^>]*$/);
    if (customMatch) {
      const declaration = declarations.get(customMatch[1]!.toLowerCase());
      if (declaration) return [
        ...declaration.props.map((label) => ({ label: `.${label}`, kind: 10 as const, detail: 'Gluon property' })),
        ...declaration.events.map((label) => ({ label: `@${label}`, kind: 10 as const, detail: 'Gluon event' })),
      ];
    }
    return [
      ...[...nativeTags].map((label) => ({ label, kind: 10 as const, detail: 'Native HTML element' })),
      ...[...declarations.keys()].map((label) => ({ label, kind: 12 as const, detail: 'Gluon Custom Element' })),
    ];
  }

  hover(uri: string, position: Position): Hover | undefined {
    const found = this.tagAt(uri, position);
    if (!found) return undefined;
    const declaration = this.allDeclarations().get(found.name);
    if (declaration) return { contents: `**<${found.name}>**\n\nProperties: ${declaration.props.join(', ') || 'none'}\n\nEvents: ${declaration.events.join(', ') || 'none'}`, range: found.range };
    if (nativeTags.has(found.name)) return { contents: `Native HTML \`<${found.name}>\` element.`, range: found.range };
    return undefined;
  }

  definition(uri: string, position: Position): readonly Location[] {
    const found = this.tagAt(uri, position);
    const declaration = found && this.allDeclarations().get(found.name);
    return declaration ? [{ uri: declaration.uri, range: declaration.range }] : [];
  }

  rename(uri: string, position: Position, newName: string): WorkspaceEdit | undefined {
    const found = this.tagAt(uri, position);
    if (!found || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(newName)) return undefined;
    const declaration = this.allDeclarations().get(found.name);
    if (!declaration) return undefined;
    const changes: Record<string, TextEdit[]> = {};
    for (const document of this.documents.values()) {
      const source = ts.createSourceFile(document.uri, document.text, ts.ScriptTarget.Latest, true, scriptKind(document.uri));
      for (const template of collectTemplates(source)) {
        const content = document.text.slice(template.start + 1, template.end - 1);
        for (const match of content.matchAll(new RegExp(`(<\\/?\\s*)${escapeRegExp(found.name)}\\b`, 'g'))) {
          const start = template.start + 1 + match.index + match[1]!.length;
          (changes[document.uri] ??= []).push({ range: rangeAt(source, start, start + found.name.length), newText: newName });
        }
      }
      if (document.uri === declaration.uri) {
        for (const match of document.text.matchAll(new RegExp(`(['\"])${escapeRegExp(found.name)}\\1`, 'g'))) {
          const start = match.index + 1;
          (changes[document.uri] ??= []).push({ range: rangeAt(source, start, start + found.name.length), newText: newName });
        }
      }
    }
    return { changes };
  }

  semanticTokens(uri: string): readonly number[] {
    const document = this.documents.get(uri);
    if (!document) return [];
    const source = ts.createSourceFile(uri, document.text, ts.ScriptTarget.Latest, true, scriptKind(uri));
    const tokens: Array<{ line: number; character: number; length: number; type: number }> = [];
    for (const template of collectTemplates(source)) {
      const content = document.text.slice(template.start + 1, template.end - 1);
      for (const match of content.matchAll(/<\/?([A-Za-z][\w-]*)|\s([@.]?[A-Za-z_:][\w:.-]*)(?=\s|=|>)/g)) {
        const value = match[1] ?? match[2]!;
        const relative = match.index + match[0].lastIndexOf(value);
        const position = positionAt(source, template.start + 1 + relative);
        tokens.push({ ...position, length: value.length, type: match[1] ? 0 : 1 });
      }
    }
    tokens.sort((a, b) => a.line - b.line || a.character - b.character);
    let previousLine = 0;
    let previousCharacter = 0;
    return tokens.flatMap((token) => {
      const deltaLine = token.line - previousLine;
      const deltaStart = deltaLine === 0 ? token.character - previousCharacter : token.character;
      previousLine = token.line;
      previousCharacter = token.character;
      return [deltaLine, deltaStart, token.length, token.type, 0];
    });
  }

  private allDeclarations(): Map<string, CustomElementDeclaration> {
    return new Map([...this.documents.values()].flatMap((document) => document.analysis.declarations).map((entry) => [entry.tagName, entry]));
  }

  private refreshAnalyses(): void {
    const declarations = [...this.documents.values()].flatMap((document) => document.analysis.declarations);
    for (const [uri, document] of this.documents) {
      const analysis = analyzeGluonDocument(uri, document.text, declarations.filter((entry) => entry.uri !== uri));
      this.documents.set(uri, { ...document, analysis });
    }
  }

  private tagAt(uri: string, position: Position): { readonly name: string; readonly range: Range } | undefined {
    const document = this.documents.get(uri);
    if (!document) return undefined;
    const source = ts.createSourceFile(uri, document.text, ts.ScriptTarget.Latest, true, scriptKind(uri));
    const offset = offsetAt(document.text, position);
    for (const template of collectTemplates(source)) {
      const content = document.text.slice(template.start + 1, template.end - 1);
      for (const match of content.matchAll(/<\/?([A-Za-z][\w-]*)\b/g)) {
        const start = template.start + 1 + match.index + match[0].indexOf(match[1]!);
        const end = start + match[1]!.length;
        if (offset >= start && offset <= end) return { name: match[1]!.toLowerCase(), range: rangeAt(source, start, end) };
      }
    }
    return undefined;
  }
}

function collectTemplates(source: ts.SourceFile): TemplateSpan[] {
  const aliases = new Map<string, TemplateSpan['tag']>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== '@gluonjs/core') continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      if (imported === 'html' || imported === 'svg' || imported === 'css' || imported === 'compose') aliases.set(element.name.text, imported);
    }
  }
  const templates: TemplateSpan[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isTaggedTemplateExpression(node)) {
      const tag = ts.isIdentifier(node.tag)
        ? aliases.get(node.tag.text)
        : ts.isCallExpression(node.tag) && ts.isIdentifier(node.tag.expression)
          ? aliases.get(node.tag.expression.text)
          : undefined;
      if (tag) templates.push({ tag, start: node.template.getStart(source), end: node.template.end });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return templates;
}

function collectDeclarations(uri: string, source: ts.SourceFile): CustomElementDeclaration[] {
  const declarations: CustomElementDeclaration[] = [];
  const classes = new Map<string, ts.ClassLikeDeclaration>();
  const decoratorImports = collectNamedImports(source, '@gluonjs/core/decorators');
  const customElementNames = importedAliases(decoratorImports, 'customElement');
  const propertyNames = importedAliases(decoratorImports, 'property');
  source.forEachChild((node) => { if (ts.isClassDeclaration(node) && node.name) classes.set(node.name.text, node); });
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node)) {
      for (const decorator of ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []) {
        const expression = decorator.expression;
        if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)
          || !customElementNames.has(expression.expression.text)) continue;
        const tagArgument = expression.arguments[0];
        if (!tagArgument || !ts.isStringLiteral(tagArgument)) continue;
        declarations.push(Object.freeze({
          tagName: tagArgument.text,
          uri,
          range: rangeAt(source, tagArgument.getStart(source) + 1, tagArgument.end - 1),
          props: Object.freeze(uniqueKeys([
            ...staticKeys(node, 'properties'),
            ...decoratedPropertyKeys(node, propertyNames),
          ])),
          events: Object.freeze(staticKeys(node, 'events')),
          slots: Object.freeze(staticKeys(node, 'slots')),
        }));
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineElement') {
      const [tagArgument, classArgument] = node.arguments;
      if (tagArgument && ts.isStringLiteral(tagArgument) && classArgument) {
        const declaration = ts.isIdentifier(classArgument) ? classes.get(classArgument.text) : ts.isClassExpression(classArgument) ? classArgument : undefined;
        declarations.push(Object.freeze({
          tagName: tagArgument.text,
          uri,
          range: rangeAt(source, tagArgument.getStart(source) + 1, tagArgument.end - 1),
          props: Object.freeze(staticKeys(declaration, 'properties')),
          events: Object.freeze(staticKeys(declaration, 'events')),
          slots: Object.freeze(staticKeys(declaration, 'slots')),
        }));
      }
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && node.expression.text === 'defineGluonElement') {
      const definition = node.arguments[0];
      if (definition && ts.isObjectLiteralExpression(definition)) {
        const tag = objectPropertyInitializer(definition, 'tagName');
        if (tag && ts.isStringLiteral(tag)) {
          declarations.push(Object.freeze({
            tagName: tag.text,
            uri,
            range: rangeAt(source, tag.getStart(source) + 1, tag.end - 1),
            props: Object.freeze(objectLiteralKeys(objectPropertyInitializer(definition, 'properties'))),
            events: Object.freeze(objectLiteralKeys(objectPropertyInitializer(definition, 'events'))),
            slots: Object.freeze(objectLiteralKeys(objectPropertyInitializer(definition, 'slots'))),
          }));
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return declarations;
}

function collectNamedImports(source: ts.SourceFile, moduleName: string): Map<string, string> {
  const imports = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== moduleName) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const entry of bindings.elements) {
      imports.set(entry.name.text, entry.propertyName?.text ?? entry.name.text);
    }
  }
  return imports;
}

function importedAliases(imports: ReadonlyMap<string, string>, importedName: string): Set<string> {
  return new Set([...imports].flatMap(([local, imported]) => imported === importedName ? [local] : []));
}

function decoratedPropertyKeys(
  declaration: ts.ClassLikeDeclaration,
  propertyNames: ReadonlySet<string>,
): string[] {
  return declaration.members.flatMap((member) => {
    if ((!ts.isPropertyDeclaration(member) && !ts.isGetAccessorDeclaration(member)
      && !ts.isSetAccessorDeclaration(member)) || !member.name) return [];
    const decorators = ts.canHaveDecorators(member) ? ts.getDecorators(member) ?? [] : [];
    const isProperty = decorators.some((decorator) => {
      const expression = decorator.expression;
      return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
        && propertyNames.has(expression.expression.text);
    });
    return isProperty ? [member.name.getText().replace(/^['"]|['"]$/g, '')] : [];
  });
}

function uniqueKeys(keys: readonly string[]): string[] {
  return [...new Set(keys)];
}

function objectPropertyInitializer(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const property = object.properties.find((candidate): candidate is ts.PropertyAssignment =>
    ts.isPropertyAssignment(candidate)
    && candidate.name.getText().replace(/^['"]|['"]$/g, '') === name);
  return property?.initializer;
}

function objectLiteralKeys(expression: ts.Expression | undefined): string[] {
  if (!expression || !ts.isObjectLiteralExpression(expression)) return [];
  return expression.properties.flatMap((property) =>
    ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)
      ? [property.name.getText().replace(/^['"]|['"]$/g, '')]
      : []);
}

function staticKeys(declaration: ts.ClassLikeDeclaration | undefined, name: string): string[] {
  const member = declaration?.members.find((candidate): candidate is ts.PropertyDeclaration => ts.isPropertyDeclaration(candidate)
    && candidate.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) === true
    && candidate.name.getText() === name);
  if (!member?.initializer || !ts.isObjectLiteralExpression(member.initializer)) return [];
  return member.initializer.properties.flatMap((property) => ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)
    ? [property.name.getText().replace(/^['"]|['"]$/g, '')]
    : []);
}

function diagnostic(code: TemplateDiagnosticCode, message: string, start: number, end: number, source: ts.SourceFile): TemplateDiagnostic {
  if (!getGluonDiagnostic(code)) throw new Error(`GLUON_DIAGNOSTIC_CATALOG_MISSING: ${code}`);
  return Object.freeze({ code, message, range: rangeAt(source, start, end), severity: 1, source: 'gluon' });
}

function positionAt(source: ts.SourceFile, offset: number): Position {
  const position = source.getLineAndCharacterOfPosition(offset);
  return { line: position.line, character: position.character };
}

function rangeAt(source: ts.SourceFile, start: number, end: number): Range { return { start: positionAt(source, start), end: positionAt(source, end) }; }

function offsetAt(text: string, position: Position): number {
  const lines = text.split(/\r?\n/);
  let offset = 0;
  for (let line = 0; line < position.line; line += 1) offset += (lines[line]?.length ?? 0) + 1;
  return offset + position.character;
}

function scriptKind(uri: string): ts.ScriptKind { return /\.tsx?$/.test(uri) ? (uri.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS) : ts.ScriptKind.JS; }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function diagnoseSlotAssignments(
  markup: string,
  contentStart: number,
  declarations: ReadonlyMap<string, CustomElementDeclaration>,
  source: ts.SourceFile,
  diagnostics: TemplateDiagnostic[],
): void {
  const elementStack: string[] = [];
  for (const match of markup.matchAll(/<\s*(\/?)\s*([A-Za-z][\w-]*)\b([^>]*)>/g)) {
    const closing = match[1] === '/';
    const tagName = match[2]!.toLowerCase();
    if (closing) {
      const openIndex = elementStack.lastIndexOf(tagName);
      if (openIndex >= 0) elementStack.length = openIndex;
      continue;
    }

    const parentDeclaration = declarations.get(elementStack.at(-1) ?? '');
    if (parentDeclaration) {
      const attributes = match[3]!;
      const attributesOffset = contentStart + match.index + match[0].indexOf(attributes);
      for (const slotMatch of attributes.matchAll(/\bslot\s*=\s*(["'])([^"']+)\1/g)) {
        const name = slotMatch[2]!;
        if (parentDeclaration.slots.includes(name)) continue;
        const start = attributesOffset + slotMatch.index + slotMatch[0].lastIndexOf(name);
        diagnostics.push(diagnostic(
          'GLUON_TEMPLATE_SLOT_UNKNOWN',
          `<${parentDeclaration.tagName}> does not declare slot ${name}.`,
          start,
          start + name.length,
          source,
        ));
      }
    }

    if (!voidTags.includes(tagName) && !/\/\s*>$/.test(match[0])) elementStack.push(tagName);
  }
}

function namedEntries(entries: readonly unknown[], accept: (entry: Record<string, unknown>) => boolean = () => true): string[] {
  return entries.flatMap((entry) => entry && typeof entry === 'object'
    && accept(entry as Record<string, unknown>)
    && typeof (entry as Record<string, unknown>).name === 'string'
    ? [(entry as Record<string, unknown>).name as string]
    : []);
}

function maskBindings(value: string): string {
  const characters = [...value];
  for (let index = 0; index < characters.length - 1; index += 1) {
    if (characters[index] !== '$' || characters[index + 1] !== '{') continue;
    let depth = 1;
    characters[index] = ' ';
    characters[index + 1] = ' ';
    index += 2;
    for (; index < characters.length && depth > 0; index += 1) {
      if (characters[index] === '{') depth += 1;
      else if (characters[index] === '}') depth -= 1;
      characters[index] = ' ';
    }
    index -= 1;
  }
  return characters.join('');
}

export { GluonProtocolServer, type JsonRpcRequest, type JsonRpcResponse } from './protocol.js';
