import { parse } from '@vue/compiler-sfc';

export type GluonSfcLayer = 'atom' | 'molecule' | 'organism';

export interface GluonSfcCompileOptions {
  readonly filename: string;
}

export interface GluonSfcCompileResult {
  readonly code: string;
  readonly componentName: string;
  readonly layer: GluonSfcLayer;
  readonly styleId?: string;
}

export class GluonSfcCompileError extends Error {
  readonly code = 'GLUON_SFC_INVALID';

  constructor(message: string, readonly filename: string) {
    super(`${filename}: ${message}`);
    this.name = 'GluonSfcCompileError';
  }
}

/**
 * Compiles a presentational `.gluon` Single-File Component to ordinary public
 * Gluon component, Quark, template, and constructable stylesheet contracts.
 */
export function compileGluonSfc(
  source: string,
  options: GluonSfcCompileOptions,
): GluonSfcCompileResult {
  const parsed = parse(source, { filename: options.filename, sourceMap: false });
  if (parsed.errors.length > 0) {
    throw invalid(options, 'Single-File Component syntax is malformed.');
  }
  const { descriptor } = parsed;
  if (!descriptor.template) throw invalid(options, 'A <template> block is required.');
  if (descriptor.scriptSetup) {
    throw invalid(options, '<script setup> is not supported; use one explicit typed <script> block.');
  }
  if (descriptor.customBlocks.length > 0) {
    throw invalid(options, 'Custom blocks are not supported.');
  }
  if (descriptor.styles.length > 1) {
    throw invalid(options, 'At most one <style> block is supported.');
  }
  if (descriptor.script?.src || descriptor.template.src || descriptor.styles.some((style) => style.src)) {
    throw invalid(options, 'External SFC blocks are not supported.');
  }
  if (descriptor.script && !['js', 'ts', undefined].includes(descriptor.script.lang)) {
    throw invalid(options, 'Only JavaScript and TypeScript script blocks are supported.');
  }
  if (descriptor.template.lang) throw invalid(options, 'Template preprocessors are not supported.');

  const templateAttributes = descriptor.template.attrs as Record<string, string | true>;
  const componentName = requiredIdentifier(templateAttributes.component, 'template component', options);
  const propsType = optionalIdentifier(templateAttributes.props, 'template props', options) ?? 'GluonSfcProps';
  const layer = parseLayer(templateAttributes.layer, options);
  const style = descriptor.styles[0];
  if (style?.lang && style.lang !== 'css') {
    throw invalid(options, 'Only CSS style blocks are supported.');
  }
  if (style?.scoped || style?.module) {
    throw invalid(options, 'Scoped and module styles are not supported; component styles already have explicit ownership.');
  }

  const imports = [
    'createComponentStyleDependency',
    layerDefinition(layer),
    'html',
  ];
  const compiledTemplate = compileTemplate(descriptor.template.content, options);
  const styleAttributes = style?.attrs as Record<string, string | true> | undefined;
  const styleId = style
    ? requiredStyleId(styleAttributes?.id, options)
    : undefined;
  if (style) imports.push('css');

  const script = descriptor.script?.content.trim();
  const declarations = script
    ? `${script}\n\n`
    : `export interface ${propsType} { readonly children?: import('@gluonjs/core').TemplateValue; }\n\n`;
  const styleCode = style && styleId
    ? [
        `const ${componentName}Style = css\`${escapeTemplateLiteral(style.content.trim())}\`;`,
        `const ${componentName}StyleDependency = createComponentStyleDependency({`,
        `  id: ${JSON.stringify(styleId)},`,
        `  sheet: ${componentName}Style,`,
        `  layer: ${JSON.stringify(layer)},`,
        `  order: ${parseStyleOrder(styleAttributes?.order, options)},`,
        `  scope: 'gluon-component',`,
        `});`,
        '',
      ].join('\n')
    : '';
  const stylesArgument = style ? `, [${componentName}StyleDependency]` : '';
  const renderBody = compiledTemplate.kind === 'quark'
    ? compiledTemplate.code
    : `html\`${compiledTemplate.code}\``;
  const code = [
    `import { ${[...new Set(imports)].sort().join(', ')} } from '@gluonjs/core';`,
    ...(compiledTemplate.kind === 'quark'
      ? [`import { quark } from '@gluonjs/quarks';`]
      : []),
    '',
    declarations,
    styleCode,
    `export const ${componentName} = ${layerDefinition(layer)}(`,
    `  (props: Readonly<${propsType}>) => ${renderBody},`,
    `  ${JSON.stringify(componentName)}${stylesArgument},`,
    ');',
    `export default ${componentName};`,
    '',
  ].join('\n');

  return Object.freeze({
    code,
    componentName,
    layer,
    ...(styleId ? { styleId } : {}),
  });
}

