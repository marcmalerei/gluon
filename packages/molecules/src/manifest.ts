import type { UiPackageManifest } from '@gluonjs/quarks';

const sharedEvidence = {
  example: 'docs-site/examples/ui-system.ts',
  tests: ['tests/ui-system.spec.ts', 'tests/ui-visual.spec.ts'],
} as const;

export const moleculeManifest = Object.freeze({
  schemaVersion: 1,
  package: '@gluonjs/molecules',
  layer: 'molecule',
  entries: Object.freeze([
    { name: 'Card', kind: 'component', status: 'stable', styles: ['gluon-molecule-card'], accessibility: 'Renders a native article with optional heading content; callers preserve heading level order around repeated cards.', extension: 'attributes targets HTMLElement article; title, media, actions, and body children stay explicit.', ...sharedEvidence },
    { name: 'FormField', kind: 'component', status: 'stable', styles: ['gluon-molecule-form-field'], accessibility: 'Uses implicit native label association, visible helper text, aria-invalid, and a role=alert validation message.', extension: 'Input attributes target HTMLInputElement; fieldAttributes targets HTMLLabelElement; composed children stay explicit.', ...sharedEvidence },
  ]),
} as const satisfies UiPackageManifest);
