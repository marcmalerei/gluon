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

if (catalog.version !== 1 || !isRecord(catalog.overrides)) {
  throw new Error('docs-site/api-examples.json must contain version 1 and an overrides object.');
}

const modules = new Map();
const compilerPaths = {};
const reflectionModules = new Map((reflectionProject.children ?? []).map((module) => [module.name, module]));
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

for (const [index, page] of symbolPages.entries()) {
  const module = modules.get(page.moduleName);
  if (!module) throw new Error(`${page.path} belongs to unknown TypeDoc module ${page.moduleName}.`);
  const reflection = (reflectionModules.get(page.moduleName)?.children ?? [])
    .find((candidate) => candidate.name === page.symbol && candidate.kind === page.kind.reflectionKind);
  if (!reflection) throw new Error(`${page.path} has no matching TypeDoc reflection.`);
  const override = catalog.overrides[page.path];
  if (override) unusedOverrides.delete(page.path);
  const publicModule = override?.module ?? module.publicModule;
  if (!compilerPaths[publicModule]) {
    throw new Error(`${page.path} uses non-public or unconfigured module ${publicModule}.`);
  }
  const description = override?.description ?? baselineDescription(page, publicModule);
  const code = override ? curatedCode(page, override) : baselineCode(page, publicModule, reflection);
  const markdownPath = resolve(apiRoot, page.path);
  const markdown = await readFile(markdownPath, 'utf8');
  if (/^## Examples?$/m.test(markdown)) {
    throw new Error(`${page.path} already contains an Example section outside the verified catalog.`);
  }
  await writeFile(markdownPath, `${markdown.trimEnd()}\n\n## Example\n\n${description}\n\n\`\`\`ts\n${code}\n\`\`\`\n`);

  const typecheckFile = `corpus/${String(index + 1).padStart(4, '0')}.ts`;
  await writeFile(resolve(corpusRoot, typecheckFile), `${code}\n`);
  manifestEntries.push({
    path: page.path,
    htmlPath: page.path.replace(/\.md$/, '.html'),
    kind: page.kind.label,
    symbol: page.symbol,
    module: publicModule,
    curated: Boolean(override),
    typecheckFile,
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
typecheck(tsconfigPath);

const counts = Object.fromEntries([...symbolKinds.values()].map(({ label }) => [label, 0]));
for (const entry of manifestEntries) counts[entry.kind] += 1;
const manifest = {
  version: 1,
  generatedAt: null,
  symbolPages: manifestEntries.length,
  curatedExamples: manifestEntries.filter(({ curated }) => curated).length,
  counts,
  entries: manifestEntries,
};
await writeFile(resolve(corpusRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`API examples valid: ${manifest.symbolPages} symbol pages, ${manifest.curatedExamples} curated, all snippets typechecked`);

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

function baselineDescription(page, publicModule) {
  const noun = page.kind.typeOnly ? 'type' : page.kind.label.toLowerCase();
  if (page.symbol === 'default') {
    return `Import and use the default ${noun} from its public \`${publicModule}\` entry point:`;
  }
  return `Import and use the \`${page.symbol}\` ${noun} from its public \`${publicModule}\` entry point:`;
}

function baselineCode(page, publicModule, reflection) {
  const localName = page.symbol === 'default' ? 'api' : page.symbol;
  const importLine = page.symbol === 'default'
    ? `import ${page.kind.typeOnly ? 'type ' : ''}${localName} from '${publicModule}';`
    : `import ${page.kind.typeOnly ? 'type ' : ''}{ ${page.symbol} } from '${publicModule}';`;
  const typeArguments = reflection.typeParameters?.length > 0
    ? `<${reflection.typeParameters.map(() => 'any').join(', ')}>`
    : '';
  if (page.kind.label === 'Function') {
    return `${importLine}\n\ntype ApiArguments = typeof ${localName} extends (...args: infer Args) => unknown ? Args : never;\ndeclare const args: ApiArguments;\nconst result = ${localName}(...args);\nvoid result;`;
  }
  if (page.kind.label === 'Variable') {
    return `${importLine}\n\nconst value = ${localName};\nvoid value;`;
  }
  return `${importLine}\n\ntype Example = ${localName}${typeArguments};`;
}

function curatedCode(page, override) {
  if (typeof override.description !== 'string' || override.description.trim() === '') {
    throw new Error(`${page.path} curated example requires a description.`);
  }
  if (!Array.isArray(override.code) || override.code.length === 0
    || override.code.some((line) => typeof line !== 'string')) {
    throw new Error(`${page.path} curated example requires a non-empty code line array.`);
  }
  return override.code.join('\n');
}

function typecheck(tsconfigPath) {
  const loaded = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (loaded.error) throw new Error(ts.formatDiagnosticsWithColorAndContext([loaded.error], formatHost()));
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, dirname(tsconfigPath));
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    throw new Error(`Generated API examples do not typecheck:\n${ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost())}`);
  }
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
