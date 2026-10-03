import { createComponentStyleDependency, css } from '@gluonjs/core';

export const calendarStyles = css`
  @layer molecules {
    :where(.gluon-calendar) { display: grid; gap: var(--gluon-calendar-gap, .75rem); min-inline-size: var(--gluon-calendar-min-inline-size, 19rem); padding: var(--gluon-calendar-padding, .75rem); border: 1px solid var(--gluon-calendar-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-calendar-radius, var(--gluon-radius-control, .75rem)); background: var(--gluon-calendar-background, var(--gluon-color-surface, #fff)); color: var(--gluon-calendar-color, var(--gluon-color-text, inherit)); }
    :where(.gluon-calendar-header) { display: grid; grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem; align-items: center; gap: .25rem; }
    :where(.gluon-calendar-title) { margin: 0; text-align: center; font-size: var(--gluon-calendar-title-size, 1rem); font-weight: var(--gluon-calendar-title-weight, 700); }
    :where(.gluon-calendar-nav, .gluon-calendar-day) { min-inline-size: 2.75rem; min-block-size: 2.75rem; border: 0; border-radius: var(--gluon-calendar-day-radius, .5rem); background: transparent; color: inherit; font: inherit; }
    :where(.gluon-calendar-nav) { font-size: 1.5rem; }
    :where(.gluon-calendar-nav:not(:disabled):hover, .gluon-calendar-day:not(:disabled):hover) { background: var(--gluon-calendar-hover-background, var(--gluon-color-action-soft, #e6f4f1)); }
    :where(.gluon-calendar-grid) { inline-size: 100%; border-collapse: separate; border-spacing: .125rem; table-layout: fixed; }
    :where(.gluon-calendar-grid th) { color: var(--gluon-calendar-weekday-color, var(--gluon-color-muted, #526663)); font-size: .75rem; font-weight: 650; }
    :where(.gluon-calendar-grid td) { padding: 0; text-align: center; }
    :where(.gluon-calendar-day) { inline-size: 100%; cursor: pointer; }
    :where(.gluon-calendar-day:focus-visible, .gluon-calendar-nav:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: var(--gluon-focus-offset, 2px); }
    :where(.gluon-calendar-grid td.is-outside-month) { color: var(--gluon-calendar-outside-color, var(--gluon-color-muted, #526663)); opacity: .7; }
    :where(.gluon-calendar-grid td.is-today .gluon-calendar-day) { box-shadow: inset 0 0 0 1px var(--gluon-calendar-today-border, currentColor); }
    :where(.gluon-calendar-grid td.is-selected .gluon-calendar-day) { background: var(--gluon-calendar-selected-background, var(--gluon-color-action, #075e5b)); color: var(--gluon-calendar-selected-color, #fff); font-weight: 700; }
    :where(.gluon-calendar-grid td.is-disabled) { opacity: .42; }
    :where(.gluon-calendar-day:disabled, .gluon-calendar-nav:disabled) { cursor: not-allowed; }
    @media (max-width: 30rem) { :where(.gluon-calendar) { min-inline-size: 0; inline-size: 100%; } }
    @media (forced-colors: active) { :where(.gluon-calendar) { border-color: ButtonText; background: Canvas; color: CanvasText; } :where(.gluon-calendar-grid td.is-selected .gluon-calendar-day) { background: Highlight; color: HighlightText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-calendar *) { animation: none !important; transition: none !important; } }
  }
`;

export const calendarStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-calendar', sheet: calendarStyles, layer: 'molecule', order: 52, scope: 'gluon-component' });
