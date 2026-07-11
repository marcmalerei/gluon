import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import type { AssetManifest, SsrRequestResult } from './index.js';

export interface StaticGenerationOptions {
  readonly routes: readonly string[];
  readonly dynamicRoutes?: readonly string[];
  readonly outputDirectory: string;
  readonly assets: AssetManifest;
  readonly render: (url: string) => Promise<SsrRequestResult>;
  readonly document?: (result: SsrRequestResult, url: string) => string;
  readonly clean?: boolean;
}

export interface StaticGenerationResult {
  readonly pages: readonly { readonly url: string; readonly file: string }[];
  readonly dynamicRoutes: readonly string[];
  readonly manifestFile: string;
}

/** Prerenders explicit public routes and records dynamic deployment fallthroughs. */
export async function generateStaticSite(options: StaticGenerationOptions): Promise<StaticGenerationResult> {
  const output = resolve(options.outputDirectory);
  if (options.clean !== false) await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const pages: Array<{ url: string; file: string }> = [];
  for (const url of options.routes) {
    const file = routeFile(output, url);
    const result = await options.render(url);
    const html = options.document?.(result, url) ?? defaultDocument(result, options.assets);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, 'utf8');
    pages.push(Object.freeze({ url, file }));
  }
  const manifestFile = join(output, 'gluon-static.json');
  const dynamicRoutes = Object.freeze([...options.dynamicRoutes ?? []]);
  await writeFile(manifestFile, `${JSON.stringify({
    version: 1,
    pages: pages.map(({ url, file }) => ({ url, file: file.slice(output.length + 1).split(sep).join('/') })),
    dynamicRoutes,
    assets: options.assets,
  }, null, 2)}\n`, 'utf8');
  return Object.freeze({ pages: Object.freeze(pages), dynamicRoutes, manifestFile });
}

function routeFile(output: string, url: string): string {
  const parsed = new URL(url, 'https://gluon.invalid');
  const pathname = decodeURIComponent(parsed.pathname);
  if (!pathname.startsWith('/') || pathname.split('/').includes('..')) throw new TypeError(`Unsafe static route "${url}".`);
  return pathname === '/' ? join(output, 'index.html') : join(output, pathname.slice(1), 'index.html');
}

function defaultDocument(result: SsrRequestResult, assets: AssetManifest): string {
  void assets;
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8">'
    + `${result.head}</head><body><div id="app">${result.html}</div>${result.stateScript}</body></html>`;
}
