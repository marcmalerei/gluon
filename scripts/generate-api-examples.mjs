import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const apiRoot = resolve(root, '.tmp/docs-api');
const corpusRoot = resolve(root, '.tmp/api-examples');
const catalog = await readJson('docs-site/api-examples.json');
const packageContract = await readJson('package-contract.json');
const typedoc = await readJson('typedoc.json');
const reflectionProject = await readJson('.tmp/docs-api-reflections.json');
const symbolKinds = new Map([
  ['functions', { label: 'Function', reflectionKind: 64, typeOnly: false }],
  ['classes', { label: 'Class', reflectionKind: 128, typeOnly: false }],
  ['interfaces', { label: 'Interface', reflectionKind: 256, typeOnly: true }],
  ['type-aliases', { label: 'Type alias', reflectionKind: 2097152, typeOnly: true }],
  ['variables', { label: 'Variable', reflectionKind: 32, typeOnly: false }],
]);

if (catalog.version !== 1 || !isRecord(catalog.overrides) || (catalog.recipes !== undefined && !isRecord(catalog.recipes))) {
  throw new Error('docs-site/api-examples.json must contain version 1, an overrides object, and an optional recipes object.');
}
const recipes = catalog.recipes ?? {};

const modules = new Map();
const compilerPaths = {};
const reflectionModules = new Map((reflectionProject.children ?? []).map((module) => [module.name, module]));
const reflectionsById = new Map();
indexReflections(reflectionProject);
for (const entryPoint of typedoc.entryPoints) {
  const moduleName = moduleNameForEntryPoint(entryPoint);
  const publicModule = publicModuleFor(moduleName);
  if (modules.has(moduleName)) throw new Error(`Duplicate TypeDoc entry module ${moduleName}.`);
  modules.set(moduleName, { entryPoint, publicModule });
  compilerPaths[publicModule] = [entryPoint];
}

const markdownFiles = (await filesWithExtension(apiRoot, '.md'))
  .map((path) => slash(relative(apiRoot, path)))
  .sort((left, right) => left.localeCompare(right));
const symbolPages = markdownFiles.map(symbolPage).filter(Boolean);
if (symbolPages.length === 0) throw new Error('TypeDoc generated no public symbol pages.');

await rm(corpusRoot, { recursive: true, force: true });
await mkdir(resolve(corpusRoot, 'corpus'), { recursive: true });
const unusedOverrides = new Set(Object.keys(catalog.overrides));
const manifestEntries = [];
const workItems = new Map();

for (const [index, page] of symbolPages.entries()) {
  const module = modules.get(page.moduleName);
  if (!module) throw new Error(`${page.path} belongs to unknown TypeDoc module ${page.moduleName}.`);
  const reflection = (reflectionModules.get(page.moduleName)?.children ?? [])
    .find((candidate) => candidate.name === page.symbol && candidate.kind === page.kind.reflectionKind);
  if (!reflection) throw new Error(`${page.path} has no matching TypeDoc reflection.`);
  const override = catalog.overrides[page.path];
  if (override) unusedOverrides.delete(page.path);
  const recipe = override?.recipe ? recipes[override.recipe] : undefined;
  if (override?.recipe && !recipe) throw new Error(`${page.path} references unknown API example recipe ${override.recipe}.`);
  const publicModule = override?.module ?? recipe?.module ?? module.publicModule;
  if (!compilerPaths[publicModule]) {
    throw new Error(`${page.path} uses non-public or unconfigured module ${publicModule}.`);
  }
  const description = override?.description ?? baselineDescription(page, publicModule, reflection);
  const code = override ? curatedCode(page, override, recipe) : baselineCode(page, publicModule, reflection);
  for (const placeholder of [/\bdeclare const\b/, /\btype Example\s*=/, /\bvoid value\b/]) {
    if (placeholder.test(code)) throw new Error(`${page.path} contains a compiler-only placeholder.`);
  }
  const markdownPath = resolve(apiRoot, page.path);
  const markdown = await readFile(markdownPath, 'utf8');
  if (/^## Examples?$/m.test(markdown)) {
    throw new Error(`${page.path} already contains an Example section outside the verified catalog.`);
  }
  await writeFile(markdownPath, `${markdown.trimEnd()}\n\n## Example\n\n${description}\n\n\`\`\`ts\n${code}\n\`\`\`\n`);

  const typecheckFile = `corpus/${String(index + 1).padStart(4, '0')}.ts`;
  await writeFile(resolve(corpusRoot, typecheckFile), `${code}\n`);
  const manifestEntry = {
    path: page.path,
    htmlPath: page.path.replace(/\.md$/, '.html'),
    kind: page.kind.label,
    symbol: page.symbol,
    module: publicModule,
    curated: Boolean(override),
    ...(override?.recipe ? { recipe: override.recipe } : {}),
    fallback: false,
    typecheckFile,
  };
  manifestEntries.push(manifestEntry);
  workItems.set(typecheckFile, {
    page,
    reflection,
    publicModule,
    markdownPath,
    markdown: markdown.trimEnd(),
    manifestEntry,
    curated: Boolean(override),
  });
}

if (unusedOverrides.size > 0) {
  throw new Error(`API example overrides target unknown symbol pages: ${[...unusedOverrides].join(', ')}.`);
}

