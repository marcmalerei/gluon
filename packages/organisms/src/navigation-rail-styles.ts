import { createComponentStyleDependency, css } from '@gluonjs/core';

export const navigationRailStyles = css`
  @layer organisms {
    :where(.gluon-navigation-rail) {
      display: grid;
      min-block-size: var(--gluon-navigation-rail-min-block-size, 100dvb);
      grid-template-rows: auto minmax(0, 1fr);
      inline-size: var(--gluon-navigation-rail-width, 17rem);
      background: var(--gluon-navigation-rail-background, var(--gluon-color-canvas, #fff));
      color: var(--gluon-navigation-rail-color, var(--gluon-color-text, #12312f));
      border-inline-end: 1px solid var(--gluon-navigation-rail-border, var(--gluon-color-rule, #b8c9c6));
      transition: inline-size var(--gluon-motion-duration, 180ms) var(--gluon-motion-ease, ease);
    }
    :where(.gluon-navigation-rail.is-collapsed) { inline-size: var(--gluon-navigation-rail-collapsed-width, 4.5rem); }
    :where(.gluon-navigation-rail-header, .gluon-navigation-rail-footer) {
      display: flex;
      align-items: center;
      gap: var(--gluon-navigation-rail-gap, .5rem);
      padding: var(--gluon-navigation-rail-padding, .75rem);
    }
    :where(.gluon-navigation-rail-header) { justify-content: space-between; }
    :where(.gluon-navigation-rail-header-content) { min-inline-size: 0; flex: 1; }
    :where(.gluon-navigation-rail-panel) { display: grid; min-block-size: 0; grid-template-rows: minmax(0, 1fr) auto; }
    :where(.gluon-navigation-rail-navigation) { overflow: auto; padding: var(--gluon-navigation-rail-nav-padding, .5rem); }
    :where(.gluon-navigation-rail-group + .gluon-navigation-rail-group) { margin-block-start: var(--gluon-navigation-rail-group-gap, 1rem); }
    :where(.gluon-navigation-rail-group-label) {
      margin: 0 0 .375rem;
      padding-inline: .75rem;
      color: var(--gluon-navigation-rail-muted, #52716d);
      font-size: .75rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    :where(.gluon-navigation-rail-list) { display: grid; gap: .25rem; margin: 0; padding: 0; list-style: none; }
    :where(.gluon-navigation-rail-link) {
      display: flex;
      min-block-size: 2.75rem;
      align-items: center;
      gap: .625rem;
      padding: .625rem .75rem;
      border-radius: var(--gluon-navigation-rail-item-radius, .5rem);
      color: inherit;
      text-decoration: none;
    }
    :where(.gluon-navigation-rail-link:hover, .gluon-navigation-rail-item.is-active .gluon-navigation-rail-link) {
      background: var(--gluon-navigation-rail-active-background, #e8f0ee);
      color: var(--gluon-navigation-rail-active-color, currentColor);
    }
    :where(.gluon-navigation-rail-item.is-disabled .gluon-navigation-rail-link) { cursor: not-allowed; opacity: .55; }
    :where(.gluon-navigation-rail-icon) { display: inline-grid; flex: 0 0 1.25rem; place-items: center; }
    :where(.gluon-navigation-rail-label) { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    :where(.gluon-navigation-rail-badge) { margin-inline-start: auto; border-radius: 999px; background: var(--gluon-navigation-rail-badge-background, #d9e6e2); padding: .125rem .4rem; font-size: .75rem; }
    :where(.gluon-navigation-rail-collapse-button, .gluon-navigation-rail-mobile-button) { min-block-size: 2.75rem; min-inline-size: 2.75rem; border: 1px solid var(--gluon-navigation-rail-control-border, currentColor); border-radius: .375rem; background: transparent; color: inherit; cursor: pointer; }
    :where(.gluon-navigation-rail-mobile-button) { display: none; }
    :where(.gluon-navigation-rail.is-collapsed .gluon-navigation-rail-label, .gluon-navigation-rail.is-collapsed .gluon-navigation-rail-badge, .gluon-navigation-rail.is-collapsed .gluon-navigation-rail-group-label) { inline-size: 0; block-size: 0; overflow: hidden; opacity: 0; }
    :where(.gluon-navigation-rail.is-collapsed .gluon-navigation-rail-link) { justify-content: center; padding-inline: .5rem; }
    :where(.gluon-navigation-rail a:focus-visible, .gluon-navigation-rail button:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) {
      :where(.gluon-navigation-rail) { position: relative; min-block-size: auto; inline-size: 100%; border-inline-end: 0; border-block-end: 1px solid var(--gluon-navigation-rail-border, var(--gluon-color-rule, #b8c9c6)); }
      :where(.gluon-navigation-rail.is-collapsed) { inline-size: 100%; }
      :where(.gluon-navigation-rail-header) { padding: .5rem .75rem; }
      :where(.gluon-navigation-rail-mobile-button) { display: inline-block; }
      :where(.gluon-navigation-rail-collapse-button) { display: none; }
      :where(.gluon-navigation-rail:not(.is-mobile-open) .gluon-navigation-rail-panel) { display: none; }
      :where(.gluon-navigation-rail-panel) { max-block-size: min(70dvh, 32rem); }
      :where(.gluon-navigation-rail-navigation) { padding: .75rem; }
    }
    @media (forced-colors: active) {
      :where(.gluon-navigation-rail, .gluon-navigation-rail-link, .gluon-navigation-rail-collapse-button, .gluon-navigation-rail-mobile-button) { border-color: CanvasText; }
      :where(.gluon-navigation-rail-item.is-active .gluon-navigation-rail-link) { background: Highlight; color: HighlightText; }
    }
    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-navigation-rail, .gluon-navigation-rail *) { animation: none !important; transition: none !important; }
    }
  }
`;

export const navigationRailStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-navigation-rail', sheet: navigationRailStyles, layer: 'organism', order: 12, scope: 'gluon-component' });