function compileTemplate(
  source: string,
  options: GluonSfcCompileOptions,
): { readonly kind: 'html' | 'quark'; readonly code: string } {
  const normalized = source.trim();
  const dynamic = normalized.match(
    /^<component\s+:is="([^"]+)"([^>]*)>([\s\S]*)<\/component>$/,
  );
  if (dynamic) {
    const tag = compileDynamicTag(dynamic[1]!, options);
    const attributes = compileDynamicAttributes(dynamic[2]!, options);
    const children = compileChildrenExpression(dynamic[3]!, options);
    const entries = [...attributes, `children: ${children}`];
    return { kind: 'quark', code: `quark(${tag})({ ${entries.join(', ')} } as never)` };
  }
  if (/<component(?:\s|>)/.test(normalized)) {
    throw invalid(options, 'A dynamic <component :is> must be the single template root.');
  }
  let output = escapeTemplateLiteral(normalized);
  output = output.replace(/<slot\s*\/>|<slot\s*><\/slot>/g, '${props.children}');
  output = output.replace(/\{\{\s*([A-Za-z_$][\w$]*)\s*\}\}/g, '${props.$1}');
  if (/\{\{|\}\}|<slot(?:\s|>)/.test(output)) {
    throw invalid(options, 'Templates support identifier interpolation and the default <slot /> only.');
  }
  return { kind: 'html', code: output };
}

function compileDynamicTag(expression: string, options: GluonSfcCompileOptions): string {
  const identifier = expression.match(/^([A-Za-z_$][\w$]*)$/);
  if (identifier) return `props.${identifier[1]}`;
  const conditional = expression.match(
    /^([A-Za-z_$][\w$]*)\s*\?\s*('(?:[^']*)'|"(?:[^"]*)")\s*:\s*('(?:[^']*)'|"(?:[^"]*)")$/,
  );
  if (conditional) {
    return `props.${conditional[1]} ? ${conditional[2]} : ${conditional[3]}`;
  }
  throw invalid(options, ':is supports a prop identifier or a prop-driven string-literal conditional.');
}

function compileDynamicAttributes(
  source: string,
  options: GluonSfcCompileOptions,
): string[] {
  const entries: string[] = [];
  const consumed = source.replace(
    /\s+(?::([A-Za-z][\w-]*)="([A-Za-z_$][\w$]*)"|([A-Za-z][\w-]*)="([^"]*)")/g,
    (_match, boundName: string | undefined, boundValue: string | undefined, name: string | undefined, value: string | undefined) => {
      if (boundName && boundValue) entries.push(`${propertyKey(boundName)}: props.${boundValue}`);
      else if (name?.startsWith('v-')) {
        throw invalid(options, `Unsupported dynamic component directive: ${name}`);
      } else if (name) entries.push(`${propertyKey(name)}: ${JSON.stringify(value ?? '')}`);
      return '';
    },
  );
  if (consumed.trim()) throw invalid(options, `Unsupported dynamic component attributes: ${consumed.trim()}`);
  return entries;
}

function compileChildrenExpression(source: string, options: GluonSfcCompileOptions): string {
  const normalized = source.trim();
  if (/^<slot\s*\/>$|^<slot\s*><\/slot>$/.test(normalized)) return 'props.children';
  const interpolation = normalized.match(/^\{\{\s*([A-Za-z_$][\w$]*)\s*\}\}$/);
  if (interpolation) return `props.${interpolation[1]}`;
  if (!/[<>{}]/.test(normalized)) return JSON.stringify(normalized);
  throw invalid(options, 'Dynamic native roots support text, one identifier interpolation, or the default slot.');
}

function parseLayer(value: string | true | undefined, options: GluonSfcCompileOptions): GluonSfcLayer {
  if (value === 'atom' || value === 'molecule' || value === 'organism') return value;
  throw invalid(options, 'The template layer must be atom, molecule, or organism.');
}

function layerDefinition(layer: GluonSfcLayer): 'defineAtom' | 'defineMolecule' | 'defineOrganism' {
  return layer === 'atom' ? 'defineAtom' : layer === 'molecule' ? 'defineMolecule' : 'defineOrganism';
}

function requiredIdentifier(
  value: string | true | undefined,
  name: string,
  options: GluonSfcCompileOptions,
): string {
  const identifier = optionalIdentifier(value, name, options);
  if (!identifier) throw invalid(options, `The ${name} attribute is required.`);
  return identifier;
}

function optionalIdentifier(
  value: string | true | undefined,
  name: string,
  options: GluonSfcCompileOptions,
): string | undefined {
  if (value === undefined) return undefined;
  if (value === true || !/^[A-Za-z_$][\w$]*$/.test(value)) {
    throw invalid(options, `The ${name} attribute must be a JavaScript identifier.`);
  }
  return value;
}

function requiredStyleId(value: string | true | undefined, options: GluonSfcCompileOptions): string {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(value)) {
    throw invalid(options, 'A stable lowercase <style id> is required.');
  }
  return value;
}

function parseStyleOrder(value: string | true | undefined, options: GluonSfcCompileOptions): number {
  if (value === undefined) return 100;
  const order = typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isInteger(order) || order < 0) {
    throw invalid(options, 'The style order must be a non-negative integer.');
  }
  return order;
}

function propertyKey(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value);
}

function escapeTemplateLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function invalid(options: GluonSfcCompileOptions, message: string): GluonSfcCompileError {
  return new GluonSfcCompileError(message, options.filename);
}
