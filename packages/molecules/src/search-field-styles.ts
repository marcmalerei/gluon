import { createComponentStyleDependency, css } from '@gluonjs/core';

export const searchFieldStyles = css`
  @layer molecules {
    :where(.gluon-search-field) { display: grid; gap: var(--gluon-search-field-gap, 0.5rem); inline-size: 100%; min-inline-size: 0; color: var(--gluon-search-field-color, inherit); }
    :where(.gluon-search-field-label) { font-weight: var(--gluon-search-field-label-weight, 650); overflow-wrap: anywhere; }
    :where(.gluon-search-field-controls) { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--gluon-search-field-control-gap, 0.5rem); align-items: stretch; min-inline-size: 0; }
    :where(.gluon-search-field-controls > :is(input, button)) { min-block-size: var(--gluon-search-field-control-size, 44px); }
    :where(.gluon-search-field-controls > button) { min-inline-size: var(--gluon-search-field-submit-size, 7rem); }
    :where(.gluon-search-field input:focus-visible, .gluon-search-field button:focus-visible) { outline: var(--gluon-search-field-focus-outline, 3px solid Highlight); outline-offset: var(--gluon-search-field-focus-offset, 2px); }
    @media (max-width: 24rem) { :where(.gluon-search-field-controls) { grid-template-columns: 1fr; } :where(.gluon-search-field-controls > button) { inline-size: 100%; } }
    @media (forced-colors: active) { :where(.gluon-search-field) { color: CanvasText; } :where(.gluon-search-field-controls > button) { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-search-field, .gluon-search-field *) { animation: none !important; transition: none !important; } }
  }
`;

export const searchFieldStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-search-field', sheet: searchFieldStyles, layer: 'molecule', order: 15, scope: 'gluon-component' });
