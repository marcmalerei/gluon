import type { UiPackageManifest } from '@gluonjs/quarks';

const sharedEvidence = {
  example: 'docs-site/examples/ui-system.ts',
  tests: ['tests/ui-system.spec.ts', 'tests/ui-visual.spec.ts'],
} as const;

export const atomManifest = Object.freeze({
  schemaVersion: 1,
  package: '@gluonjs/atoms',
  layer: 'atom',
  entries: Object.freeze([
    { name: 'Button', kind: 'component', status: 'stable', accessibility: 'Renders a native type=button control, preserves disabled semantics, and exposes a visible focus indicator with a 44px minimum target.', ...sharedEvidence },
    { name: 'Icon', kind: 'component', status: 'stable', accessibility: 'Decorative icons are aria-hidden; informative icons require a label and expose role=img.', ...sharedEvidence },
    { name: 'Input', kind: 'component', status: 'stable', accessibility: 'Renders a native input; callers associate it with Label or FormField and may expose aria-invalid.', ...sharedEvidence },
    { name: 'Label', kind: 'component', status: 'stable', accessibility: 'Provides visible label text and is composed inside a native label by FormField.', ...sharedEvidence },
    { name: 'installUiTheme', kind: 'stylesheet', status: 'stable', accessibility: 'Light and dark tokens preserve visible focus and WCAG-aware text/control contrast; adoption is explicit.', ...sharedEvidence },
  ]),
} as const satisfies UiPackageManifest);
