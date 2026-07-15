import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { basename, extname, relative, resolve, sep } from 'node:path';
import { Worker } from 'node:worker_threads';
import { VUE_MIGRATION_REPORT_SCHEMA_VERSION } from './schema.js';
import {
  ANALYZER_LIMITS,
  VueMigrationAnalyzerError,
  type AnalyzedFile,
  type AnalyzerOptions,
  type ComponentInventory,
  type Confidence,
  type FileKind,
  type InventoryCategory,
  type InventoryItem,
  type MigrationFinding,
  type MigrationStage,
  type RawFinding,
  type RawInventory,
  type Severity,
  type SourceLocation,
  type VueMigrationReport,
  type WorkerResult,
} from './types.js';

export { ANALYZER_LIMITS, VueMigrationAnalyzerError } from './types.js';
export type * from './types.js';
export { VUE_MIGRATION_REPORT_SCHEMA_VERSION } from './schema.js';

const ANALYZER_VERSION = '1.0.8';
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', '.nuxt', '.output']);
const fileKinds: readonly FileKind[] = ['manifest', 'lockfile', 'sfc', 'source', 'test', 'server', 'build-config', 'symlink', 'other'];
const categories: readonly InventoryCategory[] = ['component', 'prop-event-model', 'slot-directive-ref', 'reactivity-lifecycle', 'router', 'store', 'async', 'style', 'ssr-hydration', 'test', 'build', 'remaining-vue'];
const severities: readonly Severity[] = ['info', 'warning', 'error'];
const confidences: readonly Confidence[] = ['exact', 'structural', 'indeterminate'];
const stages: readonly MigrationStage[] = ['baseline', 'leaf-boundary', 'state-form', 'route-state-async', 'styles-universal', 'shell-removal'];
const emptyDigest = digest(Buffer.alloc(0));

interface Candidate { readonly absolute: string; readonly path: string; readonly kind: FileKind; readonly symlink: boolean }
interface LoadedCandidate extends Candidate { readonly source: string; readonly bytes: Buffer; readonly file: AnalyzedFile }
interface PendingInventory extends RawInventory { readonly path: string; readonly fileId: string; readonly componentId: string | null; readonly source: string }
interface PendingFinding extends RawFinding { readonly path: string; readonly fileId: string | null; readonly source: string | null }

