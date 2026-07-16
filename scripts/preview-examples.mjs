import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repositoryRoot = resolve(import.meta.dirname, '..');
const viteBin = resolve(repositoryRoot, 'node_modules/vite/bin/vite.js');

export const examplePreviews = Object.freeze({
  shop: Object.freeze({ config: 'examples/shop/vite.config.ts', port: 4173, path: '/' }),
  playground: Object.freeze({ config: 'examples/playground/vite.config.ts', port: 4174, path: '/gluon/playground/' }),
  virtualizer: Object.freeze({ config: 'examples/virtualizer/vite.config.ts', port: 4175, path: '/gluon/examples/virtualizer/' }),
  signals: Object.freeze({ config: 'examples/signals/vite.config.ts', port: 4176, path: '/gluon/examples/signals/' }),
});

export function previewPlan(argumentsList) {
  const options = { host: '127.0.0.1', port: undefined, all: false, list: false, names: [] };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--all') options.all = true;
    else if (argument === '--list') options.list = true;
    else if (argument === '--host') options.host = requiredValue(argumentsList, ++index, '--host');
    else if (argument === '--port') options.port = parsePort(requiredValue(argumentsList, ++index, '--port'));
    else if (argument?.startsWith('-')) throw new TypeError(`Unknown preview option: ${argument}`);
    else if (argument) options.names.push(argument);
  }

  if (options.all && options.names.length > 0) throw new TypeError('Use either --all or explicit example names.');
  const names = options.all ? Object.keys(examplePreviews) : options.names;
  for (const name of names) {
    if (!(name in examplePreviews)) throw new TypeError(`Unknown example: ${name}.`);
  }
  const basePort = options.port;
  return {
    list: options.list || names.length === 0,
    previews: names.map((name, index) => ({
      name,
      ...examplePreviews[name],
      host: options.host,
      port: basePort == null ? examplePreviews[name].port : basePort + index,
    })),
  };
}

function requiredValue(argumentsList, index, option) {
  const value = argumentsList[index];
  if (!value || value.startsWith('-')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new TypeError(`Invalid preview port: ${value}.`);
  return port;
}

function printCatalog() {
  console.log('Production example previews:');
  for (const [name, preview] of Object.entries(examplePreviews)) {
    console.log(`  ${name.padEnd(11)} http://127.0.0.1:${preview.port}${preview.path}`);
  }
  console.log('\nUsage: npm run preview:examples -- <name...> [--host HOST] [--port PORT]');
  console.log('       npm run preview:examples -- --all [--host HOST] [--port BASE_PORT]');
}

async function main() {
  const plan = previewPlan(process.argv.slice(2));
  if (plan.list) printCatalog();
  if (plan.previews.length === 0) return;

  const children = plan.previews.map((preview) => {
    console.log(`previewing ${preview.name} at http://${preview.host}:${preview.port}${preview.path}`);
    return spawn(process.execPath, [
      viteBin,
      'preview',
      '--config',
      resolve(repositoryRoot, preview.config),
      '--host',
      preview.host,
      '--port',
      String(preview.port),
      '--strictPort',
    ], { cwd: repositoryRoot, stdio: 'inherit' });
  });

  let shutdownSignal;
  const shutdown = (signal) => {
    shutdownSignal = signal;
    for (const child of children) {
      if (!child.killed) child.kill(signal);
    }
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  const exits = await Promise.all(children.map((child) => new Promise((resolveExit) => {
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  })));
  if (shutdownSignal) return;
  const failure = exits.find(({ code, signal }) => code !== 0 && signal !== 'SIGINT' && signal !== 'SIGTERM');
  if (failure) process.exitCode = failure.code ?? 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
