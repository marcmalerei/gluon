import type { AssetManifest, SsrRequestResult } from './index.js';

export interface EleventyData { readonly page?: { readonly inputPath?: string; readonly url?: string }; readonly [key: string]: unknown }

export interface GluonEleventyRoute {
  readonly url: string;
  readonly dynamic?: boolean;
}

export interface GluonEleventyRenderContext<Data = EleventyData> {
  readonly url: string;
  readonly data: Data;
  readonly assets: AssetManifest;
  readonly nonce?: string;
  readonly signal: AbortSignal;
}

export interface GluonEleventyRequest {
  readonly render: () => Promise<SsrRequestResult> | SsrRequestResult;
  readonly dispose?: () => Promise<void> | void;
}

export interface GluonEleventyDocumentContext<Data = EleventyData>
  extends GluonEleventyRenderContext<Data> {
  readonly result: SsrRequestResult;
  readonly csp?: string;
  readonly hydrationEntry?: string;
}

export interface GluonEleventyAdapterOptions<Data = EleventyData> {
  readonly assets: AssetManifest | ((data: Data) => Promise<AssetManifest> | AssetManifest);
  readonly route?: (inputContent: string, inputPath: string, data: Data) => Promise<GluonEleventyRoute> | GluonEleventyRoute;
  readonly createRequest: (context: GluonEleventyRenderContext<Data>) => Promise<GluonEleventyRequest> | GluonEleventyRequest;
  readonly nonce?: string | ((data: Data) => Promise<string | undefined> | string | undefined);
  readonly csp?: string | ((data: Data) => Promise<string | undefined> | string | undefined);
  readonly hydrationEntry?: string | ((data: Data) => Promise<string | undefined> | string | undefined);
  readonly signal?: AbortSignal | ((data: Data) => Promise<AbortSignal | undefined> | AbortSignal | undefined);
  readonly document?: (context: GluonEleventyDocumentContext<Data>) => Promise<string> | string;
  readonly dynamicFallbacks?: readonly string[];
  readonly inputExtension?: string;
}

export interface EleventyExtension {
  readonly outputFileExtension: 'html';
  readonly compile: (inputContent: string, inputPath: string) => Promise<(data: EleventyData) => Promise<string>>;
}

export interface EleventyConfiguration {
  addTemplateFormats(extension: string): void;
  addExtension(extension: string, definition: EleventyExtension): void;
  addGlobalData?(name: string, value: unknown): void;
}

/** Registers a request-isolated Gluon SSR renderer as an Eleventy custom template format. */
export function gluonEleventyPlugin<Data = EleventyData>(
  eleventyConfig: EleventyConfiguration,
  options: GluonEleventyAdapterOptions<Data>,
): void {
  const extension = normalizeExtension(options.inputExtension ?? 'gluon');
  validateFallbacks(options.dynamicFallbacks ?? []);
  eleventyConfig.addTemplateFormats(extension);
  eleventyConfig.addGlobalData?.('gluonDynamicFallbacks', Object.freeze([...(options.dynamicFallbacks ?? [])]));
  eleventyConfig.addExtension(extension, {
    outputFileExtension: 'html',
    async compile(inputContent, inputPath) {
      return async (untypedData) => renderEleventyPage(options, inputContent, inputPath, untypedData as Data);
    },
  });
}

/** Renders one Eleventy page without requiring the Eleventy runtime, for tests and programmatic builds. */
export async function renderEleventyPage<Data = EleventyData>(
  options: GluonEleventyAdapterOptions<Data>,
  inputContent: string,
  inputPath: string,
  data: Data,
): Promise<string> {
  const route = options.route
    ? await options.route(inputContent, inputPath, data)
    : defaultRoute(inputContent, inputPath);
  validateRoute(route.url);
  if (route.dynamic) throw new TypeError(`Dynamic Eleventy route "${route.url}" must use the configured deployment fallback.`);
  const assets = await resolveOption(options.assets, data);
  validateAssets(assets);
  const nonce = options.nonce === undefined ? undefined : await resolveOption(options.nonce, data);
  const csp = options.csp === undefined ? undefined : await resolveOption(options.csp, data);
  const hydrationEntry = options.hydrationEntry === undefined ? undefined : await resolveOption(options.hydrationEntry, data);
  if (hydrationEntry !== undefined) validatePublicUrl(hydrationEntry, 'hydration entry');
  const controller = new AbortController();
  const externalSignal = options.signal === undefined ? undefined : await resolveOption(options.signal, data);
  const abort = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener('abort', abort, { once: true });
  let request: GluonEleventyRequest | undefined;
  try {
    controller.signal.throwIfAborted();
    request = await options.createRequest({ url: route.url, data, assets, nonce, signal: controller.signal });
    const result = await request.render();
    return options.document
      ? await options.document({ url: route.url, data, assets, nonce, signal: controller.signal, result, csp, hydrationEntry })
      : defaultDocument(result, csp, hydrationEntry);
  } catch (error) {
    controller.abort(error);
    throw error;
  } finally {
    externalSignal?.removeEventListener('abort', abort);
    await request?.dispose?.();
  }
}

function defaultRoute(inputContent: string, inputPath: string): GluonEleventyRoute {
  const value = inputContent.trim();
  if (!value.startsWith('/')) throw new TypeError(`Eleventy template ${inputPath} must contain one absolute public route.`);
  return Object.freeze({ url: value });
}

function defaultDocument(result: SsrRequestResult, csp: string | undefined, hydrationEntry: string | undefined): string {
  const policy = csp === undefined ? '' : `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(csp)}">`;
  const hydration = hydrationEntry === undefined ? '' : `<script type="module" src="${escapeAttribute(hydrationEntry)}"></script>`;
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8">'
    + `${policy}${result.head}</head><body><div id="app">${result.html}</div>${result.stateScript}${hydration}</body></html>`;
}

async function resolveOption<Data, Value>(option: Value | ((data: Data) => Promise<Value> | Value), data: Data): Promise<Value> {
  return typeof option === 'function' ? (option as (data: Data) => Promise<Value> | Value)(data) : option;
}

function normalizeExtension(extension: string): string {
  const normalized = extension.replace(/^\./, '');
  if (!/^[a-z][a-z0-9-]*$/.test(normalized)) throw new TypeError(`Invalid Eleventy input extension "${extension}".`);
  return normalized;
}

function validateRoute(url: string): void {
  if (!url.startsWith('/') || url.startsWith('//')) throw new TypeError(`Eleventy route "${url}" must be an absolute public path.`);
  const parsed = new URL(url, 'https://gluon.invalid');
  if (parsed.origin !== 'https://gluon.invalid' || decodeURIComponent(parsed.pathname).split('/').includes('..')) {
    throw new TypeError(`Unsafe Eleventy route "${url}".`);
  }
}

function validateFallbacks(routes: readonly string[]): void {
  for (const route of routes) validateRoute(route.replace(/:[^/]+|\*/g, 'fallback'));
}

function validateAssets(assets: AssetManifest): void {
  validatePublicUrl(assets.entry, 'asset entry');
  for (const value of [...assets.imports ?? [], ...assets.styles ?? [], ...assets.assets ?? []]) validatePublicUrl(value, 'asset URL');
}

function validatePublicUrl(value: string, label: string): void {
  if (!value.startsWith('/') || value.startsWith('//')) throw new TypeError(`Eleventy ${label} must be a root-relative public URL.`);
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
