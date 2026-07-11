import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import type { Readable, Writable } from 'node:stream';
import { createStarterFiles } from './template.js';

export const CREATE_GLUON_VERSION = '0.0.0';

export interface GluonFeatures {
  readonly router: boolean;
  readonly store: boolean;
  readonly testing: boolean;
  readonly ui: boolean;
  readonly ssr: boolean;
}

export interface ScaffoldOptions extends Partial<GluonFeatures> {
  readonly directory: string;
  readonly name?: string;
  readonly force?: boolean;
  readonly cwd?: string;
}

export interface ScaffoldResult {
  readonly directory: string;
  readonly name: string;
  readonly features: GluonFeatures;
  readonly files: readonly string[];
}

export type ScaffoldErrorCode =
  | 'DIRECTORY_NOT_EMPTY'
  | 'INVALID_COMBINATION'
  | 'INVALID_DIRECTORY'
  | 'INVALID_PROJECT_NAME';

export class ScaffoldError extends Error {
  readonly code: ScaffoldErrorCode;

  constructor(code: ScaffoldErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'ScaffoldError';
    this.code = code;
  }
}

export interface ParsedCliArguments extends Partial<GluonFeatures> {
  readonly directory?: string;
  readonly name?: string;
  readonly force: boolean;
  readonly yes: boolean;
  readonly help: boolean;
  readonly version: boolean;
  readonly explicit: ReadonlySet<keyof GluonFeatures>;
}

export interface CliIo {
  readonly input?: Readable;
  readonly output?: Writable;
  readonly cwd?: string;
  readonly prompt?: CliPrompt;
}

export interface CliPrompt {
  question(query: string): Promise<string>;
  close(): void;
}

const featureNames = ['router', 'store', 'testing', 'ui', 'ssr'] as const;
const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/;

export function normalizeFeatures(options: Partial<GluonFeatures>): GluonFeatures {
  if (options.ssr && options.router === false) {
    throw new ScaffoldError('INVALID_COMBINATION', 'SSR requires Router; remove --no-router.');
  }
  if (options.ssr && options.store === false) {
    throw new ScaffoldError('INVALID_COMBINATION', 'SSR requires Store; remove --no-store.');
  }
  return Object.freeze({
    router: options.router ?? options.ssr ?? false,
    store: options.store ?? options.ssr ?? false,
    testing: options.testing ?? false,
    ui: options.ui ?? false,
    ssr: options.ssr ?? false,
  });
}

export function parseCliArguments(arguments_: readonly string[]): ParsedCliArguments {
  let directory: string | undefined;
  let name: string | undefined;
  let force = false;
  let yes = false;
  let help = false;
  let version = false;
  const features: Partial<Record<keyof GluonFeatures, boolean>> = {};
  const explicit = new Set<keyof GluonFeatures>();

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    if (argument === '--force') force = true;
    else if (argument === '--yes' || argument === '-y') yes = true;
    else if (argument === '--help' || argument === '-h') help = true;
    else if (argument === '--version' || argument === '-v') version = true;
    else if (argument === '--name') {
      name = arguments_[index + 1];
      if (!name || name.startsWith('-')) throw new Error('CLI_ARGUMENT_MISSING: --name requires a value.');
      index += 1;
    } else if (argument.startsWith('--no-') || argument.startsWith('--')) {
      const enabled = !argument.startsWith('--no-');
      const feature = argument.slice(enabled ? 2 : 5) as keyof GluonFeatures;
      if (!featureNames.includes(feature)) throw new Error(`CLI_ARGUMENT_UNKNOWN: ${argument}.`);
      if (explicit.has(feature) && features[feature] !== enabled) {
        throw new ScaffoldError('INVALID_COMBINATION', `Both --${feature} and --no-${feature} were supplied.`);
      }
      features[feature] = enabled;
      explicit.add(feature);
    } else if (argument.startsWith('-')) {
      throw new Error(`CLI_ARGUMENT_UNKNOWN: ${argument}.`);
    } else if (directory) {
      throw new Error(`CLI_ARGUMENT_EXTRA: unexpected positional argument ${argument}.`);
    } else {
      directory = argument;
    }
  }

  normalizeFeatures(features);
  return Object.freeze({ directory, name, force, yes, help, version, explicit, ...features });
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  if (!options.directory.trim() || options.directory.includes('\0')) {
    throw new ScaffoldError('INVALID_DIRECTORY', 'A non-empty filesystem path is required.');
  }
  const directory = resolve(cwd, options.directory);
  const name = options.name ?? basename(directory);
  if (!packageNamePattern.test(name)) {
    throw new ScaffoldError('INVALID_PROJECT_NAME', `${JSON.stringify(name)} is not a valid npm package name.`);
  }
  const features = normalizeFeatures(options);
  await mkdir(directory, { recursive: true });
  const existing = await readdir(directory);
  if (existing.length > 0 && !options.force) {
    throw new ScaffoldError('DIRECTORY_NOT_EMPTY', `${directory} is not empty; use --force to continue.`);
  }
  const files = createStarterFiles(name, features);
  for (const [relativePath, contents] of files) {
    const target = resolve(directory, relativePath);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, contents, { encoding: 'utf8', flag: options.force ? 'w' : 'wx' });
  }
  return Object.freeze({ directory, name, features, files: Object.freeze([...files.keys()].sort()) });
}