/** Statically analyzes the bounded Vue project surface from RFC 0003. */
export async function analyzeVueMigration(options: AnalyzerOptions): Promise<VueMigrationReport> {
  const invocationStarted = Date.now();
  const root = await resolveRoot(options.root);
  const discovery = await discover(root, invocationStarted);
  const files: AnalyzedFile[] = [];
  const loaded = new Map<string, LoadedCandidate>();
  const pendingInventory: PendingInventory[] = [];
  const pendingFindings: PendingFinding[] = [...discovery.findings];
  const componentDrafts: Array<{ path: string; fileId: string; scriptMode: NonNullable<WorkerResult['scriptMode']>; blocks: WorkerResult['blocks']; source: string }> = [];
  let bytesRead = 0;
  let resourceExceeded = discovery.resourceExceeded;

  for (const candidate of discovery.candidates) {
    if (Date.now() - invocationStarted > ANALYZER_LIMITS.millisecondsPerInvocation) {
      resourceExceeded = true;
      pendingFindings.push(projectFinding('GVA9002', 'error', 'indeterminate', 'Analyzer invocation deadline was exceeded.', 'baseline'));
      break;
    }
    if (candidate.symlink) {
      files.push({ id: fileId(candidate.path), path: candidate.path, kind: 'symlink', bytes: 0, digest: emptyDigest, parseStatus: 'skipped' });
      continue;
    }
    let before;
    try { before = await stat(candidate.absolute); }
    catch {
      pendingFindings.push(projectFinding('GVA9004', 'error', 'indeterminate', `File ${candidate.path} became unreadable during analysis.`, 'baseline'));
      continue;
    }
    if (before.size > ANALYZER_LIMITS.bytesPerFile || bytesRead + before.size > ANALYZER_LIMITS.aggregateBytes) {
      resourceExceeded = true;
      files.push({ id: fileId(candidate.path), path: candidate.path, kind: candidate.kind, bytes: before.size, digest: emptyDigest, parseStatus: 'limited' });
      pendingFindings.push(projectFinding('GVA9002', 'error', 'indeterminate', `Resource budget exceeded while reading ${candidate.path}.`, 'baseline'));
      break;
    }
    const bytes = await readFile(candidate.absolute);
    const after = await stat(candidate.absolute);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ino !== after.ino) {
      pendingFindings.push(projectFinding('GVA9004', 'error', 'indeterminate', `File ${candidate.path} changed identity during analysis.`, 'baseline'));
      continue;
    }
    bytesRead += bytes.byteLength;
    let source: string;
    try { source = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch {
      const file: AnalyzedFile = { id: fileId(candidate.path), path: candidate.path, kind: candidate.kind, bytes: bytes.byteLength, digest: digest(bytes), parseStatus: 'malformed' };
      files.push(file);
      pendingFindings.push({ ...projectFinding('GVA1103', 'error', 'indeterminate', `File ${candidate.path} is not valid UTF-8.`, 'baseline'), path: candidate.path, fileId: file.id, source: null });
      continue;
    }
    const file: AnalyzedFile = { id: fileId(candidate.path), path: candidate.path, kind: candidate.kind, bytes: bytes.byteLength, digest: digest(bytes), parseStatus: 'parsed' };
    files.push(file);
    loaded.set(candidate.path, { ...candidate, source, bytes, file });
  }

  const project = inspectProjectMetadata(loaded.get('package.json'), loaded.get('package-lock.json'), loaded, pendingInventory, pendingFindings);
  const worker = new ParserWorker();
  try {
    for (const candidate of [...loaded.values()].filter((entry) => ['sfc', 'source', 'test', 'server', 'build-config'].includes(entry.kind)).sort(comparePath)) {
      if (resourceExceeded) break;
      if (Date.now() - invocationStarted > ANALYZER_LIMITS.millisecondsPerInvocation) {
        resourceExceeded = true;
        pendingFindings.push(projectFinding('GVA9002', 'error', 'indeterminate', 'Parser invocation deadline was exceeded.', 'baseline'));
        break;
      }
      let result: WorkerResult;
      try { result = await worker.analyze(candidate.path, candidate.kind, candidate.source); }
      catch (error) {
        if (error instanceof VueMigrationAnalyzerError && error.exitCode === 3) {
          resourceExceeded = true;
          pendingFindings.push(projectFinding('GVA9002', 'error', 'indeterminate', `Parser resource budget exceeded for ${candidate.path}.`, 'baseline'));
          break;
        }
        pendingFindings.push({ ...projectFinding('GVA9001', 'error', 'indeterminate', `Parser failed for ${candidate.path}.`, 'baseline'), path: candidate.path, fileId: candidate.file.id, source: candidate.source });
        continue;
      }
      if (result.nodeCount > ANALYZER_LIMITS.astNodesPerFile || result.maxDepth > ANALYZER_LIMITS.nesting) {
        resourceExceeded = true;
        pendingFindings.push({ ...projectFinding('GVA9002', 'error', 'indeterminate', `AST resource budget exceeded for ${candidate.path}.`, 'baseline'), path: candidate.path, fileId: candidate.file.id, source: candidate.source });
        break;
      }
      const componentId = candidate.kind === 'sfc' ? `component:${candidate.path}` : null;
      for (const item of result.inventory) pendingInventory.push({ ...item, path: candidate.path, fileId: candidate.file.id, componentId, source: candidate.source });
      for (const finding of result.findings) pendingFindings.push({ ...finding, path: candidate.path, fileId: candidate.file.id, source: candidate.source });
      if (componentId && result.scriptMode) componentDrafts.push({ path: candidate.path, fileId: candidate.file.id, scriptMode: result.scriptMode, blocks: result.blocks, source: candidate.source });
    }
  } finally { await worker.close(); }

  const inventory = finalizeInventory(pendingInventory);
  const findings = finalizeFindings(pendingFindings);
  const components = finalizeComponents(componentDrafts, inventory, findings);
  const adjustedFiles = files.map((file) => {
    if (file.parseStatus !== 'parsed') return file;
    const related = findings.filter((finding) => finding.location?.fileId === file.id);
    return related.some((finding) => finding.severity === 'error') ? { ...file, parseStatus: 'unsupported' as const } : file;
  }).sort(comparePath);
  const report = {
    schemaVersion: VUE_MIGRATION_REPORT_SCHEMA_VERSION,
    analyzer: { name: '@gluonjs/vue-migration-analyzer', version: ANALYZER_VERSION },
    root: '.',
    input: {
      vue: project.vue,
      packageManager: project.packageManager,
      limits: ANALYZER_LIMITS,
      entriesVisited: discovery.entriesVisited,
      filesVisited: adjustedFiles.length,
      filesAnalyzed: adjustedFiles.filter((file) => file.parseStatus !== 'skipped').length,
      bytesRead,
    },
    files: adjustedFiles,
    components,
    inventory,
    findings,
    summary: createSummary(adjustedFiles, components, inventory, findings),
  } satisfies VueMigrationReport;
  if (resourceExceeded && !report.findings.some((finding) => finding.code === 'GVA9002')) throw new VueMigrationAnalyzerError('Analyzer resource budget exceeded.', 3);
  return deepFreeze(report);
}

