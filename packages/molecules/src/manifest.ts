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
    { name: 'ButtonGroup', kind: 'component', status: 'stable', styles: ['gluon-molecule-button-group'], accessibility: 'Renders a named role=group around caller-owned native Button or ToggleButton controls while preserving source order, Tab order, and each child semantic.', extension: 'attributes targets HTMLDivElement; accessible label, orientation, attached or spaced layout, wrapping, and child controls stay explicit without selection, routing, menu, or pressed-state ownership.', ...sharedEvidence },
    { name: 'Card', kind: 'component', status: 'stable', styles: ['gluon-molecule-card'], accessibility: 'Renders a native article with optional heading content; callers preserve heading level order around repeated cards.', extension: 'attributes targets HTMLElement article; title, media, actions, and body children stay explicit.', ...sharedEvidence },
    { name: 'ChoiceGroup', kind: 'component', status: 'stable', styles: ['gluon-molecule-choice-group'], accessibility: 'Renders a native fieldset and visible legend with optional helper, announced error, disabled propagation, and native Checkbox or Radio keyboard/form behavior.', extension: 'attributes targets HTMLFieldSetElement; legend, option controls, values, checked state, copy, validation, and vertical or horizontal layout stay explicit.', ...sharedEvidence },
    { name: 'ControlField', kind: 'component', status: 'stable', styles: ['gluon-molecule-control-field'], accessibility: 'Provides a visible native label plus deterministic label, helper, error, required-indicator, aria-describedby, aria-errormessage, and aria-invalid relationships for a caller-rendered control.', extension: 'attributes targets the outer HTMLDivElement; a render callback receives public relationship metadata while control value, events, validation, and native attributes stay caller-owned.', ...sharedEvidence },
    { name: 'FormField', kind: 'component', status: 'stable', styles: ['gluon-molecule-form-field'], accessibility: 'Uses implicit native label association, visible helper text, aria-invalid, and a role=alert validation message.', extension: 'Input attributes target HTMLInputElement; fieldAttributes targets HTMLLabelElement; composed children stay explicit.', ...sharedEvidence },
    { name: 'NavigationStrip', kind: 'component', status: 'stable', styles: ['gluon-molecule-navigation-strip'], accessibility: 'Renders a named native navigation landmark, exposes keyboard-operable overflow controls, and reveals the exact aria-current destination.', extension: 'attributes targets the native navigation landmark; destination markup and active-state semantics stay caller-owned.', ...sharedEvidence },
  ]),
} as const satisfies UiPackageManifest);
