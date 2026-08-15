import ts from 'typescript';
import { compileGluonSfc, getGluonDiagnostic, parseGluonSfc, transformGluonModule, type GluonSfcBlock } from '@gluonjs/compiler';

export {
  PROJECT_ANALYSIS_SCHEMA,
  analyzeStaticGluonProject,
  type AnalysisConfidence,
  type GluonProjectAnalysis,
  type ProjectAnalysisDiagnostic,
  type ProjectEvidence,
} from './project-analyzer.js';

export type TemplateDiagnosticCode =
  | 'GLUON_SFC_INVALID'
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
export interface ReferenceContext { readonly includeDeclaration?: boolean }

interface TemplateSpan { readonly tag: 'compose' | 'css' | 'html' | 'svg'; readonly start: number; readonly end: number }
interface OpenDocument { readonly uri: string; readonly text: string; readonly analysis: DocumentAnalysis }
type SfcSymbolKind = 'component' | 'style-class' | 'import-path';
interface SfcSymbolOccurrence {
  readonly kind: SfcSymbolKind;
  readonly name: string;
  readonly start: number;
  readonly end: number;
  readonly declaration: boolean;
  readonly targetUri?: string;
}

const nativeTags = new Set('a article aside button code div footer form h1 h2 h3 h4 h5 h6 header img input label li main nav ol option p section select small span strong textarea ul'.split(' '));
const svgTags = new Set('circle defs g line path polygon polyline rect svg text use'.split(' '));
const voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
const ariaAttributes = new Set('aria-atomic aria-busy aria-checked aria-controls aria-current aria-describedby aria-disabled aria-expanded aria-haspopup aria-hidden aria-label aria-labelledby aria-live aria-modal aria-pressed aria-required aria-selected'.split(' '));