/** Produces deterministic review text or canonical schema-ordered JSON. */
export function formatVueMigrationReport(report: VueMigrationReport, format: 'human' | 'json'): string {
  if (format === 'json') return `${JSON.stringify(report, null, 2)}\n`;
  const lines = [
    `Gluon Vue migration analysis ${report.analyzer.version}`,
    `Support: ${report.summary.supportState}`,
    `Files: ${report.summary.files}; components: ${report.summary.components}; findings: ${report.findings.length}`,
    '',
  ];
  for (const finding of report.findings) {
    const location = finding.location
      ? `${report.files.find((file) => file.id === finding.location?.fileId)?.path ?? '.'}:${finding.location.start.line}:${finding.location.start.column}`
      : '.';
    lines.push(`${location} ${finding.code} ${finding.severity} ${finding.confidence} ${finding.message}`);
    lines.push(`  Stage: ${finding.migrationStage} — ${finding.guideUrl}`);
  }
  if (report.findings.length === 0) lines.push('No findings.');
  return `${lines.join('\n')}\n`;
}

async function resolveRoot(input: string): Promise<string> {
  try {
    const path = await realpath(resolve(input));
    if (!(await stat(path)).isDirectory()) throw new Error();
    return path;
  } catch { throw new VueMigrationAnalyzerError('Analysis root must be one readable directory.', 2); }
}

async function discover(root: string, invocationStarted: number): Promise<{ candidates: Candidate[]; findings: PendingFinding[]; entriesVisited: number; resourceExceeded: boolean }> {
  const candidates: Candidate[] = [];
  const findings: PendingFinding[] = [];
  let entriesVisited = 0;
  let resourceExceeded = false;
  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (Date.now() - invocationStarted > ANALYZER_LIMITS.millisecondsPerInvocation) { resourceExceeded = true; return; }
      entriesVisited += 1;
      if (entriesVisited > ANALYZER_LIMITS.directoryEntries) { resourceExceeded = true; return; }
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const absolute = resolve(directory, entry.name);
      const path = slash(relative(root, absolute));
      if (path.length > 1024 || path.includes('\0')) {
        findings.push(projectFinding('GVA9003', 'error', 'indeterminate', 'A path violates the analyzer path contract.', 'baseline'));
        continue;
      }
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) {
        let outside = false;
        try { outside = !inside(root, await realpath(absolute)); } catch { outside = true; }
        candidates.push({ absolute, path, kind: 'symlink', symlink: true });
        if (outside) findings.push(projectFinding('GVA9003', 'error', 'indeterminate', `Symbolic link ${path} escapes or cannot resolve inside the analysis root.`, 'baseline'));
      } else if (metadata.isDirectory()) await walk(absolute);
      else if (metadata.isFile()) {
        const kind = classify(path);
        if (kind) candidates.push({ absolute, path, kind, symlink: false });
      }
      if (candidates.length > ANALYZER_LIMITS.analyzedFiles) { resourceExceeded = true; return; }
    }
  };
  await walk(root);
  if (resourceExceeded) findings.push(projectFinding('GVA9002', 'error', 'indeterminate', 'Project discovery resource budget was exceeded.', 'baseline'));
  return { candidates: candidates.slice(0, ANALYZER_LIMITS.analyzedFiles).sort(comparePath), findings, entriesVisited, resourceExceeded };
}

