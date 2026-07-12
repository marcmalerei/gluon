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
    { name: 'Button', kind: 'component', status: 'stable', accessibility: 'Renders a native type=button control, preserves disabled semantics, and exposes a visible focus indicator with a 44px minimum target.', extension: 'attributes targets HTMLButtonElement; children, type, and disabled stay explicit; defineButtonPreset owns app presets.', ...sharedEvidence },
    { name: 'Icon', kind: 'component', status: 'stable', accessibility: 'Decorative icons are aria-hidden; informative icons require a label and expose role=img.', extension: 'attributes targets SVGSVGElement; role, naming, size, and body stay explicit; defineIcon owns custom geometry.', ...sharedEvidence },
    { name: 'Input', kind: 'component', status: 'stable', accessibility: 'Renders a native input; callers associate it with Label or FormField and may expose aria-invalid.', extension: 'attributes targets HTMLInputElement; value, validation, type, name, placeholder, and disabled stay explicit.', ...sharedEvidence },
    { name: 'Label', kind: 'component', status: 'stable', accessibility: 'Provides visible label text and is composed inside a native label by FormField.', extension: 'attributes targets HTMLSpanElement; visible children stay explicit.', ...sharedEvidence },
    { name: 'installUi', kind: 'stylesheet', status: 'stable', accessibility: 'One explicit target owner installs light or dark tokens, preserves visible focus and WCAG-aware contrast, and releases its exact stylesheet references.', extension: 'Target-scoped stylesheet owner only; it renders no native element and accepts no attributes or ref.', ...sharedEvidence },
  ]),
} as const satisfies UiPackageManifest);
