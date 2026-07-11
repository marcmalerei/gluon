export interface UiContractEntry {
  readonly name: string;
  readonly kind: 'factory' | 'behavior' | 'component' | 'stylesheet';
  readonly status: 'stable';
  readonly accessibility: string;
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
    { name: 'q/quark/fragment', kind: 'factory', status: 'stable', accessibility: 'Native element semantics remain authoritative; callers provide accessible names and relationships required by the selected element.', ...sharedEvidence },
    { name: 'createFocusScope', kind: 'behavior', status: 'stable', accessibility: 'Moves focus on activation, contains Tab and Shift+Tab, and restores the connected trigger on deactivation.', ...sharedEvidence },
    { name: 'Overlay', kind: 'component', status: 'stable', accessibility: 'Adds no semantic role; dismissal occurs only for a pointer event whose target is the overlay itself.', ...sharedEvidence },
    { name: 'Dialog', kind: 'component', status: 'stable', accessibility: 'Requires aria-label or aria-labelledby and emits role=dialog plus aria-modal state.', ...sharedEvidence },
    { name: 'Popover', kind: 'component', status: 'stable', accessibility: 'Uses the native popover attribute; the trigger remains responsible for popovertarget and accessible naming.', ...sharedEvidence },
    { name: 'Listbox', kind: 'component', status: 'stable', accessibility: 'Requires a label and stable id; Arrow keys, Home, and End select enabled options using the ARIA listbox pattern.', ...sharedEvidence },
    { name: 'Field', kind: 'component', status: 'stable', accessibility: 'Uses implicit native label association and exposes helper or error text as visible content.', ...sharedEvidence },
  ]),
} as const satisfies UiPackageManifest);