function classify(path: string): FileKind | null {
  const name = basename(path);
  if (path === 'package.json') return 'manifest';
  if (['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(path)) return 'lockfile';
  if (name.endsWith('.vue')) return 'sfc';
  if (/^vite\.config\.[cm]?[jt]s$/.test(name)) return 'build-config';
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name)) return 'test';
  if (/server|ssr/i.test(name) && /\.[cm]?[jt]sx?$/.test(name)) return 'server';
  if (/\.[cm]?[jt]sx?$/.test(name)) return 'source';
  return null;
}

function inspectProjectMetadata(manifest: LoadedCandidate | undefined, lock: LoadedCandidate | undefined, loaded: Map<string, LoadedCandidate>, inventory: PendingInventory[], findings: PendingFinding[]) {
  let declaredRange: string | null = null;
  let resolvedVersion: string | null = null;
  let versionSource: VueMigrationReport['input']['vue']['versionSource'] = 'unresolved';
  let manifestJson: any;
  if (!manifest) findings.push(projectFinding('GVA1002', 'error', 'indeterminate', 'package.json is missing, so the Vue version cannot be established.', 'baseline'));
  else {
    try {
      manifestJson = JSON.parse(manifest.source);
      declaredRange = manifestJson.dependencies?.vue ?? manifestJson.devDependencies?.vue ?? manifestJson.peerDependencies?.vue ?? null;
      if (typeof declaredRange === 'string' && /^\d+\.\d+\.\d+$/.test(declaredRange)) { resolvedVersion = declaredRange; versionSource = 'exact-manifest'; }
      inventory.push({ category: 'remaining-vue', kind: 'vue-dependency', name: 'vue', importSource: null, confidence: 'exact', stage: 'shell-removal', location: { start: 0, end: manifest.source.length }, path: manifest.path, fileId: manifest.file.id, componentId: null, source: manifest.source });
    } catch { findings.push({ ...projectFinding('GVA1103', 'error', 'indeterminate', 'package.json is malformed.', 'baseline'), path: manifest.path, fileId: manifest.file.id, source: manifest.source }); }
  }
  if (!resolvedVersion && lock) {
    try {
      const parsed = JSON.parse(lock.source);
      const value = parsed.packages?.['node_modules/vue']?.version;
      if (typeof value === 'string') { resolvedVersion = value; versionSource = parsed.lockfileVersion === 2 ? 'package-lock-v2' : 'package-lock-v3'; }
    } catch { findings.push({ ...projectFinding('GVA1103', 'error', 'indeterminate', 'package-lock.json is malformed.', 'baseline'), path: lock.path, fileId: lock.file.id, source: lock.source }); }
  }
  if (!resolvedVersion) findings.push(projectFinding('GVA1002', 'error', 'indeterminate', 'Exact Vue version cannot be established.', 'baseline'));
  else if (!/^3\.5\.\d+$/.test(resolvedVersion)) findings.push(projectFinding('GVA1001', 'error', 'exact', `Vue version ${resolvedVersion} is unsupported; expected >=3.5.0 <3.6.0.`, 'baseline'));
  const packageManager = loaded.has('package-lock.json') ? { kind: 'npm' as const, lockfile: 'package-lock.json' }
    : loaded.has('yarn.lock') ? { kind: 'yarn' as const, lockfile: 'yarn.lock' }
      : loaded.has('pnpm-lock.yaml') ? { kind: 'pnpm' as const, lockfile: 'pnpm-lock.yaml' }
        : { kind: 'none' as const, lockfile: null };
  if (packageManager.kind === 'yarn' || packageManager.kind === 'pnpm') findings.push(projectFinding('GVA1003', 'warning', 'indeterminate', `${packageManager.kind} lock data is not a supported exact version source.`, 'baseline'));
  return { vue: { declaredRange, resolvedVersion, versionSource }, packageManager };
}

