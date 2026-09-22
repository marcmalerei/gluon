import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const versions = JSON.parse(await readFile(resolve(root, 'docs-site/versions.json'), 'utf8'));
const contract = JSON.parse(await readFile(resolve(root, 'package-contract.json'), 'utf8'));
const packageDocs = JSON.parse(await readFile(resolve(root, 'docs-site/package-docs.json'), 'utf8'));
const metadata = new Map(packageDocs.packages.map((entry) => [entry.name, entry]));
const checkOnly = process.argv.includes('--check');
const site = 'https://marcmalerei.github.io/gluon';
let stale = false;

for (const entry of contract.packages.filter((pkg) => pkg.state === 'current')) {
  const path = resolve(root, entry.directory, 'README.md');
  const current = await readFile(path, 'utf8');
  const docs = metadata.get(entry.name);
  if (!docs) throw new Error(`Missing package documentation metadata for ${entry.name}.`);

  const start = current.indexOf('<!-- gluon-package-overview:start -->');
  const end = current.indexOf('<!-- gluon-package-overview:end -->');
  let source = current;
  if (start >= 0 || end >= 0) {
    if (start < 0 || end < start) throw new Error(`Unbalanced package overview markers in ${path}.`);
    source = `${current.slice(0, start)}${current.slice(end + '<!-- gluon-package-overview:end -->'.length)}`;
  }

  if (entry.directory !== '.') {
    const headerMarker = '<!-- gluon-package-header:end -->';
    const headerEnd = source.indexOf(headerMarker) + headerMarker.length;
    const remainder = source.slice(headerEnd).replace(/^\s*/, '');
    if (!remainder.startsWith(`# ${entry.name}\n`)) {
      source = `${source.slice(0, headerEnd)}\n\n# ${entry.name}\n\n${remainder}`;
    }
  }

  const slug = packageSlug(entry.name);
  const readmeBlock = createOverview(entry, docs, versions.latest, slug, site);
  const bodyStart = source.indexOf('<!-- gluon-package-header:end -->');
  if (bodyStart < 0) throw new Error(`Missing package header end marker in ${path}.`);
  const headerEnd = bodyStart + '<!-- gluon-package-header:end -->'.length;
  const remainder = source.slice(headerEnd);
  const firstContent = remainder.search(/^(?:##\s|```)/m);
  const insertion = firstContent < 0 ? source.length : headerEnd + firstContent;
  const expected = `${source.slice(0, insertion).replace(/\s*$/, '\n\n')}${readmeBlock}\n\n${source.slice(insertion).replace(/^\s*/, '')}`;

  if (checkOnly) {
    if (expected !== current) {
      console.error(`package README overview is stale: ${path}`);
      stale = true;
    }
  } else if (expected !== current) {
    await writeFile(path, expected, 'utf8');
  }
}

if (stale) process.exitCode = 1;
else console.log(`${checkOnly ? 'validated' : 'generated'} consistent package overviews for ${metadata.size} packages`);
if (!stale) await validateStarters();

function createOverview(entry, docs, version, slug, siteUrl) {
  const readmePath = entry.directory === '.' ? 'README.md' : `${entry.directory}/README.md`;
  const apiSource = entry.directory === '.' ? 'src' : `${entry.directory}/src`;
  const apiHref = `${siteUrl}/${version}/api/generated/${apiSource}/`;
  const guideRows = docs.relatedGuides.map(({ label, href }) => `- [${label}](${siteUrl}${href.replace(/^\/gluon/, '')})`);
  const publicLinks = entry.exports.map((subpath) => {
    const apiPath = subpath === '.' ? apiHref : `${apiHref}${subpath.slice(2)}/`;
    return `[\`${entry.name}${subpath === '.' ? '' : subpath.slice(1)}\`](${apiPath})`;
  }).join(' · ');
  const install = entry.name === 'create-gluon' ? 'npm create gluon@latest my-app' : `npm install ${entry.name}`;

  return [
    '<!-- gluon-package-overview:start -->',
    `## ${entry.name} at a glance`,
    '',
    `**Runtime:** ${entry.environment} · **Release:** ${version}`,
    '',
    `[Documentation guide](${siteUrl}/latest/packages/${slug}/) · [npm](${npmUrl(entry.name)}) · [Source](${githubReadme(readmePath)})`,
    '',
    `**Public API:** ${publicLinks}`,
    '',
    '### Install',
    '',
    '```sh',
    install,
    '```',
    '',
    '### Quick start',
    '',
    '```' + docs.starter.language,
    docs.starter.code.trimEnd(),
    '```',
    '',
    '### Choose this package when',
    '',
    ...docs.useCases.map((item) => `- ${item}`),
    '',
    '**Choose another boundary when:**',
    '',
    ...docs.limits.map((item) => `- ${item}`),
    '',
    '### Related documentation',
    '',
    ...guideRows,
    '',
    '<!-- gluon-package-overview:end -->',
  ].join('\n');
}

function packageSlug(name) {
  return name.startsWith('@gluonjs/') ? name.slice('@gluonjs/'.length) : name;
}

function npmUrl(name) {
  return `https://www.npmjs.com/package/${name}`;
}

function githubReadme(path) {
  return `https://github.com/marcmalerei/gluon/blob/main/${path}`;
}

async function validateStarters() {
  const tempRoot = resolve(root, '.tmp/package-docs-starters');
  await rm(tempRoot, { recursive: true, force: true });
  await mkdir(tempRoot, { recursive: true });
  const files = [];
  for (const entry of contract.packages.filter((pkg) => pkg.state === 'current')) {
    const starter = metadata.get(entry.name).starter;
    if (starter.language !== 'ts') continue;
    const filename = resolve(tempRoot, `${packageSlug(entry.name)}.ts`);
    await writeFile(filename, `${starter.code.trimEnd()}\n`, 'utf8');
    files.push(filename);
  }
  const configFile = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
  if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
  const program = ts.createProgram({
    rootNames: files,
    options: { ...parsed.options, noEmit: true },
    projectReferences: parsed.projectReferences,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => '\n',
    });
    throw new Error(`Package quick starts must typecheck against the public workspace APIs:\n${formatted}`);
  }
  console.log(`package quick starts typechecked: ${files.length} TypeScript examples`);
}