const tsconfigPath = resolve(corpusRoot, 'tsconfig.json');
await writeFile(tsconfigPath, `${JSON.stringify({
  extends: '../../tsconfig.json',
  compilerOptions: {
    noEmit: true,
    baseUrl: '../..',
    paths: compilerPaths,
  },
  include: ['corpus/**/*.ts'],
}, null, 2)}\n`);
let diagnostics = diagnosticsFor(tsconfigPath);
if (diagnostics.length > 0) {
  const failingFiles = new Set(diagnostics
    .map((diagnostic) => diagnostic.file?.fileName)
    .filter(Boolean)
    .map((fileName) => slash(relative(corpusRoot, fileName))));
  for (const typecheckFile of failingFiles) {
    const item = workItems.get(typecheckFile);
    if (!item) continue;
    if (item.curated) {
      throw new Error(`Curated API example does not typecheck: ${item.page.path}\n${formatDiagnostics(diagnostics.filter((diagnostic) => diagnostic.file?.fileName.endsWith(typecheckFile)))}`);
    }
    const description = fallbackDescription(item.page, item.publicModule);
    const code = fallbackCode(item.page, item.publicModule, item.reflection);
    await writeFile(item.markdownPath, `${item.markdown}\n\n## Example\n\n${description}\n\n\`\`\`ts\n${code}\n\`\`\`\n`);
    await writeFile(resolve(corpusRoot, typecheckFile), `${code}\n`);
    item.manifestEntry.fallback = true;
  }
  diagnostics = diagnosticsFor(tsconfigPath);
}
if (diagnostics.length > 0) throw new Error(`Generated API examples do not typecheck:\n${formatDiagnostics(diagnostics)}`);
const uncuratedEntries = manifestEntries.filter(({ curated }) => !curated);
if (uncuratedEntries.length > 0) {
  throw new Error(`Every public API symbol requires a reviewed task-oriented example:\n${uncuratedEntries.map(({ path }) => `- ${path}`).join('\n')}`);
}
const dependencyEntries = manifestEntries.filter(({ fallback }) => fallback);
if (dependencyEntries.length > 0) {
  throw new Error(`Task-oriented API examples are required for every symbol page; replace generated dependency consumers:\n${dependencyEntries.map(({ path }) => `- ${path}`).join('\n')}`);
}