function finalizeInventory(items: PendingInventory[]): InventoryItem[] {
  const sorted = [...items].sort((a, b) => compareRaw(a, b, a.kind, b.kind));
  const counts = new Map<string, number>();
  return sorted.map((item) => {
    const base = `${item.kind}:${item.path}:${item.location.start}:${item.location.end}`;
    const ordinal = (counts.get(base) ?? 0) + 1;
    counts.set(base, ordinal);
    return {
      id: `inventory:${base}:${ordinal}`,
      fileId: item.fileId,
      componentId: item.componentId,
      category: item.category,
      kind: item.kind,
      name: item.name,
      importSource: item.importSource,
      confidence: item.confidence,
      location: location(item.fileId, item.source, item.location.start, item.location.end),
      migrationStage: item.stage,
      guideUrl: guide(item.stage),
    };
  });
}

function finalizeFindings(items: PendingFinding[]): MigrationFinding[] {
  const sorted = [...items].sort((a, b) => compareRaw(a, b, a.code, b.code));
  const counts = new Map<string, number>();
  return sorted.map((item) => {
    const path = item.path || '.';
    const start = item.location?.start ?? 0;
    const end = item.location?.end ?? 0;
    const base = `${item.code}:${path}:${start}:${end}`;
    const ordinal = (counts.get(base) ?? 0) + 1;
    counts.set(base, ordinal);
    return {
      id: `finding:${base}:${ordinal}`,
      code: item.code,
      severity: item.severity,
      confidence: item.confidence,
      message: item.message,
      location: item.fileId && item.source !== null && item.location ? location(item.fileId, item.source, start, end) : null,
      migrationStage: item.stage,
      relatedStages: [...(item.relatedStages ?? [])].sort((a, b) => stages.indexOf(a) - stages.indexOf(b)),
      guideUrl: guide(item.stage),
    };
  });
}

function finalizeComponents(drafts: Array<{ path: string; fileId: string; scriptMode: NonNullable<WorkerResult['scriptMode']>; blocks: WorkerResult['blocks']; source: string }>, inventory: InventoryItem[], findings: MigrationFinding[]): ComponentInventory[] {
  return drafts.sort(comparePath).map((draft) => {
    const id = `component:${draft.path}`;
    const ownInventory = inventory.filter((item) => item.componentId === id);
    const ownFindings = findings.filter((item) => item.location?.fileId === draft.fileId);
    const ownStages = new Set<MigrationStage>([...ownInventory.map((item) => item.migrationStage), ...ownFindings.map((item) => item.migrationStage)]);
    return {
      id,
      fileId: draft.fileId,
      scriptMode: draft.scriptMode,
      blocks: draft.blocks.map((block) => ({ ...block, location: location(draft.fileId, draft.source, block.location.start, block.location.end) })),
      inventoryIds: ownInventory.map((item) => item.id),
      findingIds: ownFindings.map((item) => item.id),
      migrationStages: stages.filter((stage) => ownStages.has(stage)),
    };
  });
}

function createSummary(files: readonly AnalyzedFile[], components: readonly ComponentInventory[], inventory: readonly InventoryItem[], findings: readonly MigrationFinding[]): VueMigrationReport['summary'] {
  const fileKindCounts = Object.fromEntries(fileKinds.map((kind) => [kind, files.filter((file) => file.kind === kind).length])) as Record<FileKind, number>;
  const inventoryCounts = Object.fromEntries(categories.map((category) => [category, inventory.filter((item) => item.category === category).length])) as Record<InventoryCategory, number>;
  const severityCounts = Object.fromEntries(severities.map((severity) => [severity, findings.filter((item) => item.severity === severity).length])) as Record<Severity, number>;
  const confidenceCounts = Object.fromEntries(confidences.map((confidence) => [confidence, [...inventory, ...findings].filter((item) => item.confidence === confidence).length])) as Record<Confidence, number>;
  const stageCounts = Object.fromEntries(stages.map((stage) => [stage, [...inventory, ...findings].filter((item) => item.migrationStage === stage).length])) as Record<MigrationStage, number>;
  const errors = findings.filter((finding) => finding.severity === 'error').length;
  return { supportState: errors === 0 ? 'supported' : inventory.length > 0 ? 'partial' : 'unsupported', files: files.length, components: components.length, fileKinds: fileKindCounts, inventory: inventoryCounts, severities: severityCounts, confidences: confidenceCounts, stages: stageCounts };
}

