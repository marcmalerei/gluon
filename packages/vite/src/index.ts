import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  transformGluonModule,
  transpileGluonDecorators,
  type GluonDecoratorMode,
} from '@gluonjs/compiler';
import { normalizePath, type Plugin, type ResolvedConfig } from 'vite';

const publicVirtualId = 'virtual:gluon-hmr';
const resolvedVirtualId = `\0${publicVirtualId}`;

export interface GluonVitePluginOptions {
  /** TypeScript decorator semantics. Standard decorators are the default. */
  readonly decorators?: GluonDecoratorMode;
  readonly diagnostics?: boolean;
  readonly include?: RegExp | ((id: string) => boolean);
  readonly universal?: boolean | { readonly manifestFile?: string };
}

export default function gluon(options: GluonVitePluginOptions = {}): Plugin {
  let config: ResolvedConfig;
  const sourceClient = fileURLToPath(new URL('./client.ts', import.meta.url));
  const builtClient = fileURLToPath(new URL('./client.js', import.meta.url));

  return {
    name: 'gluon',
    enforce: 'pre',
    config(_userConfig, environment) {
      return {
        define: {
          __GLUON_DEV__: JSON.stringify(environment.command === 'serve'),
        },
      };
    },
    configResolved(resolved) {
      config = resolved;
    },
    resolveId(id) {
      return id === publicVirtualId ? resolvedVirtualId : null;
    },
    load(id) {
      if (id !== resolvedVirtualId) return null;
      const client = normalizePath(existsSync(sourceClient) ? sourceClient : builtClient);
      return `export { accept, component, element, elementDecorator, functionalElement, store, style } from ${JSON.stringify(client)};`;
    },
    transform(code, id) {
      const cleanId = normalizePath(id.split('?', 1)[0]!);
      if (!shouldTransform(cleanId, config.root, options.include)) return null;
      const result = transformGluonModule(code, cleanId, {
        development: config.command === 'serve',
      });
      if (options.diagnostics !== false) {
        for (const diagnostic of result.diagnostics) {
          this.warn({
            code: diagnostic.code,
            message: diagnostic.message,
            id: cleanId,
            pos: diagnostic.location.offset,
          });
        }
      }
      if (result.decorators) {
        const transpiled = transpileGluonDecorators(result.code, cleanId, options.decorators);
        return { code: transpiled.code, map: transpiled.map ?? result.map };
      }
      if (!result.hmr && result.templates.length === 0) return null;
      return { code: result.code, map: result.map };
    },
    generateBundle(_output, bundle) {
      if (!options.universal || config.build.ssr) return;
      const chunks = Object.values(bundle).filter((entry) => entry.type === 'chunk');
      const entry = chunks.find((chunk) => chunk.isEntry);
      if (!entry) this.error('GLUON_UNIVERSAL_ENTRY_MISSING: production client entry was not emitted.');
      const styles = Object.values(bundle)
        .filter((asset) => asset.type === 'asset' && asset.fileName.endsWith('.css'))
        .map((asset) => `/${asset.fileName}`)
        .sort();
      const assets = Object.values(bundle)
        .filter((asset) => asset.type === 'asset' && !asset.fileName.endsWith('.css'))
        .map((asset) => `/${asset.fileName}`)
        .sort();
      const manifest = {
        version: 1,
        entry: `/${entry.fileName}`,
        imports: entry.imports.map((file) => `/${file}`).sort(),
        styles,
        assets,
      };
      this.emitFile({
        type: 'asset',
        fileName: typeof options.universal === 'object'
          ? options.universal.manifestFile ?? 'gluon-assets.json'
          : 'gluon-assets.json',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

function shouldTransform(
  id: string,
  root: string,
  include: GluonVitePluginOptions['include'],
): boolean {
  if (!/\.[cm]?[jt]sx?$/.test(id) || id.includes('/node_modules/') || id.endsWith('.d.ts')) return false;
  if (include instanceof RegExp) {
    include.lastIndex = 0;
    return include.test(id);
  }
  if (include) return include(id);
  const normalizedRoot = normalizePath(root).replace(/\/$/, '');
  return id === normalizedRoot || id.startsWith(`${normalizedRoot}/`);
}
