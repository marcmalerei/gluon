import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import {
  componentKinds,
  createComponentTemplate,
  type ComponentKind,
} from './component-template.js';

export type AddComponentErrorCode =
  | 'FILE_COLLISION'
  | 'INVALID_COMPONENT_KIND'
  | 'INVALID_COMPONENT_NAME'
  | 'INVALID_COMPONENT_PATH'
  | 'INVALID_CUSTOM_ELEMENT_NAME'
  | 'INVALID_PROJECT_MANIFEST'
  | 'OVERWRITE_NOT_CONFIRMED'
  | 'PROJECT_NOT_FOUND'
  | 'SYMLINK_ESCAPE';

export class AddComponentError extends Error {
  readonly code: AddComponentErrorCode;

  constructor(code: AddComponentErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'AddComponentError';
    this.code = code;
  }
}

export interface AddComponentOptions {
  readonly kind: ComponentKind;
  readonly name: string;
  readonly root?: string;
  readonly path?: string;
  readonly tagName?: string;
  readonly overwrite?: boolean;
  readonly confirmOverwrite?: boolean;
  readonly dryRun?: boolean;
  readonly cwd?: string;
}

export type AddComponentAction = 'create' | 'update' | 'overwrite';

export interface AddComponentOperation {
  readonly path: string;
  readonly action: AddComponentAction;
  readonly bytes: number;
}

export interface AddComponentResult {
  readonly root: string;
  readonly kind: ComponentKind;
  readonly name: string;
  readonly tagName?: string;
  readonly dryRun: boolean;
  readonly operations: readonly AddComponentOperation[];
}

interface PlannedFile extends AddComponentOperation {
  readonly target: string;
  readonly contents: string;
}

interface ComponentPlan extends AddComponentResult {
  readonly files: readonly PlannedFile[];
}

const componentNamePattern = /^[A-Z][A-Za-z0-9]*$/;
const customElementNamePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;
const reservedCustomElementNames = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph',
]);
const managedStart = '// create-gluon:add-component:exports';
const managedEnd = '// create-gluon:add-component:exports-end';
const externalTestingVersions = Object.freeze({
  '@vitest/browser-playwright': '^4.0.18',
  playwright: '^1.58.2',
  vitest: '^4.0.18',
});

export async function addComponent(options: AddComponentOptions): Promise<AddComponentResult> {
  const plan = await createPlan(options);
  if (!plan.dryRun) await commitPlan(plan.files);
  return publicResult(plan);
}

export async function planComponent(options: AddComponentOptions): Promise<AddComponentResult> {
  return publicResult(await createPlan(options));
}

