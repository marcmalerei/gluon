export interface DocsConsistencyEntry {
  path: string;
  text: string;
}

export interface DocsConsistencyOptions {
  currentVersion: string;
  releaseLinePaths?: string[];
  requiredPhrasesByPath?: Record<string, string[]>;
}

export declare function findLockstepVersionMentions(text: string): string[];
export declare function findContradictoryReleaseWording(text: string): string[];
export declare function validateDocsConsistency(
  entries: DocsConsistencyEntry[],
  options: DocsConsistencyOptions,
): void;