class ParserWorker {
  private worker = new Worker(parserWorkerUrl(), { resourceLimits: { maxOldGenerationSizeMb: ANALYZER_LIMITS.workerMemoryMiB } });
  async analyze(path: string, kind: FileKind, source: string): Promise<WorkerResult> {
    return await new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        void this.worker.terminate();
        reject(new VueMigrationAnalyzerError('Parser file deadline exceeded.', 3));
      }, ANALYZER_LIMITS.millisecondsPerFile);
      const onMessage = (message: { ok: boolean; result?: WorkerResult; message?: string }) => {
        clearTimeout(timeout);
        cleanup();
        if (message.ok && message.result) resolvePromise(message.result);
        else reject(new Error(message.message ?? 'Parser worker failed.'));
      };
      const onError = (error: Error) => { clearTimeout(timeout); cleanup(); reject(error); };
      const cleanup = () => { this.worker.off('message', onMessage); this.worker.off('error', onError); };
      this.worker.on('message', onMessage);
      this.worker.on('error', onError);
      this.worker.postMessage({ path, kind, source });
    });
  }
  async close(): Promise<void> { await this.worker.terminate(); }
}

function parserWorkerUrl(): URL {
  return import.meta.url.endsWith('/src/index.ts')
    ? new URL('../dist/src/worker.js', import.meta.url)
    : new URL('./worker.js', import.meta.url);
}

function projectFinding(code: RawFinding['code'], severity: Severity, confidence: Confidence, message: string, stage: MigrationStage): PendingFinding {
  return { code, severity, confidence, message, stage, location: null, path: '', fileId: null, source: null };
}
function location(fileIdValue: string, source: string, start: number, end: number): SourceLocation {
  return { fileId: fileIdValue, startOffset: start, endOffset: end, start: point(source, start), end: point(source, end) };
}
function point(source: string, offset: number) {
  const before = source.slice(0, Math.max(0, offset));
  const lines = before.split(/\r\n|\r|\n/);
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}
function guide(stage: MigrationStage): string {
  const slug: Record<MigrationStage, string> = {
    baseline: 'stage-0-establish-the-baseline',
    'leaf-boundary': 'stage-1-replace-one-leaf-with-a-production-custom-element',
    'state-form': 'stage-2-transfer-component-and-form-state',
    'route-state-async': 'stage-3-cut-over-routes-shared-state-and-async-ui',
    'styles-universal': 'stage-4-cut-over-styles-and-universal-rendering',
    'shell-removal': 'stage-5-transfer-the-shell-and-remove-vue',
  };
  return `https://marcmalerei.github.io/gluon/${ANALYZER_VERSION}/migration/vue-to-gluon-cutover/#${slug[stage]}`;
}
function compareRaw(a: { path: string; location: RawFinding['location'] }, b: { path: string; location: RawFinding['location'] }, aKey: string, bKey: string): number {
  return a.path.localeCompare(b.path) || (a.location?.start ?? 0) - (b.location?.start ?? 0) || aKey.localeCompare(bKey) || (a.location?.end ?? 0) - (b.location?.end ?? 0);
}
function comparePath(a: { path: string }, b: { path: string }): number { return a.path.localeCompare(b.path); }
function fileId(path: string): string { return `file:${path}`; }
function digest(bytes: Uint8Array): `sha256:${string}` { return `sha256:${createHash('sha256').update(bytes).digest('hex')}`; }
function slash(path: string): string { return path.split(sep).join('/'); }
function inside(root: string, path: string): boolean { return path === root || path.startsWith(`${root}${sep}`); }
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}