export function analyzeGluonDocument(
  uri: string,
  text: string,
  externalDeclarations: readonly CustomElementDeclaration[] = [],
): DocumentAnalysis {
  if (/\.gluon$/i.test(uri)) return analyzeGluonSfc(uri, text, externalDeclarations);
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

function analyzeGluonSfc(uri: string, text: string, external: readonly CustomElementDeclaration[]): DocumentAnalysis {
  const parsed = parseGluonSfc(text, uri);
  const diagnostics: TemplateDiagnostic[] = [];
  for (const error of parsed.errors) diagnostics.push({ code: 'GLUON_SFC_INVALID', message: error.message, range: rangeAtOffset(text, error.range.start, error.range.end), severity: 1, source: 'gluon' });
  try {
    compileGluonSfc(text, { filename: uri });
  } catch (error) {
    if (parsed.errors.length === 0) {
      const block = parsed.blocks.find((candidate) => candidate.type === 'template') ?? parsed.blocks[0];
      const start = block?.range.start ?? 0;
      const end = block?.range.end ?? Math.min(text.length, 1);
      diagnostics.push({
        code: 'GLUON_SFC_INVALID',
        message: error instanceof Error ? error.message : String(error),
        range: rangeAtOffset(text, start, end),
        severity: 1,
        source: 'gluon',
      });
    }
  }
  const template = parsed.blocks.find((block) => block.type === 'template');
  const script = parsed.blocks.find((block) => block.type === 'script');
  const source = ts.createSourceFile(uri, script ? `${' '.repeat(script.start)}${script.content}` : '', ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const parseDiagnostics = (source as ts.SourceFile & { readonly parseDiagnostics?: readonly ts.DiagnosticWithLocation[] }).parseDiagnostics ?? [];
  for (const entry of parseDiagnostics) {
    const start = entry.start ?? script?.start ?? 0;
    diagnostics.push({
      code: 'GLUON_SFC_INVALID',
      message: ts.flattenDiagnosticMessageText(entry.messageText, '\n'),
      range: rangeAtOffset(text, start, start + Math.max(1, entry.length ?? 1)),
      severity: 1,
      source: 'gluon',
    });
  }
  const declarations = collectDeclarations(uri, source);
  if (template) {
    const prefix = "import { html } from '@gluonjs/core';\nhtml`";
    const suffix = '`;';
    const virtual = `${prefix}${template.content.replace(/`/g, '\\`')}${suffix}`;
    const virtualAnalysis = analyzeGluonDocument(`${uri}#template.ts`, virtual, [...external, ...declarations]);
    for (const diagnostic of virtualAnalysis.diagnostics) {
      const virtualOffset = offsetForRange(virtual, diagnostic.range);
      const originalOffset = template.start + virtualOffset - prefix.length;
      if (originalOffset >= template.start && originalOffset <= template.end) {
        diagnostics.push({ ...diagnostic, range: rangeAtOffset(text, originalOffset, originalOffset + Math.max(1, offsetLength(virtual, diagnostic.range))) });
      }
    }
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
    if (/\.gluon$/i.test(uri)) {
      const sfcCompletion = completeGluonSfc(document, offset, this.documents);
      if (sfcCompletion) return sfcCompletion;
    }
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
    const document = this.documents.get(uri);
    if (document && /\.gluon$/i.test(uri)) {
      const symbol = sfcSymbolAt(document, position);
      if (symbol) return {
        contents: hoverForSfcSymbol(symbol, this.documents),
        range: rangeAtOffset(document.text, symbol.start, symbol.end),
      };
    }
    const found = this.tagAt(uri, position);
    if (!found) return undefined;
    const declaration = this.allDeclarations().get(found.name);
    if (declaration) return { contents: `**<${found.name}>**\n\nProperties: ${declaration.props.join(', ') || 'none'}\n\nEvents: ${declaration.events.join(', ') || 'none'}`, range: found.range };
    if (nativeTags.has(found.name)) return { contents: `Native HTML \`<${found.name}>\` element.`, range: found.range };
    return undefined;
  }

  definition(uri: string, position: Position): readonly Location[] {
    const document = this.documents.get(uri);
    if (document && /\.gluon$/i.test(uri)) {
      const symbol = sfcSymbolAt(document, position);
      if (symbol) return definitionsForSfcSymbol(document, symbol, this.documents);
    }
    const found = this.tagAt(uri, position);
    const declaration = found && this.allDeclarations().get(found.name);
    return declaration ? [{ uri: declaration.uri, range: declaration.range }] : [];
  }

  references(uri: string, position: Position, context: ReferenceContext = {}): readonly Location[] {
    const document = this.documents.get(uri);
    if (document && /\.gluon$/i.test(uri)) {
      const symbol = sfcSymbolAt(document, position);
      if (symbol) return referencesForSfcSymbol(document, symbol, this.documents, context);
    }
    const found = this.tagAt(uri, position);
    if (!found || !this.allDeclarations().has(found.name)) return [];
    const locations: Location[] = [];
    for (const document of this.documents.values()) {
      const source = ts.createSourceFile(document.uri, document.text, ts.ScriptTarget.Latest, true, scriptKind(document.uri));
      for (const template of collectTemplates(source)) {
        const content = document.text.slice(template.start + 1, template.end - 1);
        for (const match of content.matchAll(new RegExp(`</?\\s*${escapeRegExp(found.name)}\\b`, 'g'))) {
          const start = template.start + 1 + match.index + match[0].indexOf(found.name);
          locations.push({ uri: document.uri, range: rangeAt(source, start, start + found.name.length) });
        }
      }
      if (context.includeDeclaration !== false) for (const declaration of document.analysis.declarations.filter((entry) => entry.tagName === found.name)) locations.push({ uri: document.uri, range: declaration.range });
    }
    return uniqueLocations(locations);
  }

  rename(uri: string, position: Position, newName: string): WorkspaceEdit | undefined {
    const document = this.documents.get(uri);
    if (document && /\.gluon$/i.test(uri)) {
      const symbol = sfcSymbolAt(document, position);
      if (symbol) return renameSfcSymbol(document, symbol, newName);
    }
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
        for (const declared of document.analysis.declarations.filter((entry) => entry.tagName === found.name)) {
          (changes[document.uri] ??= []).push({ range: declared.range, newText: newName });
        }
      }
    }
    for (const edits of Object.values(changes)) edits.sort((left, right) =>
      left.range.start.line - right.range.start.line
      || left.range.start.character - right.range.start.character
      || left.range.end.line - right.range.end.line
      || left.range.end.character - right.range.end.character);
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
    if (/\.gluon$/i.test(uri)) {
      for (const occurrence of collectSfcSymbolOccurrences(document)) {
        if (occurrence.kind === 'import-path') continue;
        const position = positionAt(source, occurrence.start);
        tokens.push({ ...position, length: occurrence.end - occurrence.start, type: occurrence.kind === 'component' ? 0 : 1 });
      }
    }
    tokens.sort((a, b) => a.line - b.line || a.character - b.character);
    const uniqueTokens = tokens.filter((token, index) => index === 0
      || token.line !== tokens[index - 1]!.line
      || token.character !== tokens[index - 1]!.character
      || token.length !== tokens[index - 1]!.length
      || token.type !== tokens[index - 1]!.type);
    let previousLine = 0;
    let previousCharacter = 0;
    return uniqueTokens.flatMap((token) => {
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

function completeGluonSfc(
  document: OpenDocument,
  offset: number,
  documents: ReadonlyMap<string, OpenDocument>,
): readonly CompletionItem[] | undefined {
  const parsed = parseGluonSfc(document.text, document.uri);
  const template = parsed.blocks.find((block) => block.type === 'template');
  const script = parsed.blocks.find((block) => block.type === 'script');
  const componentValue = template && sfcTemplateComponentValue(document.text, template);
  if (componentValue && offset >= componentValue.valueStart && offset <= componentValue.valueEnd) {
    const filename = relativeSfcSpecifier(document.uri).replace(/^\.\//, '').replace(/\.gluon$/i, '');
    return uniqueKeys([componentValue.value, filename].filter(Boolean)).sort().map((label) => ({ label, kind: 12, detail: 'Gluon SFC component name' }));
  }
  if (template && offset >= template.start && offset <= template.end) {
    for (const attribute of sfcTemplateClasses(document.text, template)) {
      if (offset < attribute.attributeStart || offset > attribute.attributeEnd) continue;
      const classes = parsed.blocks
        .filter((block) => block.type === 'style')
        .flatMap((block) => sfcStyleClasses(document.text, block).map((entry) => entry.name));
      return uniqueKeys(classes).sort().map((label) => ({ label, kind: 10, detail: 'Gluon SFC style class' }));
    }
  }
  if (script && offset >= script.start && offset <= script.end) {
    const source = sfcScriptSource(document.text, document.uri, script);
    const importDeclaration = source.statements.find((statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && offset >= statement.moduleSpecifier.getStart(source) + 1
      && offset <= statement.moduleSpecifier.end - 1);
    if (importDeclaration) {
      return [...documents.values()]
        .filter((candidate) => candidate.uri !== document.uri && /\.gluon$/i.test(candidate.uri))
        .map((candidate) => ({ label: relativeSfcImportSpecifier(document.uri, candidate.uri), kind: 12 as const, detail: candidate.uri }))
        .sort((left, right) => left.label.localeCompare(right.label));
    }
  }
  return undefined;
}

function collectSfcSymbolOccurrences(document: OpenDocument): readonly SfcSymbolOccurrence[] {
  if (!/\.gluon$/i.test(document.uri)) return [];
  const parsed = parseGluonSfc(document.text, document.uri);
  const occurrences: SfcSymbolOccurrence[] = [];
  const template = parsed.blocks.find((block) => block.type === 'template');
  const script = parsed.blocks.find((block) => block.type === 'script');
  const component = template && sfcTemplateComponent(document.text, template);
  const declarations = script ? sfcScriptDeclarations(document.text, document.uri, script) : [];
  const importedTargets = new Map(declarations.flatMap((entry) => entry.targetUri ? [[entry.name, entry.targetUri] as const] : []));
  const componentNames = new Set([
    ...(component ? [component.name] : []),
    ...declarations.map((entry) => entry.name),
  ]);

  if (component) occurrences.push({
    kind: 'component',
    name: component.name,
    start: component.valueStart,
    end: component.valueEnd,
    declaration: !importedTargets.has(component.name),
    ...(importedTargets.get(component.name) ? { targetUri: importedTargets.get(component.name) } : {}),
  });
  if (script) {
    const source = sfcScriptSource(document.text, document.uri, script);
    const declarationRanges = new Set(declarations.map((entry) => `${entry.start}:${entry.end}`));
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && componentNames.has(node.text)) {
        const start = node.getStart(source);
        const end = node.end;
        occurrences.push({
          kind: 'component',
          name: node.text,
          start,
          end,
          declaration: declarationRanges.has(`${start}:${end}`),
          ...(importedTargets.get(node.text) ? { targetUri: importedTargets.get(node.text) } : {}),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
        || !/\.gluon$/i.test(statement.moduleSpecifier.text)) continue;
      occurrences.push({
        kind: 'import-path',
        name: statement.moduleSpecifier.text,
        start: statement.moduleSpecifier.getStart(source) + 1,
        end: statement.moduleSpecifier.end - 1,
        declaration: false,
        targetUri: resolveSfcImportUri(document.uri, statement.moduleSpecifier.text),
      });
    }
  }
  if (template) {
    for (const entry of sfcTemplateClasses(document.text, template)) occurrences.push({
      kind: 'style-class', name: entry.name, start: entry.start, end: entry.end, declaration: false,
    });
  }
  for (const style of parsed.blocks.filter((block) => block.type === 'style')) {
    for (const entry of sfcStyleClasses(document.text, style)) occurrences.push({
      kind: 'style-class', name: entry.name, start: entry.start, end: entry.end, declaration: true,
    });
  }
  const seen = new Set<string>();
  return occurrences
    .sort((left, right) => left.start - right.start || left.end - right.end || left.kind.localeCompare(right.kind))
    .filter((entry) => {
      const key = `${entry.kind}:${entry.start}:${entry.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sfcSymbolAt(document: OpenDocument, position: Position): SfcSymbolOccurrence | undefined {
  const offset = offsetAt(document.text, position);
  return collectSfcSymbolOccurrences(document).find((entry) => offset >= entry.start && offset <= entry.end);
}

function hoverForSfcSymbol(
  symbol: SfcSymbolOccurrence,
  documents: ReadonlyMap<string, OpenDocument>,
): string {
  if (symbol.kind === 'style-class') return `Gluon SFC style class \`.${symbol.name}\` shared by static template class attributes and the local \`<style>\` block.`;
  if (symbol.kind === 'import-path') return symbol.targetUri && documents.has(symbol.targetUri)
    ? `Open Gluon SFC module \`${symbol.name}\`.`
    : `Unresolved Gluon SFC module \`${symbol.name}\`; editor navigation is limited to open workspace documents.`;
  return symbol.targetUri
    ? `Imported Gluon SFC component \`${symbol.name}\`${documents.has(symbol.targetUri) ? ` from \`${symbol.targetUri}\`` : ''}.`
    : `Gluon SFC component \`${symbol.name}\` linked across its script and template boundaries.`;
}

function definitionsForSfcSymbol(
  document: OpenDocument,
  symbol: SfcSymbolOccurrence,
  documents: ReadonlyMap<string, OpenDocument>,
): readonly Location[] {
  if (symbol.targetUri) {
    const target = documents.get(symbol.targetUri);
    if (!target) return [];
    const targetOccurrences = collectSfcSymbolOccurrences(target);
    const publicName = sfcPublicComponentName(target);
    const preferred = targetOccurrences.filter((entry) => entry.kind === 'component' && entry.declaration
      && (publicName === undefined || entry.name === publicName));
    const fallback = targetOccurrences.filter((entry) => entry.kind === 'component');
    const entries = symbol.kind === 'import-path' ? preferred.length > 0 ? preferred : fallback : preferred;
    return uniqueLocations(entries.slice(0, 1).map((entry) => sfcLocation(target, entry)));
  }
  const occurrences = collectSfcSymbolOccurrences(document).filter((entry) =>
    entry.kind === symbol.kind && entry.name === symbol.name && entry.declaration);
  return uniqueLocations(occurrences.map((entry) => sfcLocation(document, entry)));
}

function referencesForSfcSymbol(
  document: OpenDocument,
  symbol: SfcSymbolOccurrence,
  documents: ReadonlyMap<string, OpenDocument>,
  context: ReferenceContext,
): readonly Location[] {
  const locations: Location[] = [];
  const append = (candidate: OpenDocument, entry: SfcSymbolOccurrence): void => {
    if (context.includeDeclaration === false && entry.declaration) return;
    locations.push(sfcLocation(candidate, entry));
  };
  for (const entry of collectSfcSymbolOccurrences(document)) {
    if (entry.kind === symbol.kind && entry.name === symbol.name) append(document, entry);
  }
  const exportsLocalComponent = symbol.kind === 'component' && !symbol.targetUri
    && collectSfcSymbolOccurrences(document).some((entry) => entry.kind === 'component' && entry.name === symbol.name && entry.declaration);
  if (exportsLocalComponent) {
    for (const candidate of documents.values()) {
      if (candidate.uri === document.uri) continue;
      for (const entry of collectSfcSymbolOccurrences(candidate)) {
        if (entry.kind === 'component' && entry.targetUri === document.uri) append(candidate, entry);
      }
    }
  } else if (symbol.kind === 'import-path' && symbol.targetUri) {
    for (const candidate of documents.values()) {
      if (candidate.uri === document.uri) continue;
      for (const entry of collectSfcSymbolOccurrences(candidate)) {
        if (entry.kind === 'import-path' && entry.targetUri === symbol.targetUri) append(candidate, entry);
      }
    }
  }
  return uniqueLocations(locations);
}

function renameSfcSymbol(
  document: OpenDocument,
  symbol: SfcSymbolOccurrence,
  newName: string,
): WorkspaceEdit | undefined {
  if (symbol.kind === 'import-path') return undefined;
  const valid = symbol.kind === 'component'
    ? /^[$A-Z_a-z][$\w]*$/.test(newName)
    : /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(newName);
  if (!valid) return undefined;
  const edits = collectSfcSymbolOccurrences(document)
    .filter((entry) => entry.kind === symbol.kind && entry.name === symbol.name)
    .map((entry) => ({ range: rangeAtOffset(document.text, entry.start, entry.end), newText: newName }));
  return edits.length > 0 ? { changes: { [document.uri]: edits } } : undefined;
}

function sfcLocation(document: OpenDocument, entry: SfcSymbolOccurrence): Location {
  return { uri: document.uri, range: rangeAtOffset(document.text, entry.start, entry.end) };
}

function sfcScriptSource(text: string, uri: string, script: GluonSfcBlock): ts.SourceFile {
  return ts.createSourceFile(uri, `${' '.repeat(script.start)}${script.content}`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function sfcScriptDeclarations(
  text: string,
  uri: string,
  script: GluonSfcBlock,
): readonly { readonly name: string; readonly start: number; readonly end: number; readonly targetUri?: string }[] {
  const source = sfcScriptSource(text, uri, script);
  const declarations: Array<{ name: string; start: number; end: number; targetUri?: string }> = [];
  const add = (name: ts.Identifier, targetUri?: string): void => {
    declarations.push({
      name: name.text, start: name.getStart(source), end: name.end, ...(targetUri ? { targetUri } : {}),
    });
  };
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
      && /\.gluon$/i.test(statement.moduleSpecifier.text) && statement.importClause?.name) {
      add(statement.importClause.name, resolveSfcImportUri(uri, statement.moduleSpecifier.text));
      continue;
    }
  }
  return declarations;
}

function sfcTemplateComponent(
  text: string,
  template: GluonSfcBlock,
): { readonly name: string; readonly valueStart: number; readonly valueEnd: number } | undefined {
  const value = sfcTemplateComponentValue(text, template);
  if (!value || !/^[$A-Z_a-z][$\w]*$/.test(value.value)) return undefined;
  return { name: value.value, valueStart: value.valueStart, valueEnd: value.valueEnd };
}

function sfcTemplateComponentValue(
  text: string,
  template: GluonSfcBlock,
): { readonly value: string; readonly valueStart: number; readonly valueEnd: number } | undefined {
  const openingStart = text.lastIndexOf('<template', template.start);
  const openingEnd = openingStart >= 0 ? text.indexOf('>', openingStart) : -1;
  if (openingStart < 0 || openingEnd < 0) return undefined;
  const opening = text.slice(openingStart, openingEnd + 1);
  const match = /\bcomponent\s*=\s*(["'])([^"']*)\1/.exec(opening);
  if (!match) return undefined;
  const value = match[2]!;
  const valueStart = openingStart + match.index + match[0].indexOf(match[1]!) + 1;
  return { value, valueStart, valueEnd: valueStart + value.length };
}

function sfcPublicComponentName(document: OpenDocument): string | undefined {
  const template = parseGluonSfc(document.text, document.uri).blocks.find((block) => block.type === 'template');
  return template ? sfcTemplateComponent(document.text, template)?.name : undefined;
}

function sfcTemplateClasses(
  text: string,
  template: GluonSfcBlock,
): readonly { readonly name: string; readonly start: number; readonly end: number; readonly attributeStart: number; readonly attributeEnd: number }[] {
  const entries: Array<{ name: string; start: number; end: number; attributeStart: number; attributeEnd: number }> = [];
  for (const attribute of template.content.matchAll(/\bclass\s*=\s*(["'])([^"']*)\1/g)) {
    const value = attribute[2]!;
    const valueStart = template.start + attribute.index + attribute[0].indexOf(value);
    for (const token of value.matchAll(/[A-Za-z_-][\w-]*/g)) {
      const start = valueStart + token.index;
      entries.push({ name: token[0], start, end: start + token[0].length, attributeStart: valueStart, attributeEnd: valueStart + value.length });
    }
    if (value.length === 0) entries.push({ name: '', start: valueStart, end: valueStart, attributeStart: valueStart, attributeEnd: valueStart });
  }
  return entries;
}

function sfcStyleClasses(
  _text: string,
  style: GluonSfcBlock,
): readonly { readonly name: string; readonly start: number; readonly end: number }[] {
  const entries: Array<{ name: string; start: number; end: number }> = [];
  let boundary = 0;
  for (let index = 0; index < style.content.length; index += 1) {
    const character = style.content[index];
    if (character === '}') { boundary = index + 1; continue; }
    if (character !== '{') continue;
    const selector = style.content.slice(boundary, index);
    const selectorOffset = boundary;
    boundary = index + 1;
    if (selector.trimStart().startsWith('@')) continue;
    for (const match of selector.matchAll(/\.([A-Za-z_-][\w-]*)/g)) {
      const name = match[1]!;
      const start = style.start + selectorOffset + match.index + 1;
      entries.push({ name, start, end: start + name.length });
    }
  }
  return entries;
}

function resolveSfcImportUri(uri: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  try { return new URL(specifier, uri).href; } catch { return undefined; }
}

function relativeSfcSpecifier(uri: string): string {
  try {
    const name = decodeURIComponent(new URL(uri).pathname.split('/').at(-1) ?? uri);
    return `./${name}`;
  } catch {
    return uri;
  }
}

function relativeSfcImportSpecifier(fromUri: string, targetUri: string): string {
  try {
    const from = decodeURIComponent(new URL(fromUri).pathname).split('/');
    const target = decodeURIComponent(new URL(targetUri).pathname).split('/');
    from.pop();
    while (from.length > 0 && target.length > 0 && from[0] === target[0]) {
      from.shift();
      target.shift();
    }
    const relative = `${'../'.repeat(from.length)}${target.join('/')}`;
    return relative.startsWith('../') ? relative : `./${relative}`;
  } catch {
    return relativeSfcSpecifier(targetUri);
  }
}

function collectTemplates(source: ts.SourceFile): TemplateSpan[] {
  if (/\.gluon$/i.test(source.fileName)) {
    return parseGluonSfc(source.text, source.fileName).blocks
      .filter((block) => block.type === 'template')
      // TemplateSpan includes one delimiter position on either side so every
      // shared consumer can keep using start + 1/end - 1 for content ranges.
      .map((block) => ({ tag: 'html', start: block.start - 1, end: block.end + 1 }));
  }
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

function rangeAtOffset(text: string, start: number, end: number): Range {
  const source = ts.createSourceFile('range.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return rangeAt(source, Math.max(0, start), Math.max(start, end));
}

function offsetForRange(text: string, range: Range): number {
  const source = ts.createSourceFile('range.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return source.getPositionOfLineAndCharacter(range.start.line, range.start.character);
}

function offsetLength(text: string, range: Range): number {
  const source = ts.createSourceFile('range.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return Math.max(1, source.getPositionOfLineAndCharacter(range.end.line, range.end.character) - offsetForRange(text, range));
}

function uniqueLocations(locations: readonly Location[]): readonly Location[] {
  const seen = new Set<string>();
  return [...locations]
    .sort((left, right) => left.uri.localeCompare(right.uri)
      || left.range.start.line - right.range.start.line
      || left.range.start.character - right.range.start.character
      || left.range.end.line - right.range.end.line
      || left.range.end.character - right.range.end.character)
    .filter((location) => {
      const key = `${location.uri}:${JSON.stringify(location.range)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
