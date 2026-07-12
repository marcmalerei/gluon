import { createStyleSheetSelection, css } from '@gluonjs/core';
import { createUiStyleSelection, type UiThemeName } from '@gluonjs/atoms';

export const starterStyles = css`
  @layer starter {
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      font-family: Inter, system-ui, sans-serif;
      color: #111111;
      background: #f6f7f2;
      --starter-accent: #c8ff00;
      --starter-ink: #111111;
      --starter-rule: #c8cbc1;
      --starter-surface: #ffffff;
    }
    body { margin: 0; min-width: 320px; }
    header { display: flex; min-height: 64px; align-items: center; justify-content: space-between; gap: 24px; padding: 0 24px; border-bottom: 1px solid var(--starter-rule); background: var(--starter-surface); }
    nav { display: flex; gap: 24px; }
    a { color: inherit; }
    .brand { font-weight: 750; letter-spacing: -0.02em; text-decoration: none; }
    main { width: min(760px, 100%); margin: 0 auto; padding: clamp(40px, 9vw, 96px) 24px; }
    .starter-panel { display: grid; gap: 24px; padding: clamp(28px, 6vw, 56px); border: 1px solid var(--starter-rule); background: var(--starter-surface); }
    .starter-panel h1 { margin: 0; font-size: clamp(2.5rem, 9vw, 5.5rem); line-height: 0.95; letter-spacing: -0.055em; }
    .starter-panel p { max-width: 52ch; margin: 0; color: #51534d; }
    .starter-action {
      justify-self: start;
      --gluon-button-background: var(--starter-accent);
      --gluon-button-border-color: var(--starter-ink);
      --gluon-button-color: var(--starter-ink);
    }
    :focus-visible { outline: 3px solid #173f91; outline-offset: 3px; }
    @media (max-width: 480px) {
      header { align-items: flex-start; flex-direction: column; padding-block: 16px; }
      main { padding-inline: 16px; }
      .starter-panel { padding: 24px; }
    }
  }
`;


/** Shared UI carriers followed by the app-owned starter token and layout sheet. */
export function createStarterStyleSelection(theme: UiThemeName = 'light') {
  const ui = createUiStyleSelection(theme);
  return createStyleSheetSelection([
    ...ui.entries,
    { id: 'gluon-starter', scope: 'gluon-starter', sheet: starterStyles },
  ]);
}

/** App-owned carrier left after installUi() consumes the shared UI carriers. */
export const starterHydrationStyleSelection = createStyleSheetSelection([
  { id: 'gluon-starter', scope: 'gluon-starter', sheet: starterStyles },
]);
