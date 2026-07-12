export type Severity = 'info' | 'warning' | 'error';
export type Confidence = 'exact' | 'structural' | 'indeterminate';
export type SupportState = 'supported' | 'partial' | 'unsupported';
export type MigrationStage = 'baseline' | 'leaf-boundary' | 'state-form' | 'route-state-async' | 'styles-universal' | 'shell-removal';
export type FileKind = 'manifest' | 'lockfile' | 'sfc' | 'source' | 'test' | 'server' | 'build-config' | 'symlink' | 'other';
export type ParseStatus = 'parsed' | 'skipped' | 'malformed' | 'unsupported' | 'limited';
export type ScriptMode = 'none' | 'setup' | 'options' | 'setup-and-options';
export type BlockKind = 'template' | 'script' | 'script-setup' | 'style' | 'custom';
export type InventoryCategory = 'component' | 'prop-event-model' | 'slot-directive-ref' | 'reactivity-lifecycle' | 'router' | 'store' | 'async' | 'style' | 'ssr-hydration' | 'test' | 'build' | 'remaining-vue';
export type InventoryKind = 'component-element' | 'native-element' | 'prop' | 'emit' | 'model' | 'slot-declaration' | 'slot-use' | 'directive' | 'ref' | 'reactive-primitive' | 'lifecycle' | 'router-import' | 'router-call' | 'store-import' | 'store-call' | 'async-component' | 'suspense' | 'teleport' | 'keep-alive' | 'style-block' | 'ssr-call' | 'hydration-call' | 'test-file' | 'test-import' | 'build-config' | 'build-plugin' | 'vue-import' | 'vue-dependency';

export interface SourcePoint { readonly line: number; readonly column: number }
export interface SourceLocation {
  readonly fileId: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly start: SourcePoint;
  readonly end: SourcePoint;
}
export interface AnalyzedFile {
  readonly id: string;
  readonly path: string;
  readonly kind: FileKind;
  readonly bytes: number;
  readonly digest: `sha256:${string}`;
  readonly parseStatus: ParseStatus;
}
export interface SfcBlock {
  readonly kind: BlockKind;
  readonly lang: string | null;
  readonly scoped: boolean;
  readonly module: string | null;
  readonly location: SourceLocation;
}
export interface ComponentInventory {
  readonly id: string;
  readonly fileId: string;
  readonly scriptMode: ScriptMode;
  readonly blocks: readonly SfcBlock[];
  readonly inventoryIds: readonly string[];
  readonly findingIds: readonly string[];
  readonly migrationStages: readonly MigrationStage[];
}
export interface InventoryItem {
  readonly id: string;
  readonly fileId: string;
  readonly componentId: string | null;
  readonly category: InventoryCategory;
  readonly kind: InventoryKind;
  readonly name: string | null;
  readonly importSource: string | null;
  readonly confidence: Confidence;
  readonly location: SourceLocation;
  readonly migrationStage: MigrationStage;
  readonly guideUrl: string;
}
export interface MigrationFinding {
  readonly id: string;
  readonly code: `GVA${number}`;
  readonly severity: Severity;
  readonly confidence: Confidence;
  readonly message: string;
  readonly location: SourceLocation | null;
  readonly migrationStage: MigrationStage;
  readonly relatedStages: readonly MigrationStage[];
  readonly guideUrl: string;
}
export interface VueMigrationReport {
  readonly schemaVersion: '1.0.0';
  readonly analyzer: Readonly<{ name: '@gluonjs/vue-migration-analyzer'; version: string }>;
  readonly root: '.';
  readonly input: Readonly<{
    vue: Readonly<{ declaredRange: string | null; resolvedVersion: string | null; versionSource: 'exact-manifest' | 'package-lock-v2' | 'package-lock-v3' | 'unresolved' }>;
    packageManager: Readonly<{ kind: 'npm' | 'yarn' | 'pnpm' | 'other' | 'none'; lockfile: string | null }>;
    limits: typeof ANALYZER_LIMITS;
    entriesVisited: number;
    filesVisited: number;
    filesAnalyzed: number;
    bytesRead: number;
  }>;
  readonly files: readonly AnalyzedFile[];
  readonly components: readonly ComponentInventory[];
  readonly inventory: readonly InventoryItem[];
  readonly findings: readonly MigrationFinding[];
  readonly summary: Readonly<{
    supportState: SupportState;
    files: number;
    components: number;
    fileKinds: Readonly<Record<FileKind, number>>;
    inventory: Readonly<Record<InventoryCategory, number>>;
    severities: Readonly<Record<Severity, number>>;
    confidences: Readonly<Record<Confidence, number>>;
    stages: Readonly<Record<MigrationStage, number>>;
  }>;
}

export const ANALYZER_LIMITS = Object.freeze({
  directoryEntries: 10_000,
  analyzedFiles: 2_000,
  bytesPerFile: 2_097_152,
  aggregateBytes: 67_108_864,
  astNodesPerFile: 250_000,
  nesting: 256,
  workerMemoryMiB: 256,
  millisecondsPerFile: 5_000,
  millisecondsPerInvocation: 30_000,
} as const);

export interface AnalyzerOptions { readonly root: string }

export class VueMigrationAnalyzerError extends Error {
  constructor(message: string, readonly exitCode: 2 | 3) {
    super(message);
    this.name = 'VueMigrationAnalyzerError';
  }
}

export interface RawLocation { readonly start: number; readonly end: number }
export interface RawInventory {
  readonly category: InventoryCategory;
  readonly kind: InventoryKind;
  readonly name: string | null;
  readonly importSource: string | null;
  readonly confidence: Confidence;
  readonly stage: MigrationStage;
  readonly location: RawLocation;
}
export interface RawFinding {
  readonly code: `GVA${number}`;
  readonly severity: Severity;
  readonly confidence: Confidence;
  readonly message: string;
  readonly stage: MigrationStage;
  readonly relatedStages?: readonly MigrationStage[];
  readonly location: RawLocation | null;
}
export interface RawBlock {
  readonly kind: BlockKind;
  readonly lang: string | null;
  readonly scoped: boolean;
  readonly module: string | null;
  readonly location: RawLocation;
}
export interface WorkerResult {
  readonly inventory: readonly RawInventory[];
  readonly findings: readonly RawFinding[];
  readonly blocks: readonly RawBlock[];
  readonly scriptMode: ScriptMode | null;
  readonly nodeCount: number;
  readonly maxDepth: number;
}
