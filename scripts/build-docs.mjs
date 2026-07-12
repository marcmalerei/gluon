import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import MarkdownIt from 'markdown-it';

const root = resolve(import.meta.dirname, '..');
const siteRoot = resolve(root, 'docs-site');
const contentRoot = resolve(siteRoot, 'content');
const apiRoot = resolve(root, '.tmp/docs-api');
const outputRoot = resolve(siteRoot, 'dist');
const versions = JSON.parse(await readFile(resolve(siteRoot, 'versions.json'), 'utf8'));
const base = normalizeBase(process.env.DOCS_BASE ?? '/gluon/');

for (const version of versions.supported) {
  const entries = await readdir(resolve(contentRoot, version));
  if (entries.length === 0) throw new Error(`documentation version ${version} has no content`);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(resolve(outputRoot, 'assets'), { recursive: true });
await cp(resolve(siteRoot, 'assets'), resolve(outputRoot, 'assets'), { recursive: true });

const maintainedPages = (await markdownFiles(contentRoot)).map((source) => ({
  source,
  relative: relative(contentRoot, source),
}));
const apiPages = (await markdownFiles(apiRoot)).map((source) => ({
  source,
  relative: join(versions.latest, 'api', 'generated', relative(apiRoot, source)),
}));
const pages = [...maintainedPages, ...apiPages];

for (const page of pages) await renderPage(page);
await writeRedirect(resolve(outputRoot, 'index.html'), `${base}${versions.latest}/`);
await writeFile(resolve(outputRoot, '404.html'), pageShell({
  title: 'Documentation page not found',
  description: 'The requested Gluon documentation page does not exist.',
  content: '<h1>Documentation page not found.</h1><p>Choose a supported release from the archive.</p>',
  relativePath: '404.md',
  headings: [],
}), 'utf8');

console.log(`built ${pages.length} documentation pages for ${versions.supported.join(', ')}`);

async function renderPage(page) {
  let markdown = await readFile(page.source, 'utf8');
  markdown = await expandIncludes(markdown, dirname(page.source));
  const headings = [];
  const environment = { headings, slugs: new Map() };
  const markdownRenderer = createMarkdownRenderer();
  let content = markdownRenderer.render(markdown, environment);
  const title = firstHeading(markdown) ?? 'Gluon documentation';
  const description = firstParagraph(markdown) ?? 'Versioned Gluon framework documentation.';
  if (slash(page.relative) === `${versions.latest}/index.md`) {
    content = content.replace(
      /<h2([^>]*)>(.*?)<\/h2>\n<p>(.*?)<\/p>\n<p>(.*?)<\/p>/gs,
      '<section class="home-row"><h2$1>$2</h2><p>$3</p><p>$4</p></section>',
    );
  }
  const destination = outputPath(page.relative);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, pageShell({
    title,
    description,
    content,
    relativePath: slash(page.relative),
    headings,
  }), 'utf8');
}

function createMarkdownRenderer() {
  const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false });
  const defaultLinkOpen = markdown.renderer.rules.link_open
    ?? ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));
  markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
    const href = tokens[index].attrIndex('href');
    if (href >= 0) tokens[index].attrs[href][1] = rewriteMarkdownLink(tokens[index].attrs[href][1]);
    return defaultLinkOpen(tokens, index, options, environment, renderer);
  };
  markdown.renderer.rules.heading_open = (tokens, index, options, environment, renderer) => {
    const level = Number(tokens[index].tag.slice(1));
    const label = tokens[index + 1]?.content ?? '';
    const baseSlug = slugify(label) || 'section';
    const count = environment.slugs.get(baseSlug) ?? 0;
    environment.slugs.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    tokens[index].attrSet('id', slug);
    if (level === 2 || level === 3) environment.headings.push({ level, label, slug });
    return renderer.renderToken(tokens, index, options);
  };
  markdown.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/)[0] || 'text';
    const code = markdown.utils.escapeHtml(token.content);
    return `<figure class="code-frame"><figcaption><span>${escapeHtml(language)}</span><button type="button" data-copy-code>Copy</button></figcaption><pre><code class="language-${escapeHtml(language)}">${code}</code></pre></figure>`;
  };
  return markdown;
}

