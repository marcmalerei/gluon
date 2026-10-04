import { createComponentStyleDependency, css } from '@gluonjs/core';

export const autocompleteStyles = css`
  @layer molecules {
    :where(.gluon-autocomplete) { min-inline-size: 0; color: var(--gluon-autocomplete-color, inherit); }
    :where(.gluon-autocomplete input[role='combobox']) { border-color: var(--gluon-autocomplete-border, inherit); }
    :where(.gluon-autocomplete[aria-busy='true']) { opacity: var(--gluon-autocomplete-busy-opacity, .82); }
    @media (forced-colors: active) { :where(.gluon-autocomplete input[role='combobox']) { border-color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-autocomplete, .gluon-autocomplete *) { transition: none !important; animation: none !important; } }
  }
`;

export const autocompleteStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-autocomplete', sheet: autocompleteStyles, layer: 'molecule', order: 50, scope: 'gluon-component' });
