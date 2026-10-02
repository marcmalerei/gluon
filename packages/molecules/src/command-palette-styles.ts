import { createComponentStyleDependency, css } from '@gluonjs/core';

export const commandPaletteStyles = css`
  @layer molecules {
    :where(.gluon-command-palette) { display: grid; gap: var(--gluon-command-palette-gap, .75rem); min-inline-size: 0; padding: var(--gluon-command-palette-padding, 1rem); border: 1px solid var(--gluon-command-palette-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-command-palette-radius, var(--gluon-radius-panel, .875rem)); background: var(--gluon-command-palette-background, var(--gluon-color-surface, #fff)); color: var(--gluon-command-palette-color, var(--gluon-color-ink, #12312f)); box-shadow: var(--gluon-command-palette-shadow, 0 18px 48px rgb(18 49 47 / 18%)); }
    :where(.gluon-command-palette-label) { margin: 0; font-size: var(--gluon-command-palette-label-size, 1rem); font-weight: 700; }
    :where(.gluon-command-palette-control) { min-inline-size: 0; }
    :where(.gluon-command-palette input[role="combobox"]) { inline-size: 100%; min-block-size: var(--gluon-command-palette-control-size, 44px); }
    :where(.gluon-command-palette-listbox) { display: grid; gap: .75rem; max-block-size: var(--gluon-command-palette-listbox-max-block-size, 22rem); overflow: auto; margin: 0; padding: .125rem; }
    :where(.gluon-command-palette-group) { display: grid; gap: .25rem; }
    :where(.gluon-command-palette-group-label) { margin: 0; padding: .25rem .625rem; color: var(--gluon-command-palette-muted-color, var(--gluon-color-muted, #526663)); font-size: .75rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    :where(.gluon-command-palette-command) { display: flex; align-items: center; justify-content: space-between; gap: 1rem; inline-size: 100%; min-block-size: 44px; padding: .625rem .75rem; border: 0; border-radius: var(--gluon-command-palette-command-radius, .5rem); background: transparent; color: inherit; text-align: start; cursor: pointer; }
    :where(.gluon-command-palette-command:hover, .gluon-command-palette-command[aria-selected="true"]) { background: var(--gluon-command-palette-selected-background, var(--gluon-color-action-soft, #e6f4f1)); color: var(--gluon-command-palette-selected-color, var(--gluon-color-action-soft-text, #075e5b)); }
    :where(.gluon-command-palette-command:disabled, .gluon-command-palette-command.is-disabled) { cursor: not-allowed; opacity: .55; }
    :where(.gluon-command-palette-command-copy) { display: grid; gap: .125rem; min-inline-size: 0; }
    :where(.gluon-command-palette-command-label, .gluon-command-palette-command-description) { overflow-wrap: anywhere; }
    :where(.gluon-command-palette-command-description) { color: var(--gluon-command-palette-description-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; }
    :where(.gluon-command-palette-command-shortcut) { flex: 0 0 auto; color: var(--gluon-command-palette-shortcut-color, var(--gluon-color-muted, #526663)); font-size: .75rem; }
    :where(.gluon-command-palette-status) { margin: 0; padding: .75rem; color: var(--gluon-command-palette-muted-color, var(--gluon-color-muted, #526663)); }
    :where(.gluon-command-palette input[role="combobox"]:focus-visible, .gluon-command-palette-command:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (forced-colors: active) { :where(.gluon-command-palette) { border-color: ButtonText; background: Canvas; color: CanvasText; } :where(.gluon-command-palette-command[aria-selected="true"]) { background: Highlight; color: HighlightText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-command-palette, .gluon-command-palette *) { animation: none !important; transition: none !important; } }
  }
`;

export const commandPaletteStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-command-palette', sheet: commandPaletteStyles, layer: 'molecule', order: 45, scope: 'gluon-component' });
