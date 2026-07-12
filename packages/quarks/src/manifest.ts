export interface UiContractEntry {
  readonly name: string;
  readonly kind: 'factory' | 'behavior' | 'component' | 'stylesheet';
  readonly status: 'stable';
  readonly accessibility: string;
  readonly extension: string;
  readonly example: string;
  readonly tests: readonly string[];
}

export interface UiPackageManifest {
  readonly schemaVersion: 1;
  readonly package: `@gluonjs/${string}`;
  readonly layer: 'quark' | 'atom' | 'molecule' | 'organism';
  readonly entries: readonly UiContractEntry[];
}

const sharedEvidence = {
  example: 'docs-site/examples/ui-system.ts',
  tests: ['tests/ui-system.spec.ts', 'tests/ui-visual.spec.ts'],
} as const;

export const quarkManifest = Object.freeze({
  schemaVersion: 1,
  package: '@gluonjs/quarks',
  layer: 'quark',
  entries: Object.freeze([
    { name: 'q/quark/fragment', kind: 'factory', status: 'stable', accessibility: 'Native element semantics remain authoritative; callers provide accessible names and relationships required by the selected element.', extension: 'q derives QuarkProps from HTMLElementTagNameMap; fragment renders no element.', ...sharedEvidence },
    { name: 'createFocusScope', kind: 'behavior', status: 'stable', accessibility: 'Moves focus on activation, contains Tab and Shift+Tab, and restores the connected trigger on deactivation.', extension: 'Behavior over a caller-owned HTMLElement; it renders no element and accepts no attributes.', ...sharedEvidence },
    { name: 'Overlay', kind: 'component', status: 'stable', accessibility: 'Adds no semantic role; dismissal occurs only for a pointer event whose target is the overlay itself.', extension: 'attributes targets HTMLDivElement; children stay component-owned.', ...sharedEvidence },
    { name: 'Dialog', kind: 'component', status: 'stable', accessibility: 'Requires aria-label or aria-labelledby and emits role=dialog plus aria-modal state.', extension: 'attributes targets HTMLDivElement; role and naming/modal ARIA stay explicit.', ...sharedEvidence },
    { name: 'Popover', kind: 'component', status: 'stable', accessibility: 'Uses the native popover attribute; the trigger remains responsible for popovertarget and accessible naming.', extension: 'attributes targets HTMLDivElement; id, children, and popover mode stay explicit.', ...sharedEvidence },
    { name: 'Listbox', kind: 'component', status: 'stable', accessibility: 'Requires a label and stable id; Arrow keys, Home, and End select enabled options using the ARIA listbox pattern.', extension: 'attributes targets HTMLDivElement; listbox role, label, id, and active descendant stay explicit.', ...sharedEvidence },
    { name: 'Field', kind: 'component', status: 'stable', accessibility: 'Uses implicit native label association and exposes helper or error text as visible content.', extension: 'attributes targets HTMLLabelElement; composed children stay component-owned.', ...sharedEvidence },
  ]),
} as const satisfies UiPackageManifest);