function pageShell({ title, description, content, relativePath, headings }) {
  const pathParts = relativePath.split('/');
  const version = versions.supported.includes(pathParts[0]) ? pathParts[0] : versions.latest;
  const currentUrl = pageUrl(relativePath);
  const section = pathParts[1] ?? 'start';
  const home = relativePath === `${version}/index.md`;
  const sidebar = [
    ['Start', `${base}${version}/`],
    ['Core', `${base}${version}/api/generated/src/`],
    ['Reactivity', `${base}${version}/api/generated/packages/reactivity/src/`],
    ['Router', `${base}${version}/api/generated/packages/router/src/`],
    ['Store', `${base}${version}/api/generated/packages/store/src/`],
    ['UI packages', `${base}${version}/api/generated/packages/quarks/src/`],
    ['Universal rendering', `${base}${version}/guides/universal-rendering/`],
    ['Tooling', `${base}${version}/guides/tooling/`],
    ['Quality', `${base}${version}/guides/quality/`],
  ];
  const headerNavigation = [
    ['Guides', `${base}${version}/guides/`],
    ['API', `${base}${version}/api/`],
    ['Cookbook', `${base}${version}/cookbook/`],
    ['Migration', `${base}${version}/migration/`],
  ];
  const toc = headings.length === 0 ? '' : `<aside class="toc" aria-label="On this page"><strong>On this page</strong><ol>${headings.map((heading) => `<li class="toc-level-${heading.level}"><a href="#${heading.slug}">${escapeHtml(heading.label)}</a></li>`).join('')}</ol></aside>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="description" content="${escapeHtml(description)}">
    <title>${escapeHtml(title)} · Gluon ${version}</title>
    <link rel="stylesheet" href="${base}assets/docs.css">
    <link rel="canonical" href="https://marcmalerei.github.io${currentUrl}">
  </head>
  <body class="${home ? 'doc-home' : 'doc-page'}" data-section="${escapeHtml(section)}">
    <a class="skip-link" href="#content">Skip to content</a>
    <header class="site-header">
      <button class="menu-button" type="button" aria-label="Open documentation navigation" aria-expanded="false" data-menu-button><span></span><span></span></button>
      <a class="brand" href="${base}${version}/">GLUON / DOCS</a>
      <nav class="header-nav" aria-label="Documentation">${headerNavigation.map(([label, href]) => `<a href="${href}"${currentUrl.startsWith(href) ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
      <label class="version-control"><span>Docs version</span><select data-version-select>${versions.supported.map((entry) => `<option value="${entry}"${entry === version ? ' selected' : ''}>${entry}</option>`).join('')}</select></label>
      <a class="playground-action" href="${base}playground/">Playground</a>
    </header>
    <div class="site-grid">
      <aside class="sidebar" aria-label="Framework sections" data-sidebar>
        <nav>${sidebar.map(([label, href], index) => `<a href="${href}"${sidebarCurrent(index, label, currentUrl, version) ? ' aria-current="page"' : ''}><span>${label}</span><span aria-hidden="true">→</span></a>`).join('')}</nav>
      </aside>
      <main id="content" class="content"><article>${content}</article></main>
      ${toc}
    </div>
    <footer class="site-footer"><span>Gluon ${version}</span><a href="https://github.com/marcmalerei/gluon">GitHub</a><a href="${base}playground/">Playground</a><a href="${base}archive/">Release archive</a></footer>
    <script type="module" src="${base}assets/docs.js"></script>
  </body>
</html>`;
}

function sidebarCurrent(index, label, currentUrl, version) {
  if (index === 0) return currentUrl === `${base}${version}/` || currentUrl.includes(`/${version}/guides/getting-started/`);
  if (label === 'Core') return currentUrl.includes(`/${version}/api/generated/src/`);
  if (label === 'Reactivity') return currentUrl.includes('/api/generated/packages/reactivity/');
  if (label === 'Router') return currentUrl.includes('/api/generated/packages/router/');
  if (label === 'Store') return currentUrl.includes('/api/generated/packages/store/');
  if (label === 'UI packages') return ['/quarks/', '/atoms/', '/molecules/', '/organisms/']
    .some((part) => currentUrl.includes(`/api/generated/packages${part}`));
  if (label === 'Universal rendering') return currentUrl.includes('/universal-rendering/') || currentUrl.includes('/api/generated/packages/ssr/');
  if (label === 'Quality') return currentUrl.includes('/guides/quality/');
  return currentUrl.includes('/tooling/') || ['/compiler/', '/vite/', '/devtools', '/language-server/', '/test-utils/', '/create-gluon/'].some((part) => currentUrl.includes(part));
}

async function expandIncludes(markdown, directory) {
  const includes = [...markdown.matchAll(/^<<<\s+(.+)$/gm)];
  for (const include of includes) {
    const requested = include[1].trim();
    const source = resolve(directory, requested);
    if (!source.startsWith(siteRoot + sep)) throw new Error(`documentation include escapes docs-site: ${requested}`);
    const code = await readFile(source, 'utf8');
    const language = ({ '.ts': 'ts', '.vue': 'vue', '.html': 'html', '.sh': 'sh' })[extname(source)] ?? 'text';
    markdown = markdown.replace(include[0], `\`\`\`${language}\n${code.trimEnd()}\n\`\`\``);
  }
  return markdown;
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files.sort();
}

function outputPath(relativePath) {
  const normalized = slash(relativePath);
  if (normalized.endsWith('/README.md')) return resolve(outputRoot, normalized.slice(0, -'README.md'.length), 'index.html');
  if (normalized.endsWith('/index.md')) return resolve(outputRoot, normalized.slice(0, -'index.md'.length), 'index.html');
  return resolve(outputRoot, normalized.replace(/\.md$/, '.html'));
}

function pageUrl(relativePath) {
  const normalized = slash(relativePath);
  if (normalized.endsWith('/README.md')) return `${base}${normalized.slice(0, -'README.md'.length)}`;
  if (normalized.endsWith('/index.md')) return `${base}${normalized.slice(0, -'index.md'.length)}`;
  return `${base}${normalized.replace(/\.md$/, '.html')}`;
}

function rewriteMarkdownLink(href) {
  const [path, hash = ''] = href.split('#');
  if (!path.endsWith('.md')) return href;
  const rewritten = path.endsWith('README.md')
    ? `${path.slice(0, -'README.md'.length)}index.html`
    : path.replace(/\.md$/, '.html');
  return `${rewritten}${hash ? `#${hash}` : ''}`;
}

function firstHeading(markdown) {
  return /^#\s+(.+)$/m.exec(markdown)?.[1].replace(/[`*_]/g, '').trim();
}

function firstParagraph(markdown) {
  return markdown.split(/\n\s*\n/).map((block) => block.trim())
    .find((block) => block && !/^(#|```|<<<|- |\|)/.test(block))
    ?.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/[`*_]/g, '').replace(/\s+/g, ' ').slice(0, 180);
}

function slugify(value) {
  return value.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeBase(value) {
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

function slash(value) { return value.split(sep).join('/'); }
function escapeHtml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

async function writeRedirect(path, target) {
  await writeFile(path, `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="${target}"><title>Gluon documentation</title></head><body><a href="${target}">Open Gluon documentation</a></body></html>`, 'utf8');
}
