import { createComponentStyleDependency, css } from '@gluonjs/core';
export const searchResultsStyles = css`
  @layer molecules {
    :where(.gluon-search-results) { display: grid; gap: var(--gluon-search-results-gap, 1.25rem); min-inline-size: 0; color: var(--gluon-search-results-color, inherit); }
    :where(.gluon-search-results-heading, .gluon-search-results-group-heading) { margin: 0; font-weight: var(--gluon-search-results-heading-weight, 700); overflow-wrap: anywhere; }
    :where(.gluon-search-results-group) { display: grid; gap: var(--gluon-search-results-group-gap, 0.5rem); min-inline-size: 0; }
    :where(.gluon-search-results-description) { margin: 0; color: var(--gluon-search-results-description-color, #53605e); overflow-wrap: anywhere; }
    :where(.gluon-search-results-list) { display: grid; gap: var(--gluon-search-results-list-gap, 0.5rem); margin: 0; padding: 0; list-style: none; min-inline-size: 0; }
    :where(.gluon-search-results-count) { color: var(--gluon-search-results-count-color, #53605e); font-weight: 500; }
    :where(.gluon-search-results-state) { min-block-size: var(--gluon-search-results-state-min-block-size, 4rem); padding: var(--gluon-search-results-state-padding, 1rem); border: var(--gluon-search-results-state-border, 1px solid #a9b4b2); border-radius: var(--gluon-search-results-state-radius, 0.5rem); overflow-wrap: anywhere; }
    @media (forced-colors: active) { :where(.gluon-search-results, .gluon-search-results-description, .gluon-search-results-count) { color: CanvasText; } :where(.gluon-search-results-state) { border: 2px solid CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-search-results, .gluon-search-results *) { animation: none !important; transition: none !important; } }
  }
`;
export const searchResultsStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-search-results', sheet: searchResultsStyles, layer: 'molecule', order: 16, scope: 'gluon-component' });
