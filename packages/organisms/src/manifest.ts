import type { UiPackageManifest } from '@gluonjs/quarks';

const sharedEvidence = {
  example: 'docs-site/examples/ui-system.ts',
  tests: ['tests/ui-system.spec.ts', 'tests/ui-visual.spec.ts'],
} as const;

export const organismManifest = Object.freeze({
  schemaVersion: 1,
  package: '@gluonjs/organisms',
  layer: 'organism',
  entries: Object.freeze([
    { name: 'AppShell', kind: 'component', status: 'stable', accessibility: 'Provides header, nav, main, and footer landmarks; callers give the navigation an accessible name when more than one nav exists.', ...sharedEvidence },
  ]),
} as const satisfies UiPackageManifest);
