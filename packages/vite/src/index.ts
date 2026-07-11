import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformGluonModule } from '@gluonjs/compiler';
import { normalizePath, type Plugin, type ResolvedConfig } from 'vite';

const publicVirtualId = 'virtual:gluon-hmr';
const resolvedVirtualId = `\0${publicVirtualId}`;

export interface GluonVitePluginOptions {
  readonly diagnostics?: boolean;
  readonly include?: RegExp | ((id: string) => boolean);
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
      return `export { accept, component, element, store, style } from ${JSON.stringify(client)};`;
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
      if (!result.hmr && result.templates.length === 0) return null;
      return { code: result.code, map: result.map };
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
