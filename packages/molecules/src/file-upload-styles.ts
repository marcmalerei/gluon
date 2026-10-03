import { createComponentStyleDependency, css } from '@gluonjs/core';

export const fileUploadStyles = css`
  @layer molecules {
    :where(.gluon-file-upload) { display: grid; gap: var(--gluon-file-upload-gap, .5rem); min-inline-size: var(--gluon-file-upload-min-inline-size, 16rem); color: var(--gluon-file-upload-color, var(--gluon-color-text, inherit)); }
    :where(.gluon-file-upload-label) { font-size: var(--gluon-file-upload-label-size, .875rem); font-weight: var(--gluon-file-upload-label-weight, 650); }
    :where(.gluon-file-upload .gluon-file-input) { inline-size: 100%; min-block-size: var(--gluon-file-upload-input-min-block-size, 3.5rem); padding: var(--gluon-file-upload-input-padding, .75rem); border: 1px dashed var(--gluon-file-upload-border-color, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-file-upload-radius, var(--gluon-radius-control, .625rem)); background: var(--gluon-file-upload-background, var(--gluon-color-surface, white)); }
    :where(.gluon-file-upload .gluon-file-input:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    :where(.gluon-file-upload-helper, .gluon-file-upload-error) { color: var(--gluon-file-upload-helper-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-file-upload-error) { color: var(--gluon-file-upload-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    :where(.gluon-file-upload-files) { display: grid; gap: .25rem; margin: 0; padding-inline-start: 1.25rem; font-size: .875rem; overflow-wrap: anywhere; }
    @media (max-width: 30rem) { :where(.gluon-file-upload) { min-inline-size: 0; inline-size: 100%; } }
    @media (forced-colors: active) { :where(.gluon-file-upload-label) { color: CanvasText; } :where(.gluon-file-upload .gluon-file-input) { border-color: ButtonText; } :where(.gluon-file-upload-error) { color: Mark; } }
  }
`;

export const fileUploadStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-file-upload', sheet: fileUploadStyles, layer: 'molecule', order: 48, scope: 'gluon-component' });
