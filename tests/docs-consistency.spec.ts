import { describe, expect, test } from 'vitest';
import {
  findLockstepVersionMentions,
  validateDocsConsistency,
} from '../scripts/docs-consistency.mjs';

describe('docs consistency helpers', () => {
  test('finds only release-line versions instead of unrelated historical examples', () => {
    expect(findLockstepVersionMentions(
      'Part of the lockstep Gluon `1.4.0` release line; use the current `1.9.0` release line. Migration started at `1.0.0`.',
    )).toEqual(['1.4.0', '1.9.0']);
  });

  test('rejects stale release lines and contradictory current-state wording', () => {
    expect(() => validateDocsConsistency([
      { path: 'packages/router/README.md', text: 'The package is part of the lockstep Gluon `1.4.0` release line.' },
    ], { currentVersion: '1.9.0', releaseLinePaths: ['packages/router/README.md'] })).toThrow(/stale lockstep version mentions/i);

    expect(() => validateDocsConsistency([
      { path: 'README.md', text: 'The runtime exists, but the API remains experimental.' },
    ], { currentVersion: '1.9.0' })).toThrow(/contradictory release-state wording/i);
  });

  test('requires policy language on its owning page and accepts a consistent set', () => {
    const entries = [
      { path: 'README.md', text: 'stable / experimental / unsupported' },
      { path: 'packages/store/README.md', text: 'The package ships as part of the current `1.9.0` release line.\n## Stability notes' },
    ];
    expect(() => validateDocsConsistency(entries, {
      currentVersion: '1.9.0',
      requiredPhrasesByPath: { 'README.md': ['stable', 'missing phrase'] },
    })).toThrow(/README\.md is missing required consistency phrase/i);

    expect(() => validateDocsConsistency(entries, {
      currentVersion: '1.9.0',
      releaseLinePaths: ['packages/store/README.md'],
      requiredPhrasesByPath: {
        'README.md': ['stable', 'experimental', 'unsupported'],
        'packages/store/README.md': ['## Stability notes'],
      },
    })).not.toThrow();
  });
});
