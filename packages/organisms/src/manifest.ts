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
    { name: 'AppShell', kind: 'component', status: 'stable', styles: ['gluon-organism-app-shell'], accessibility: 'Provides header, nav, main, and footer landmarks; callers give the navigation an accessible name when more than one nav exists.', extension: 'attributes targets outer HTMLDivElement; landmark content remains explicit component input.', ...sharedEvidence },
    { name: 'ConfirmationDialog', kind: 'component', status: 'stable', styles: ['gluon-organism-confirmation-dialog'], accessibility: 'Native modal dialog with stable title/description relationships, optional initial focus, native Escape/cancel/close behavior, focus restoration, inert busy/disabled actions, opt-in backdrop dismissal, and one polite status.', extension: 'attributes target the native HTMLDialogElement and expose native events; the optional controller owns only showModal/close/focus lifecycle while callers own action controls, copy, mutation, routing, and controlled state.', ...sharedEvidence },
    { name: 'WorkflowTimeline', kind: 'component', status: 'stable', styles: ['gluon-organism-workflow-timeline'], accessibility: 'Renders one ordered list with a truthful localized overall summary, instance-namespaced relationships, aria-current="step" for at most one current stage, and explicit localized status, role, evidence, and action/link content.', extension: 'Request-free and SSR-safe; a stable root id is required, omitted overall state derives as empty/active/blocked/complete, invalid input fails closed, attributes target the outer section, and steps accept native TemplateValue slots.', ...sharedEvidence },
  ]),
} as const satisfies UiPackageManifest);