async function createPlan(options: AddComponentOptions): Promise<ComponentPlan> {
  if (!componentKinds.includes(options.kind)) {
    throw new AddComponentError('INVALID_COMPONENT_KIND', `${JSON.stringify(options.kind)} is not supported.`);
  }
  const name = validateName(options.name);
  const slug = toKebabCase(name);
  const componentPath = validateRelativePath(options.path ?? 'src/components');
  const requestedRoot = options.root ?? '.';
  if (!requestedRoot.trim() || requestedRoot.includes('\0')) {
    throw new AddComponentError('PROJECT_NOT_FOUND', 'A non-empty project root is required.');
  }
  const requestedRootPath = resolve(options.cwd ?? process.cwd(), requestedRoot);
  const requestedRootStat = await lstatIfExists(requestedRootPath);
  if (requestedRootStat?.isSymbolicLink()) {
    throw new AddComponentError('SYMLINK_ESCAPE', `Project root ${requestedRootPath} is a symbolic link.`);
  }
  if (!requestedRootStat?.isDirectory()) {
    throw new AddComponentError('PROJECT_NOT_FOUND', `${requestedRootPath} is not an existing project directory.`);
  }
  const root = await realpath(requestedRootPath);
  const manifestPath = resolve(root, 'package.json');
  await assertSafeTarget(root, manifestPath);
  const manifestStat = await lstatIfExists(manifestPath);
  if (!manifestStat?.isFile()) {
    throw new AddComponentError('PROJECT_NOT_FOUND', `${root} does not contain package.json.`);
  }
  const manifestSource = await readFile(manifestPath, 'utf8');
  const manifest = parseManifest(manifestSource);
  const tagName = options.kind === 'element'
    ? validateTagName(options.tagName ?? `app-${slug}`)
    : undefined;
  if (options.tagName && options.kind !== 'element') {
    throw new AddComponentError('INVALID_CUSTOM_ELEMENT_NAME', '--tag is valid only for the element kind.');
  }

  const template = createComponentTemplate({ kind: options.kind, name, slug, tagName });
  const planned = new Map<string, { contents: string; collisionSensitive: boolean }>();
  for (const [file, contents] of template.files) {
    planned.set(`${componentPath}/${file}`, { contents, collisionSensitive: true });
  }

  const barrelPath = `${componentPath}/index.ts`;
  const barrelTarget = resolve(root, barrelPath);
  await assertSafeTarget(root, barrelTarget);
  const barrelSource = await readOptionalText(barrelTarget);
  planned.set(barrelPath, {
    contents: updateBarrel(barrelSource, template.barrelExport),
    collisionSensitive: false,
  });

  planned.set('package.json', {
    contents: updateManifest(manifest, template.dependencies, template.developmentDependencies),
    collisionSensitive: false,
  });
  const vitestPath = resolve(root, 'vitest.config.ts');
  await assertSafeTarget(root, vitestPath);
  if (!await lstatIfExists(vitestPath)) {
    planned.set('vitest.config.ts', { contents: vitestConfig(), collisionSensitive: false });
  }

  const collisions: string[] = [];
  const files: PlannedFile[] = [];
  for (const [path, entry] of [...planned].sort(([left], [right]) => left.localeCompare(right))) {
    const target = resolve(root, path);
    assertWithinRoot(root, target);
    await assertSafeTarget(root, target);
    const existing = await readOptionalText(target);
    if (entry.collisionSensitive && existing !== undefined) collisions.push(path);
    if (existing === entry.contents) continue;
    const action: AddComponentAction = existing === undefined
      ? 'create'
      : entry.collisionSensitive
        ? 'overwrite'
        : 'update';
    files.push(Object.freeze({
      path,
      action,
      bytes: Buffer.byteLength(entry.contents),
      target,
      contents: entry.contents,
    }));
  }

  if (collisions.length > 0 && !options.overwrite) {
    throw new AddComponentError('FILE_COLLISION', `Refusing to replace ${collisions.sort().join(', ')}; pass --overwrite and confirm it separately.`);
  }
  if (collisions.length > 0 && !options.confirmOverwrite) {
    throw new AddComponentError('OVERWRITE_NOT_CONFIRMED', `Overwrite requires a separate confirmation for ${collisions.sort().join(', ')}.`);
  }

  return Object.freeze({
    root,
    kind: options.kind,
    name,
    tagName,
    dryRun: options.dryRun ?? false,
    operations: Object.freeze(files.map(({ path, action, bytes }) => Object.freeze({ path, action, bytes }))),
    files: Object.freeze(files),
  });
}

function validateName(value: string): string {
  if (value !== value.trim() || !componentNamePattern.test(value)) {
    throw new AddComponentError('INVALID_COMPONENT_NAME', `${JSON.stringify(value)} must be one PascalCase identifier containing only ASCII letters and digits.`);
  }
  return value;
}

function validateRelativePath(value: string): string {
  if (!value.trim() || value !== value.trim() || value.includes('\0') || value.includes('\\') || isAbsolute(value)) {
    throw new AddComponentError('INVALID_COMPONENT_PATH', `${JSON.stringify(value)} must be a relative project path.`);
  }
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new AddComponentError('INVALID_COMPONENT_PATH', `${JSON.stringify(value)} contains an empty or traversal segment.`);
  }
  return segments.join('/');
}