export async function runCli(
  arguments_: readonly string[],
  io: CliIo = {},
): Promise<ScaffoldResult | undefined> {
  const parsed = parseCliArguments(arguments_);
  const output = io.output ?? stdout;
  if (parsed.help) {
    output.write(helpText);
    return undefined;
  }
  if (parsed.version) {
    output.write(`${CREATE_GLUON_VERSION}\n`);
    return undefined;
  }

  let prompt = io.prompt;
  let ownsPrompt = false;
  try {
    if (!parsed.yes && !prompt) {
      prompt = createInterface({ input: io.input ?? stdin, output });
      ownsPrompt = true;
    }
    const directory = parsed.directory ?? await requiredAnswer(prompt, 'Project directory: ');
    const selected: Partial<Record<keyof GluonFeatures, boolean>> = {};
    for (const feature of featureNames) {
      selected[feature] = parsed.explicit.has(feature)
        ? parsed[feature]
        : parsed.yes
          ? false
          : await confirm(prompt!, `Include ${featureLabel[feature]}?`, feature === 'router');
    }
    if (selected.ssr) {
      if (!parsed.explicit.has('router')) delete selected.router;
      if (!parsed.explicit.has('store')) delete selected.store;
    }
    const result = await scaffoldProject({
      directory,
      name: parsed.name,
      force: parsed.force,
      cwd: io.cwd,
      ...selected,
    });
    output.write(`Created ${result.name} in ${result.directory}\n`);
    output.write('Next: npm install && npm run dev\n');
    return result;
  } finally {
    if (ownsPrompt) prompt?.close();
  }
}

async function requiredAnswer(prompt: CliPrompt | undefined, question: string): Promise<string> {
  if (!prompt) throw new Error('CLI_ARGUMENT_MISSING: a project directory is required with --yes.');
  const answer = (await prompt.question(question)).trim();
  if (!answer) throw new ScaffoldError('INVALID_DIRECTORY', 'A project directory is required.');
  return answer;
}

async function confirm(prompt: CliPrompt, question: string, defaultValue: boolean): Promise<boolean> {
  const hint = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = (await prompt.question(`${question} ${hint} `)).trim().toLowerCase();
  if (!answer) return defaultValue;
  if (answer === 'y' || answer === 'yes') return true;
  if (answer === 'n' || answer === 'no') return false;
  throw new Error(`CLI_ANSWER_INVALID: expected yes or no for ${question}`);
}

const featureLabel: Record<keyof GluonFeatures, string> = {
  router: 'Router',
  store: 'Store',
  testing: 'browser testing',
  ui: 'Gluon UI atoms',
  ssr: 'SSR and hydration',
};

export const helpText = `Usage: create-gluon [directory] [options]

Options:
  -y, --yes        use non-interactive defaults
  --name <name>    set the npm package name
  --[no-]router    include or exclude Router
  --[no-]store     include or exclude Store
  --[no-]testing   include or exclude browser tests
  --[no-]ui        include or exclude Gluon UI atoms
  --[no-]ssr       include or exclude SSR and hydration
  --force          write into an existing directory
  -h, --help       show this help
  -v, --version    show the create-gluon version

SSR enables Router and Store. Explicit --ssr with --no-router or --no-store is invalid.
`;
