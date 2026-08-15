import { createComponentStyleDependency, css } from "@gluonjs/core";

export const confirmationDialogStyles = css`
  @layer organisms {
    :where(.gluon-confirmation-dialog) {
      inline-size: min(
        calc(100% - 2rem),
        var(--gluon-confirmation-dialog-width, 32rem)
      );
      max-inline-size: calc(100% - 2rem);
      max-block-size: calc(100dvb - 1rem);
      overflow: auto;
      overscroll-behavior: contain;
      padding: 0;
      border: var(--gluon-confirmation-dialog-border, 1px solid CanvasText);
      border-radius: var(--gluon-confirmation-dialog-radius, 0.75rem);
      background: var(--gluon-confirmation-dialog-surface, Canvas);
      color: var(--gluon-confirmation-dialog-color, CanvasText);
      box-shadow: var(
        --gluon-confirmation-dialog-shadow,
        0 1.5rem 4rem rgb(0 0 0 / 25%)
      );
      font: var(--gluon-confirmation-dialog-font, inherit);
    }
    :where(.gluon-confirmation-dialog)::backdrop {
      background: var(
        --gluon-confirmation-dialog-backdrop,
        rgb(15 23 42 / 45%)
      );
    }
    :where(.gluon-confirmation-dialog-content) {
      display: grid;
      gap: var(--gluon-confirmation-dialog-spacing, 1rem);
      padding: var(--gluon-confirmation-dialog-padding, 1.5rem);
    }
    :where(.gluon-confirmation-dialog-title) {
      margin: 0;
      font-size: var(--gluon-confirmation-dialog-title-size, 1.25rem);
    }
    :where(.gluon-confirmation-dialog-description) {
      margin: 0;
      color: var(--gluon-confirmation-dialog-description-color, inherit);
    }
    :where(.gluon-confirmation-dialog:focus-visible) {
      outline: var(
        --gluon-confirmation-dialog-focus-outline,
        2px solid Highlight
      );
      outline-offset: var(--gluon-confirmation-dialog-focus-offset, 2px);
    }
    :where(.gluon-confirmation-dialog-actions) {
      display: flex;
      flex-wrap: wrap;
      gap: var(--gluon-confirmation-dialog-action-gap, 0.75rem);
      justify-content: end;
    }
    :where(.gluon-confirmation-dialog-actions > *) {
      min-block-size: var(--gluon-confirmation-dialog-target-size, 2.75rem);
    }
    :where(.gluon-confirmation-dialog-safe > *) {
      background: var(--gluon-confirmation-dialog-safe-action, transparent);
      color: var(--gluon-confirmation-dialog-safe-action-color, inherit);
    }
    :where(.gluon-confirmation-dialog-status) {
      min-block-size: 1.25em;
    }
    :where(
      .gluon-confirmation-dialog[data-busy],
      .gluon-confirmation-dialog[data-disabled]
    ) {
      cursor: var(--gluon-confirmation-dialog-disabled-cursor, not-allowed);
    }
    :where(.gluon-confirmation-dialog[data-destructive])
      .gluon-confirmation-dialog-primary
      > * {
      background: var(--gluon-confirmation-dialog-destructive-action, #b42318);
      color: var(--gluon-confirmation-dialog-destructive-action-color, white);
    }
    @media (max-width: 20rem) {
      :where(.gluon-confirmation-dialog) {
        inline-size: calc(100% - 1rem);
        max-inline-size: calc(100% - 1rem);
      }
      :where(.gluon-confirmation-dialog-actions) {
        justify-content: stretch;
      }
      :where(.gluon-confirmation-dialog-actions > *) {
        flex: 1 1 100%;
      }
    }
    @media (forced-colors: active) {
      :where(.gluon-confirmation-dialog)::backdrop {
        background: Canvas;
      }
      :where(.gluon-confirmation-dialog) {
        box-shadow: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-confirmation-dialog),
      :where(.gluon-confirmation-dialog)::backdrop {
        animation: none !important;
        transition: none !important;
      }
    }
  }
`;

export const confirmationDialogStyleDependency = createComponentStyleDependency(
  {
    id: "gluon-organism-confirmation-dialog",
    sheet: confirmationDialogStyles,
    layer: "organism",
    order: 1,
    scope: "gluon-component",
  },
);