function validateTagName(value: string): string {
  if (
    value.startsWith('xml')
    || reservedCustomElementNames.has(value)
    || !customElementNamePattern.test(value)
  ) {
    throw new AddComponentError('INVALID_CUSTOM_ELEMENT_NAME', `${JSON.stringify(value)} is not a valid autonomous Custom Element name.`);
  }
  return value;
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function parseManifest(source: string): Record<string, unknown> {
  try {
    const value = JSON.parse(source);
    if (!isRecord(value)) throw new Error('root must be an object');
    return value;
  } catch (error) {
    throw new AddComponentError('INVALID_PROJECT_MANIFEST', `package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function updateManifest(
  manifest: Record<string, unknown>,
  componentDependencies: readonly string[],
  componentDevelopmentDependencies: readonly string[],
): string {
  const next = structuredClone(manifest);
  const dependencies = recordValue(next.dependencies);
  const devDependencies = recordValue(next.devDependencies);
  const scripts = recordValue(next.scripts);
  const gluonVersion = stringValue(dependencies['@gluonjs/core'])
    ?? stringValue(devDependencies['@gluonjs/core'])
    ?? '1.0.3';
  for (const dependency of componentDependencies) {
    dependencies[dependency] = stringValue(dependencies[dependency])
      ?? stringValue(devDependencies[dependency])
      ?? gluonVersion;
    delete devDependencies[dependency];
  }
  for (const dependency of componentDevelopmentDependencies) {
    devDependencies[dependency] = stringValue(devDependencies[dependency])
      ?? stringValue(dependencies[dependency])
      ?? gluonVersion;
    delete dependencies[dependency];
  }
  devDependencies['@gluonjs/test-utils'] = stringValue(devDependencies['@gluonjs/test-utils'])
    ?? stringValue(dependencies['@gluonjs/test-utils'])
    ?? gluonVersion;
  delete dependencies['@gluonjs/test-utils'];
  for (const [dependency, version] of Object.entries(externalTestingVersions)) {
    devDependencies[dependency] = stringValue(devDependencies[dependency]) ?? version;
  }
  scripts['test:components'] = 'vitest run src/components';
  if (!stringValue(scripts.test) || scripts.test === 'npm run typecheck') {
    scripts.test = 'npm run test:components';
  }
  next.scripts = sortRecord(scripts);
  next.dependencies = sortRecord(dependencies);
  next.devDependencies = sortRecord(devDependencies);
  return `${JSON.stringify(next, null, 2)}\n`;
}

function updateBarrel(source: string | undefined, exportLine: string): string {
  if (source === undefined || !source.trim()) {
    return `${managedStart}\n${exportLine}\n${managedEnd}\n`;
  }
  const start = source.indexOf(managedStart);
  const end = source.indexOf(managedEnd);
  if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
    throw new AddComponentError('INVALID_PROJECT_MANIFEST', 'The component barrel contains an incomplete create-gluon export region.');
  }
  if (start === -1) {
    return `${source.trimEnd()}\n\n${managedStart}\n${exportLine}\n${managedEnd}\n`;
  }
  const prefix = source.slice(0, start + managedStart.length);
  const suffix = source.slice(end);
  const body = source.slice(start + managedStart.length, end);
  const exports = body.split('\n').map((line) => line.trim()).filter(Boolean);
  exports.push(exportLine);
  const sorted = [...new Set(exports)].sort();
  return `${prefix}\n${sorted.join('\n')}\n${suffix}`.replace(/\n*$/, '\n');
}

function vitestConfig(): string {
  return `import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    include: ['src/**/*.spec.ts'],
  },
});
`;
}

async function assertSafeTarget(root: string, target: string): Promise<void> {
  assertWithinRoot(root, target);
  const relativeTarget = relative(root, target);
  let current = root;
  for (const segment of relativeTarget.split(sep)) {
    current = resolve(current, segment);
    const stat = await lstatIfExists(current);
    if (!stat) break;
    if (stat.isSymbolicLink()) {
      throw new AddComponentError('SYMLINK_ESCAPE', `${relative(root, current)} is a symbolic link.`);
    }
  }
}

function assertWithinRoot(root: string, target: string): void {
  const path = relative(root, target);
  if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) {
    throw new AddComponentError('INVALID_COMPONENT_PATH', `${target} escapes project root ${root}.`);
  }
}

async function commitPlan(files: readonly PlannedFile[]): Promise<void> {
  const temporary: Array<{ target: string; path: string }> = [];
  const originals = new Map<string, string | undefined>();
  const applied: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      await mkdir(dirname(file.target), { recursive: true });
      originals.set(file.target, await readOptionalText(file.target));
      const path = `${file.target}.create-gluon-${process.pid}-${index}`;
      await writeFile(path, file.contents, { encoding: 'utf8', flag: 'wx' });
      temporary.push({ target: file.target, path });
    }
    for (const file of temporary) {
      await rename(file.path, file.target);
      applied.push(file.target);
    }
  } catch (error) {
    for (const target of applied.reverse()) {
      const original = originals.get(target);
      if (original === undefined) await rm(target, { force: true });
      else await writeFile(target, original, 'utf8');
    }
    await Promise.all(temporary.map(({ path }) => rm(path, { force: true })));
    throw error;
  }
}

async function readOptionalText(path: string): Promise<string | undefined> {
  const stat = await lstatIfExists(path);
  if (!stat) return undefined;
  if (!stat.isFile()) {
    throw new AddComponentError('FILE_COLLISION', `${path} exists and is not a regular file.`);
  }
  return readFile(path, 'utf8');
}

async function lstatIfExists(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

function publicResult(plan: ComponentPlan): AddComponentResult {
  return Object.freeze({
    root: plan.root,
    kind: plan.kind,
    name: plan.name,
    ...(plan.tagName ? { tagName: plan.tagName } : {}),
    dryRun: plan.dryRun,
    operations: plan.operations,
  });
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {};
}

function sortRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