const counts = Object.fromEntries([...symbolKinds.values()].map(({ label }) => [label, 0]));
for (const entry of manifestEntries) counts[entry.kind] += 1;
const manifest = {
  version: 1,
  generatedAt: null,
  symbolPages: manifestEntries.length,
  curatedExamples: manifestEntries.filter(({ curated }) => curated).length,
  dependencyExamples: dependencyEntries.length,
  counts,
  entries: manifestEntries,
};
await writeFile(resolve(corpusRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`API examples valid: ${manifest.symbolPages} symbol pages, ${manifest.curatedExamples} curated, ${manifest.dependencyExamples} application-owned dependency examples, all snippets typechecked`);

function symbolPage(path) {
  const parts = path.split('/');
  const kindIndex = parts.findIndex((part) => symbolKinds.has(part));
  if (kindIndex < 0) return null;
  if (kindIndex === 0 || kindIndex !== parts.length - 2) {
    throw new Error(`Unexpected TypeDoc symbol path ${path}.`);
  }
  const symbol = basename(path, extname(path));
  if (!/^[$A-Z_a-z][$0-9A-Z_a-z]*$/.test(symbol)) {
    throw new Error(`${path} does not map to an importable TypeScript identifier.`);
  }
  return {
    path,
    moduleName: parts.slice(0, kindIndex).join('/'),
    symbol,
    kind: symbolKinds.get(parts[kindIndex]),
  };
}

function moduleNameForEntryPoint(entryPoint) {
  return entryPoint.replace(/\.ts$/, '').replace(/\/index$/, '');
}

function publicModuleFor(moduleName) {
  if (moduleName === 'src' || moduleName.startsWith('src/')) {
    return packageModule('@gluonjs/core', moduleName === 'src' ? '.' : `./${moduleName.slice(4)}`);
  }
  const match = /^(packages\/[^/]+)\/src(?:\/(.+))?$/.exec(moduleName);
  if (!match) throw new Error(`Cannot map TypeDoc module ${moduleName} to a public package.`);
  const packageEntry = packageContract.packages.find(({ directory }) => directory === match[1]);
  if (!packageEntry || packageEntry.state !== 'current') {
    throw new Error(`TypeDoc module ${moduleName} has no current package contract entry.`);
  }
  return packageModule(packageEntry.name, match[2] ? `./${match[2]}` : '.');
}

function packageModule(packageName, exportPath) {
  const packageEntry = packageContract.packages.find(({ name }) => name === packageName);
  if (!packageEntry?.exports.includes(exportPath)) {
    throw new Error(`${packageName} does not declare public export ${exportPath}.`);
  }
  return exportPath === '.' ? packageName : `${packageName}/${exportPath.slice(2)}`;
}

function baselineDescription(page, publicModule, reflection) {
  const documented = reflectionSummary(reflection);
  const purpose = documented || inferredPurpose(page, reflection);
  return `${sentence(purpose)} The example uses the public \`${publicModule}\` entry point:`;
}

function baselineCode(page, publicModule, reflection) {
  const localName = page.symbol === 'default' ? 'api' : page.symbol;
  const importLine = page.symbol === 'default'
    ? `import ${page.kind.typeOnly ? 'type ' : ''}${localName} from '${publicModule}';`
    : `import ${page.kind.typeOnly ? 'type ' : ''}{ ${page.symbol} } from '${publicModule}';`;
  const typeArguments = typeArgumentsFor(reflection);
  if (page.kind.label === 'Function') {
    const signature = reflection.signatures?.[0];
    if (!signature) throw new Error(`${page.path} has no callable signature.`);
    const argumentsList = requiredParameters(signature)
      .map((parameter) => synthesizeType(parameter.type, { hint: parameter.name, includeOptional: true }))
      .join(', ');
    const call = `${localName}(${argumentsList})`;
    if (isVoidType(signature.type)) return `${importLine}\n\n${call};`;
    return `${importLine}\n\nconst result = ${call};\nconsole.log(result);`;
  }
  if (page.kind.label === 'Variable') {
    const callable = callableInfo(reflection.type);
    if (callable) {
      const argumentsList = requiredParameters(callable.signature)
        .map((parameter) => synthesizeType(parameter.type, { hint: parameter.name, includeOptional: true, substitutions: callable.substitutions }))
        .join(', ');
      const call = `${localName}(${argumentsList})`;
      return isVoidType(callable.signature.type)
        ? `${importLine}\n\n${call};`
        : `${importLine}\n\nconst result = ${call};\nconsole.log(result);`;
    }
    const property = firstReadableProperty(reflection.type);
    if (property) return `${importLine}\n\nconsole.log(${localName}.${property});`;
    return `${importLine}\n\nconsole.log('${localName}:', ${localName});`;
  }
  if (page.kind.label === 'Class') {
    if (reflection.flags?.isAbstract) return consumerExample(importLine, localName, typeArguments, reflection);
    const constructor = reflection.children?.find(({ kind }) => kind === 512)?.signatures?.[0];
    if (!constructor) throw new Error(`${page.path} has no public constructor.`);
    const argumentsList = requiredParameters(constructor)
      .map((parameter) => synthesizeType(parameter.type, { hint: parameter.name }))
      .join(', ');
    return `${importLine}\n\nconst instance = new ${localName}(${argumentsList});\nconsole.log(instance);`;
  }
  if (!shouldCreateConcreteValue(page, reflection)) {
    return consumerExample(importLine, localName, typeArguments, reflection);
  }
  const expression = page.kind.label === 'Interface'
    ? synthesizeDeclaration(reflection, { includeOptional: true, hint: localName })
    : synthesizeType(reflection.type, { includeOptional: true, hint: localName });
  const variableName = exampleVariableName(localName);
  return `${importLine}\n\nconst ${variableName} = (${expression}) satisfies ${localName}${typeArguments};\nconsole.log(${variableName});`;
}

function reflectionSummary(reflection) {
  const comment = reflection.comment ?? reflection.signatures?.[0]?.comment;
  return (comment?.summary ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferredPurpose(page, reflection) {
  const name = page.symbol === 'default' ? 'Gluon Vite plugin' : humanizeIdentifier(page.symbol);
  const lowerName = name.toLowerCase();
  const domain = domainPurpose(page.moduleName);
  if (page.kind.label === 'Function') {
    const returnName = humanizeIdentifier(typeName(reflection.signatures?.[0]?.type) ?? `${page.symbol} result`).toLowerCase();
    if (/^create[A-Z]/.test(page.symbol)) return `Create a ${returnName} with caller-owned configuration for ${domain}`;
    if (/^define[A-Z]/.test(page.symbol)) return `Define a reusable ${humanizeIdentifier(page.symbol.slice(6)).toLowerCase()} with typed inputs for ${domain}`;
    if (/^is[A-Z]/.test(page.symbol)) return `Check whether an unknown value is ${humanizeIdentifier(page.symbol.slice(2)).toLowerCase()} before using its public contract`;
    if (/^get[A-Z]/.test(page.symbol)) return `Read ${humanizeIdentifier(page.symbol.slice(3)).toLowerCase()} needed by ${domain}`;
    if (/^set[A-Z]/.test(page.symbol)) return `Install ${humanizeIdentifier(page.symbol.slice(3)).toLowerCase()} for ${domain} and retain the returned cleanup handle when provided`;
    if (/^use[A-Z]/.test(page.symbol)) return `Read ${humanizeIdentifier(page.symbol.slice(3)).toLowerCase()} from the current application context for ${domain}`;
    if (/^render[A-Z]/.test(page.symbol) || page.symbol === 'render') return `Render ${humanizeIdentifier(page.symbol.replace(/^render/, '') || 'template').toLowerCase()} into the output required by ${domain}`;
    if (/^hydrate[A-Z]/.test(page.symbol) || page.symbol === 'hydrate') return `Bind ${humanizeIdentifier(page.symbol.replace(/^hydrate/, '') || 'template').toLowerCase()} to matching server-rendered state for ${domain}`;
    if (/^mount[A-Z]/.test(page.symbol)) return `Mount ${humanizeIdentifier(page.symbol.slice(5)).toLowerCase()} into an owned DOM target for ${domain}`;
    if (/^format[A-Z]/.test(page.symbol)) return `Format ${humanizeIdentifier(page.symbol.slice(6)).toLowerCase()} for human or machine consumption in ${domain}`;
    if (/^parse[A-Z]/.test(page.symbol)) return `Parse ${humanizeIdentifier(page.symbol.slice(5)).toLowerCase()} into the normalized structure used by ${domain}`;
    if (/^stringify[A-Z]/.test(page.symbol) || /^serialize[A-Z]/.test(page.symbol)) return `Serialize ${humanizeIdentifier(page.symbol.replace(/^(?:stringify|serialize)/, '')).toLowerCase()} for transport or URLs in ${domain}`;
    if (/^install[A-Z]/.test(page.symbol)) return `Install ${humanizeIdentifier(page.symbol.slice(7)).toLowerCase()} on its owner and retain deterministic cleanup for ${domain}`;
    if (/^analyze[A-Z]/.test(page.symbol)) return `Analyze ${humanizeIdentifier(page.symbol.slice(7)).toLowerCase()} and return structured evidence for ${domain}`;
    if (/^assert[A-Z]/.test(page.symbol)) return `Assert ${humanizeIdentifier(page.symbol.slice(6)).toLowerCase()} so leaked or invalid ${domain} state fails immediately`;
    if (/^cleanup[A-Z]/.test(page.symbol)) return `Release ${humanizeIdentifier(page.symbol.slice(7)).toLowerCase()} and report cleanup failures in ${domain}`;
    return `Use ${lowerName} to produce ${returnName} for ${domain}`;
  }
  if (page.kind.label === 'Class') {
    if (/Error$/.test(page.symbol)) return `Catch ${name} to distinguish structured ${domain} failures from unrelated exceptions`;
    return `Construct ${name} to own and coordinate its ${domain} lifecycle`;
  }
  if (page.kind.label === 'Variable') {
    if (/Styles?$/.test(page.symbol)) return `Adopt the shared ${name} stylesheet to apply the supported ${domain} visual contract`;
    if (/VERSION$|Version$/.test(page.symbol)) return `Compare ${name} when validating compatibility with the current ${domain} protocol or schema`;
    if (/Manifest$|manifest$/i.test(page.symbol)) return `Inspect ${name} to discover the public inventory supported by ${domain}`;
    if (page.symbol === 'nothing') return 'Render no child content or remove a dynamic attribute without inserting a placeholder node';
    if (page.symbol === 'q') return 'Create typed HTML Quarks through property access when composing low-level UI templates';
    if (/Key$/.test(page.symbol)) return `Use ${name} as the stable dependency-injection identity for ${domain}`;
    return `Use ${name} as the exported ${domain} value instead of duplicating its contract locally`;
  }
  if (/Options$|Config$/.test(page.symbol)) return `Configure ${name} before passing it to the owning ${domain} API`;
  if (/Props$/.test(page.symbol)) return `Supply typed ${name} values when rendering the corresponding ${domain} component`;
  if (/Result$|Response$|Report$|Summary$/.test(page.symbol)) return `Inspect ${name} returned after the ${domain} operation completes`;
  if (/Context$/.test(page.symbol)) return `Access the dependencies and state supplied while a ${domain} operation is running`;
  if (/Snapshot$|State$/.test(page.symbol)) return `Represent serializable ${domain} state for transport, restoration, or deterministic testing`;
  if (/Event$|EventMap$|EventRecord$/.test(page.symbol)) return `Handle structured ${name} data emitted by ${domain}`;
  if (/Callback$|Handler$|Hook$|Listener$|Behavior$|Guard$/.test(page.symbol)) return `Implement the ${name} callback invoked at the documented ${domain} lifecycle boundary`;
  if (/Plugin$/.test(page.symbol)) return `Extend ${domain} through the typed ${name} installation and cleanup contract`;
  if (/Fixture$/.test(page.symbol)) return `Control the isolated ${domain} resources and cleanup exposed by ${name}`;
  if (/Error$|Failure$|Diagnostic$|Finding$|Issue$/.test(page.symbol)) return `Inspect ${name} to handle a structured ${domain} failure or diagnostic`;
  if (/Map$|Record$|Manifest$|Declarations?$|Definitions?$/.test(page.symbol)) return `Describe the named ${domain} entries accepted by the ${name} contract`;
  if (/Ref$|Target$/.test(page.symbol)) return `Retain a typed reference to the ${domain} value represented by ${name}`;
  if (/Component$|Element$/.test(page.symbol)) return `Represent the typed renderable ${name} contract used by ${domain}`;
  return `Represent ${name} values exchanged through the public ${domain} APIs`;
}

function domainPurpose(moduleName) {
  if (moduleName.includes('/reactivity/')) return 'reactive state, effects, scheduling, and watchers';
  if (moduleName.includes('/router/')) return 'routing and navigation';
  if (moduleName.includes('/store/')) return 'application-scoped state management';
  if (moduleName.includes('/ssr/')) return 'server rendering and hydration';
  if (moduleName.includes('/test-utils/')) return 'component and application tests';
  if (moduleName.includes('/compiler/')) return 'Gluon source transformation and diagnostics';
  if (moduleName.includes('/vite/')) return 'Vite build integration';
  if (moduleName.includes('/language-server/')) return 'editor analysis and diagnostics';
  if (moduleName.includes('/vue-migration-analyzer/')) return 'Vue migration analysis';
  if (moduleName.includes('/devtools')) return 'development inspection';
  if (moduleName.includes('/create-gluon/')) return 'project scaffolding';
  if (/packages\/(?:quarks|atoms|molecules|organisms)\//.test(moduleName)) return 'the layered UI system';
  return 'Gluon application rendering';
}

function typeName(type) {
  if (!type) return null;
  if (type.type === 'reference' || type.type === 'intrinsic') return type.name;
  if (type.type === 'array') return 'array';
  if (type.type === 'reflection' && type.declaration?.signatures?.length) return 'callback result';
  return null;
}

function humanizeIdentifier(value) {
  return String(value)
    .replace(/^GLUON_/, 'Gluon ')
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentence(value) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function exampleVariableName(localName) {
  if (/Options$/.test(localName)) return 'options';
  if (/Props$/.test(localName)) return 'props';
  if (/Snapshot$/.test(localName)) return 'snapshot';
  if (/Result$/.test(localName)) return 'result';
  if (/Event$/.test(localName)) return 'eventRecord';
  return `${localName[0].toLowerCase()}${localName.slice(1)}Value`;
}

function fallbackDescription(page, publicModule) {
  const name = page.symbol === 'default' ? 'the default export' : `\`${page.symbol}\``;
  if (page.kind.label === 'Function') {
    return `Call ${name} from the public \`${publicModule}\` entry point when the application already owns its required runtime dependencies:`;
  }
  return `Consume ${name} from the public \`${publicModule}\` entry point without recreating framework-owned runtime state:`;
}

function fallbackCode(page, publicModule, reflection) {
  const localName = page.symbol === 'default' ? 'api' : page.symbol;
  const importLine = page.symbol === 'default'
    ? `import ${page.kind.typeOnly ? 'type ' : ''}${localName} from '${publicModule}';`
    : `import ${page.kind.typeOnly ? 'type ' : ''}{ ${page.symbol} } from '${publicModule}';`;
  if (page.kind.label === 'Function') {
    const functionName = `run${localName === 'api' ? 'Api' : localName[0].toUpperCase() + localName.slice(1)}`;
    const signature = reflection.signatures?.[0];
    if (!signature) throw new Error(`${page.path} has no callable signature for its dependency example.`);
    const parameters = requiredParameters(signature);
    const declarations = parameters.map((parameter, index) => (
      `${safeIdentifier(parameter.name, `value${index + 1}`)}: Parameters<typeof ${localName}>[${index}]`
    ));
    const argumentsList = parameters.map((parameter, index) => safeIdentifier(parameter.name, `value${index + 1}`));
    return `${importLine}\n\nfunction ${functionName}(\n  ${declarations.join(',\n  ')},\n): ReturnType<typeof ${localName}> {\n  return ${localName}(${argumentsList.join(', ')});\n}`;
  }
  return consumerExample(importLine, localName, typeArgumentsFor(reflection), reflection);
}

function shouldCreateConcreteValue(page, reflection) {
  if (page.kind.label === 'Interface') {
    const members = reflection.children ?? [];
    const required = members.filter((member) => !member.flags?.isOptional);
    if (required.length > 7 || members.length > 14) return false;
    return /(?:Options|Props|Position|Snapshot|Location|Definition|Entry|Range|Diagnostic|Source|State|Request|Record|Metadata|Mutation|Action|Manifest|Report|Config|Message|Hint|Issue|Edit|Selection|Span|Token|Event|Payload|Response|Finding|Inventory|Summary|Counts|Recommendation|Feature|Project|File|Limit|Budget|Violation|Carrier|Descriptor|Registration|Target|Declaration|Map)$/.test(page.symbol)
      || required.length <= 4;
  }
  if (page.kind.label === 'Type alias') {
    if (reflection.type?.type === 'intersection') return false;
    if (reflection.type?.type === 'reflection') {
      return Boolean(reflection.type.declaration?.signatures?.length)
        || (reflection.type.declaration?.children?.length ?? 0) <= 7;
    }
    return ['intrinsic', 'literal', 'union', 'reference', 'array', 'tuple', 'templateLiteral'].includes(reflection.type?.type);
  }
  return true;
}

function consumerExample(importLine, localName, typeArguments, reflection) {
  const property = (reflection.children ?? []).find((member) => (
    (member.kind === 1024 || member.kind === 2048) && /^[$A-Z_a-z][$0-9A-Z_a-z]*$/.test(member.name)
  ));
  const parameterName = safeIdentifier(localName[0].toLowerCase() + localName.slice(1), 'value');
  const observation = property ? `${parameterName}.${property.name}` : parameterName;
  return `${importLine}\n\nfunction use${localName}(${parameterName}: ${localName}${typeArguments}): void {\n  console.log(${observation});\n}`;
}

function requiredParameters(signature) {
  return (signature.parameters ?? []).filter((parameter) => (
    !parameter.flags?.isOptional && parameter.defaultValue === undefined
  ));
}

function synthesizeType(type, context = {}) {
  const depth = context.depth ?? 0;
  const visited = context.visited ?? new Set();
  if (!type) return 'undefined';
  if (depth > 7) return fallbackValue(type, context.hint);
  const next = (nestedType, extra = {}) => synthesizeType(nestedType, {
    ...context,
    ...extra,
    depth: depth + 1,
    visited,
  });
  switch (type.type) {
    case 'intrinsic':
      return intrinsicValue(type.name, context.hint);
    case 'literal':
      return typeof type.value === 'bigint' ? `${type.value}n` : JSON.stringify(type.value);
    case 'array':
      return shouldPopulateArray(context.hint)
        ? `[${next(type.elementType, { hint: singular(context.hint) })}]`
        : '[]';
    case 'tuple':
      return `[${(type.elements ?? []).map((element, index) => next(element, { hint: `${context.hint ?? 'item'}${index + 1}` })).join(', ')}]`;
    case 'typeOperator':
      return next(type.target);
    case 'optional':
      return next(type.elementType);
    case 'rest':
      return next(type.elementType);
    case 'union': {
      const candidate = preferredUnionType(type.types ?? []);
      return next(candidate);
    }
    case 'intersection': {
      const objects = (type.types ?? []).map((part) => next(part));
      return objects.length === 1 ? objects[0] : `Object.assign({}, ${objects.join(', ')})`;
    }
    case 'reflection':
      return synthesizeDeclaration(type.declaration, { ...context, depth: depth + 1, visited });
    case 'reference':
      return synthesizeReference(type, context);
    case 'templateLiteral':
      return JSON.stringify(`${type.head ?? ''}${(type.tail ?? []).map(([part, suffix]) => `${templateLiteralPart(part)}${suffix}`).join('')}`);
    case 'unknown':
      return '{}';
    default:
      return fallbackValue(type, context.hint);
  }
}

function synthesizeReference(type, context) {
  if (type.refersToTypeParameter) {
    const substitution = context.substitutions?.get(type.name);
    if (substitution) return synthesizeType(substitution, { ...context, depth: (context.depth ?? 0) + 1 });
    const parameter = typeof type.target === 'number' ? reflectionsById.get(type.target) : undefined;
    if (parameter?.type) return synthesizeType(parameter.type, { ...context, hint: type.name, depth: (context.depth ?? 0) + 1 });
    return valueForName(type.name);
  }
  const name = type.name;
  const argumentsList = type.typeArguments ?? [];
  if (name === 'Array' || name === 'ReadonlyArray') {
    return shouldPopulateArray(context.hint)
      ? `[${synthesizeType(argumentsList[0], { ...context, hint: singular(context.hint), depth: (context.depth ?? 0) + 1 })}]`
      : '[]';
  }
  if (name === 'Readonly' || name === 'Required' || name === 'Partial') {
    return name === 'Partial' ? '{}' : synthesizeType(argumentsList[0], { ...context, depth: (context.depth ?? 0) + 1 });
  }
  if (name === 'Record') {
    return `{ example: ${synthesizeType(argumentsList[1], { ...context, hint: 'value', depth: (context.depth ?? 0) + 1 })} }`;
  }
  if (name === 'Promise' || name === 'PromiseLike') {
    return `Promise.resolve(${synthesizeType(argumentsList[0], { ...context, hint: 'result', depth: (context.depth ?? 0) + 1 })})`;
  }
  if (name === 'Map' || name === 'ReadonlyMap') return 'new Map()';
  if (name === 'Set' || name === 'ReadonlySet') return 'new Set()';
  if (name === 'Date') return "new Date('2026-01-01T00:00:00Z')";
  if (name === 'RegExp') return '/example/u';
  if (name === 'URL') return "new URL('https://example.com/products')";
  if (name === 'URLSearchParams') return "new URLSearchParams({ page: '1' })";
  if (name === 'AbortSignal') return 'new AbortController().signal';
  if (name === 'Error') return "new Error('Example failure')";
  if (name === 'CSSStyleSheet') return 'new CSSStyleSheet()';
  if (name === 'Document') return 'document';
  if (name === 'ShadowRoot') return "document.createElement('div').attachShadow({ mode: 'open' })";
  if (/^(?:HTML\w*Element|HTMLElement|Element|Node)$/.test(name)) return "document.createElement('div')";
  if (name === 'CustomElementConstructor') return 'class ExampleElement extends HTMLElement {}';
  if (name === 'PropertyKey') return "'example'";
  if (name === 'Awaited') return synthesizeType(argumentsList[0], { ...context, depth: (context.depth ?? 0) + 1 });
  if (typeof type.target === 'number') {
    const declaration = reflectionsById.get(type.target);
    if (declaration) {
      const key = `${type.target}:${context.hint ?? ''}`;
      if (context.visited?.has(key)) return fallbackValue(type, context.hint);
      const visited = new Set(context.visited ?? []);
      visited.add(key);
      const substitutions = new Map(context.substitutions ?? []);
      for (const [index, parameter] of (declaration.typeParameters ?? []).entries()) {
        const argument = type.typeArguments?.[index] ?? parameter.default;
        if (argument) substitutions.set(parameter.name, argument);
      }
      if (declaration.kind === 256) {
        return synthesizeDeclaration(declaration, { ...context, depth: (context.depth ?? 0) + 1, visited, substitutions });
      }
      if (declaration.kind === 2097152) {
        return synthesizeType(declaration.type, { ...context, depth: (context.depth ?? 0) + 1, visited, substitutions });
      }
      if (declaration.kind === 8) {
        const member = declaration.children?.[0]?.name;
        if (member) return JSON.stringify(member);
      }
      if (declaration.kind === 128) {
        return synthesizeDeclaration(declaration, { ...context, depth: (context.depth ?? 0) + 1, visited, substitutions });
      }
    }
  }
  return valueForName(name || context.hint);
}

function synthesizeDeclaration(declaration, context = {}) {
  const signature = declaration.signatures?.[0];
  if (signature) return synthesizeFunction(signature, context);
  const indexSignature = declaration.indexSignatures?.[0];
  const properties = (declaration.children ?? []).filter(({ kind }) => kind === 1024);
  const methods = (declaration.children ?? []).filter(({ kind }) => kind === 2048);
  const required = [...properties, ...methods].filter((member) => !member.flags?.isOptional);
  const optional = context.includeOptional
    ? [...properties, ...methods]
      .filter((member) => member.flags?.isOptional)
      .sort((left, right) => exampleMemberScore(left) - exampleMemberScore(right))
      .slice(0, 3)
    : [];
  const selected = [...required, ...optional];
  if (selected.length === 0 && indexSignature) {
    return `{ example: ${synthesizeType(indexSignature.type, { ...context, hint: 'value', depth: (context.depth ?? 0) + 1 })} }`;
  }
  if (selected.length === 0) return '{}';
  const lines = selected.map((member) => {
    const memberSignature = member.signatures?.[0];
    const value = memberSignature
      ? synthesizeFunction(memberSignature, { ...context, hint: member.name })
      : synthesizeType(member.type, { ...context, hint: member.name, depth: (context.depth ?? 0) + 1 });
    return `  ${propertyName(member.name)}: ${indent(value, 2)},`;
  });
  return `{\n${lines.join('\n')}\n}`;
}

function synthesizeFunction(signature, context = {}) {
  const parameters = (signature.parameters ?? []).map((parameter, index) => (
    safeIdentifier(parameter.name, `value${index + 1}`)
  ));
  const body = isVoidType(signature.type)
    ? parameters.length > 0 ? `console.log(${parameters[0]});` : 'return;'
    : `return ${synthesizeType(signature.type, { ...context, hint: 'result', depth: (context.depth ?? 0) + 1 })};`;
  return `(${parameters.join(', ')}) => { ${body} }`;
}

function typeArgumentsFor(reflection) {
  if (!reflection.typeParameters?.length) return '';
  return `<${reflection.typeParameters.map((parameter) => typeArgumentFor(parameter)).join(', ')}>`;
}

function typeArgumentFor(parameter) {
  const named = {
    Id: "'counter'",
    State: '{ count: number }',
    Getters: '{}',
    Actions: '{}',
    Events: '{ change: CustomEvent<number> }',
    Params: '{ id: string }',
    Props: '{ label: string }',
    ElementType: 'HTMLButtonElement',
    Constructor: 'typeof HTMLElement',
    Routes: "{ product: { params: { id: string } } }",
    Args: '[string]',
    Names: "'default'",
    TagName: "'button'",
  }[parameter.name];
  if (named) return named;
  if (parameter.default) return typeText(parameter.default, parameter.name);
  return constraintTypeArgument(parameter.type);
}

function constraintTypeArgument(type) {
  if (type?.type === 'intrinsic' && type.name === 'string') return "'example'";
  if (type?.type === 'intrinsic' && type.name === 'object') return 'Record<string, unknown>';
  if (type?.type === 'reference' && /Element$/.test(type.name)) return 'HTMLButtonElement';
  if (type?.type === 'typeOperator') return '[string]';
  return 'string';
}

function typeText(type, hint) {
  if (!type) return constraintTypeArgument(type);
  if (type.type === 'intrinsic') return type.name;
  if (type.type === 'literal') return JSON.stringify(type.value);
  if (type.type === 'reference' && type.refersToTypeParameter) return typeArgumentFor({ name: type.name });
  if (type.type === 'reference' && type.name === 'Record') return 'Record<string, unknown>';
  if (type.type === 'reference' && /Element$/.test(type.name)) return 'HTMLButtonElement';
  if (type.type === 'array') return `${typeText(type.elementType, hint)}[]`;
  if (type.type === 'typeOperator') return `readonly ${typeText(type.target, hint)}[]`;
  return constraintTypeArgument(type, hint);
}

function intrinsicValue(name, hint) {
  if (name === 'string') return stringValue(hint);
  if (name === 'number') return numberValue(hint);
  if (name === 'boolean') return 'true';
  if (name === 'bigint') return '1n';
  if (name === 'symbol') return "Symbol('example')";
  if (name === 'null') return 'null';
  if (name === 'undefined' || name === 'void') return 'undefined';
  if (name === 'object') return "{ id: 'example' }";
  if (name === 'unknown') return "{ id: 'example' }";
  if (name === 'never') return "(() => { throw new Error('Unreachable'); })()";
  return '{}';
}

function templateLiteralPart(type) {
  if (type?.type === 'intrinsic' && type.name === 'number') return '1';
  if (type?.type === 'intrinsic' && type.name === 'bigint') return '1';
  if (type?.type === 'literal') return String(type.value);
  return 'example';
}

function stringValue(hint = '') {
  const normalized = hint.toLowerCase();
  if (normalized.includes('query')) return "'?category=lighting&page=2'";
  if (normalized.includes('hash')) return "'#details'";
  if (normalized.includes('message')) return "'Product saved'";
  if (normalized.includes('path') || normalized.includes('location') || normalized.includes('url')) return "'/products/42'";
  if (normalized.includes('id') || normalized.includes('name') || normalized.includes('key')) return "'example'";
  if (normalized.includes('source') || normalized.includes('code')) return "'export const value = 42;'";
  if (normalized.includes('selector')) return "'button'";
  if (normalized.includes('tag')) return "'button'";
  return "'example'";
}

function numberValue(hint = '') {
  const normalized = hint.toLowerCase();
  if (normalized.includes('index') || normalized.includes('position')) return '0';
  if (normalized.includes('delta')) return '-1';
  return '1';
}

function valueForName(name = '') {
  if (/^(?:T|Value|Data|Public|Props|Item|Options)$/.test(name)) return "'example'";
  if (/^(?:Id|Name|Key|TagName|Names)$/.test(name)) return "'example'";
  if (/Element|Node/.test(name)) return "document.createElement('div')";
  if (/Error/.test(name)) return "new Error('Example failure')";
  if (/Route|Location|Path/.test(name)) return "'/products/42'";
  return "{ id: 'example' }";
}

function preferredUnionType(types) {
  const withoutEmpty = types.filter((type) => !(
    type.type === 'intrinsic' && ['undefined', 'void', 'null', 'never'].includes(type.name)
  ));
  const literals = withoutEmpty.filter(({ type }) => type === 'literal');
  return literals[0] ?? withoutEmpty[0] ?? types[0];
}

function fallbackValue(type, hint) {
  if (type?.type === 'intrinsic') return intrinsicValue(type.name, hint);
  if (type?.type === 'array') return '[]';
  return valueForName(type?.name ?? hint);
}

function callableInfo(type) {
  if (type?.type === 'reflection') {
    const signature = type.declaration?.signatures?.[0];
    return signature ? { signature, substitutions: new Map() } : null;
  }
  if (type?.type === 'reference' && typeof type.target === 'number') {
    const target = reflectionsById.get(type.target);
    const signature = target?.signatures?.[0]
      ?? (target?.type?.type === 'reflection' ? target.type.declaration?.signatures?.[0] : undefined);
    if (!signature) return null;
    const substitutions = new Map();
    for (const [index, parameter] of (target.typeParameters ?? []).entries()) {
      const argument = type.typeArguments?.[index] ?? parameter.default;
      if (argument) substitutions.set(parameter.name, argument);
    }
    return { signature, substitutions };
  }
  return null;
}

function firstReadableProperty(type) {
  if (type?.type !== 'reflection' && !(type?.type === 'reference' && typeof type.target === 'number')) return null;
  const declaration = type.type === 'reflection' ? type.declaration : reflectionsById.get(type.target);
  return declaration?.children?.find(({ kind }) => kind === 1024)?.name ?? null;
}

function isVoidType(type) {
  return type?.type === 'intrinsic' && (type.name === 'void' || type.name === 'undefined');
}

function shouldPopulateArray(hint = '') {
  return /routes|entries|items|records|components|files|diagnostics/i.test(hint);
}

function exampleMemberScore(member) {
  if (member.signatures?.length) return 2;
  const type = member.type;
  if (type?.type === 'intrinsic' || type?.type === 'literal' || type?.type === 'templateLiteral') return 0;
  if (type?.type === 'union' && type.types?.some((entry) => entry.type === 'literal' || entry.type === 'intrinsic')) return 1;
  if (type?.type === 'reflection' && type.declaration?.signatures?.length) return 2;
  if (type?.type === 'array' || type?.type === 'tuple') return 3;
  return 5;
}

function singular(value = 'item') {
  return value.replace(/ies$/i, 'y').replace(/s$/i, '') || 'item';
}

function propertyName(name) {
  return /^[$A-Z_a-z][$0-9A-Z_a-z]*$/.test(name) ? name : JSON.stringify(name);
}

function safeIdentifier(name, fallback) {
  return /^[$A-Z_a-z][$0-9A-Z_a-z]*$/.test(name) ? name : fallback;
}

function indent(value, spaces) {
  return value.replace(/\n/g, `\n${' '.repeat(spaces)}`);
}

function indexReflections(value) {
  if (Array.isArray(value)) {
    for (const entry of value) indexReflections(entry);
    return;
  }
  if (!isRecord(value)) return;
  if (typeof value.id === 'number') reflectionsById.set(value.id, value);
  for (const nested of Object.values(value)) indexReflections(nested);
}

function curatedCode(page, override, recipe) {
  if (typeof override.description !== 'string' || override.description.trim() === '') {
    throw new Error(`${page.path} curated example requires a description.`);
  }
  const code = override.code ?? recipe?.code;
  if (!Array.isArray(code) || code.length === 0
    || code.some((line) => typeof line !== 'string')) {
    throw new Error(`${page.path} curated example requires a non-empty code line array.`);
  }
  const source = code.join('\n');
  if (page.symbol !== 'default' && !source.includes(page.symbol)) {
    throw new Error(`${page.path} curated example must use its documented symbol.`);
  }
  return source;
}

function diagnosticsFor(tsconfigPath) {
  const loaded = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (loaded.error) throw new Error(ts.formatDiagnosticsWithColorAndContext([loaded.error], formatHost()));
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, dirname(tsconfigPath));
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  return ts.getPreEmitDiagnostics(program);
}

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost());
}

function formatHost() {
  return {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => root,
    getNewLine: () => '\n',
  };
}

async function filesWithExtension(directory, extension) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesWithExtension(path, extension));
    else if (entry.isFile() && extname(entry.name) === extension) files.push(path);
  }
  return files;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

function slash(path) {
  return sep === '/' ? path : path.split(sep).join('/');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
