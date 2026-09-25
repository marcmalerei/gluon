import { defineConfig, type DefaultTheme } from 'vitepress';
import contract from '../../package-contract.json';
import versions from '../versions.json';

const base = '/gluon/';
const packages = contract.packages
  .filter((entry) => entry.state === 'current')
  .sort((left, right) => left.name.localeCompare(right.name));
const latest = versions.latest;

function packageSlug(name: string): string {
  return name.startsWith('@gluonjs/') ? name.slice('@gluonjs/'.length) : name;
}

function packageLinks(version: string): DefaultTheme.SidebarItem[] {
  return packages.map((entry) => ({
    text: entry.name,
    link: `/${version}/packages/${packageSlug(entry.name)}/`,
  }));
}

function apiLinks(version: string): DefaultTheme.SidebarItem[] {
  const entries = packages.flatMap((entry) => entry.exports.map((subpath) => {
    const source = entry.directory === '.' ? 'src' : `${entry.directory}/src`;
    const modulePath = subpath === '.' ? source : `${source}/${subpath.slice(2)}`;
    return {
      text: `${entry.name}${subpath === '.' ? '' : subpath.slice(1)}`,
      link: `/${version}/api/generated/${modulePath}/`,
    };
  }));
  return [{
    text: 'Public entry points',
    collapsed: false,
    items: [
      { text: 'All entry points', link: `/${version}/api/generated/` },
      ...entries,
    ],
  }];
}

function documentationSidebar(version: string): DefaultTheme.SidebarItem[] {
  return [
    { text: 'Start here', link: `/${version}/` },
    {
      text: 'Learn and build',
      collapsed: false,
      items: [
        { text: 'Getting started', link: `/${version}/guides/getting-started/` },
        { text: 'Learning path', link: `/${version}/guides/learning-path/` },
        { text: 'Build one stateful component', link: `/${version}/guides/first-component/` },
        { text: 'Application architecture', link: `/${version}/guides/application/` },
        { text: 'Components', link: `/${version}/guides/components/` },
        { text: 'Presentational SFCs', link: `/${version}/guides/sfc-authoring/` },
        { text: 'Choose a component level', link: `/${version}/guides/component-decisions/` },
        { text: 'Universal rendering', link: `/${version}/guides/universal-rendering/` },
        { text: 'Async data and SSR', link: `/${version}/guides/async-ssr/` },
        { text: 'Tooling', link: `/${version}/guides/tooling/` },
        { text: 'Quality and security', link: `/${version}/guides/quality/` },
        { text: 'Deployment', link: `/${version}/guides/deployment/` },
      ],
    },
    { text: 'Packages', link: `/${version}/packages/`, items: packageLinks(version) },
    { text: 'Recipes', link: `/${version}/cookbook/` },
    { text: 'API reference', link: `/${version}/api/`, items: apiLinks(version) },
    {
      text: 'Migration',
      link: `/${version}/migration/`,
      items: [
        { text: 'Upgrade between releases', link: `/${version}/migration/upgrade/` },
        { text: 'Vue migration analyzer', link: `/${version}/migration/vue-analyzer/` },
        { text: 'Vue cutover playbook', link: `/${version}/migration/vue-to-gluon-cutover/` },
        { text: 'Lit and Web Components', link: `/${version}/migration/lit-to-gluon/` },
      ],
    },
  ];
}

const sidebar = Object.fromEntries(versions.supported.flatMap((version) => [
  [`/${version}/`, documentationSidebar(version)],
  [`/latest/`, documentationSidebar('latest')],
])) satisfies DefaultTheme.Config['sidebar'];

export default defineConfig({
  lang: 'en-US',
  title: 'Gluon',
  description: 'Build interfaces on native web primitives with Gluon.',
  base,
  srcDir: 'content',
  outDir: 'dist',
  cleanUrls: false,
  appearance: false,
  buildConcurrency: 8,
  lastUpdated: false,
  ignoreDeadLinks: [
    /^\/latest(?:\/|$)/,
    /^\/1\.13\.0\/examples(?:\/|$)/,
    /^\/1\.12\.3\/examples(?:\/|$)/,
    /^\/playground(?:\/|$)/,
  ],
  transformPageData(pageData) {
    const isIndex = pageData.relativePath.endsWith('/index.md') || pageData.relativePath === 'index.md';
    const path = isIndex
      ? pageData.relativePath.replace(/index\.md$/, '')
      : pageData.relativePath.replace(/\.md$/, '.html');
    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push([
      'link',
      { rel: 'canonical', href: `https://marcmalerei.github.io/gluon/${path}` },
    ]);
  },
  markdown: {
    lineNumbers: true,
    config(markdown) {
      const defaultLinkOpen = markdown.renderer.rules.link_open
        ?? ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));
      markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
        const href = tokens[index].attrGet('href');
        if (href) tokens[index].attrSet('href', documentationHref(href));
        return defaultLinkOpen(tokens, index, options, environment, renderer);
      };
      const defaultImage = markdown.renderer.rules.image
        ?? ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));
      markdown.renderer.rules.image = (tokens, index, options, environment, renderer) => {
        const src = tokens[index].attrGet('src');
        if (src) tokens[index].attrSet('src', documentationHref(src));
        return defaultImage(tokens, index, options, environment, renderer);
      };
    },
  },
  themeConfig: {
    siteTitle: 'GLUON / DOCS',
    nav: [
      { text: 'Guides', link: `/${latest}/guides/` },
      { text: 'Packages', link: `/${latest}/packages/` },
      { text: 'Recipes', link: `/${latest}/cookbook/` },
      { text: 'API', link: `/${latest}/api/` },
      { text: 'Migration', link: `/${latest}/migration/` },
      {
        text: `Gluon ${latest}`,
        items: versions.supported.map((version) => ({ text: version, link: `/${version}/` })),
      },
      { text: 'Playground', link: 'https://marcmalerei.github.io/gluon/playground/' },
    ],
    sidebar,
    search: { provider: 'local' },
    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous page', next: 'Next page' },
    editLink: {
      pattern: 'https://github.com/marcmalerei/gluon/edit/main/docs-site/content/:path',
      text: 'Edit this page on GitHub',
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/marcmalerei/gluon' }],
    footer: {
      message: 'Version-matched documentation. Examples are checked against the public package contracts.',
      copyright: 'Copyright © 2026 Marc Malerei',
    },
  },
});

function documentationHref(href: string): string {
  if (href.startsWith('/gluon/playground/')) return 'https://marcmalerei.github.io/gluon/playground/';
  if (href.startsWith('/gluon/')) return href.slice('/gluon'.length);
  const repositoryPath = href.replace(/^(?:\.\.\/)+|^\.\//, '');
  if (/^(?:docs|docs-site|examples)\//.test(repositoryPath)) {
    const view = /\.[a-z0-9]+$/i.test(repositoryPath) ? 'blob' : 'tree';
    return `https://github.com/marcmalerei/gluon/${view}/main/${repositoryPath}`;
  }
  if (repositoryPath === 'LICENSE' || repositoryPath === 'CONTRIBUTING.md') {
    return `https://github.com/marcmalerei/gluon/blob/main/${repositoryPath}`;
  }
  return href;
}
