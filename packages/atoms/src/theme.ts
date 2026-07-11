import { adoptStyles, css, unadoptStyles, type StyleTarget } from '@gluonjs/core';

export type UiThemeName = 'light' | 'dark';

export const uiTokenStyles = css`
  @layer atoms {
    :root {
      --gluon-font-family: ui-sans-serif, system-ui, sans-serif;
      --gluon-radius-control: 0.625rem;
      --gluon-radius-surface: 1rem;
      --gluon-space-control-block: 0.75rem;
      --gluon-space-control-inline: 1rem;
      --gluon-focus-width: 3px;
    }
  }
`;

export const lightThemeStyles = css`
  @layer atoms {
    :root, [data-gluon-theme="light"] {
      color-scheme: light;
      --gluon-color-canvas: #ffffff;
      --gluon-color-surface: #ffffff;
      --gluon-color-text: #12312f;
      --gluon-color-muted: #526663;
      --gluon-color-rule: #b8c9c6;
      --gluon-color-action: #087f7b;
      --gluon-color-action-text: #ffffff;
      --gluon-color-action-soft: #e6f4f1;
      --gluon-color-action-soft-text: #075e5b;
      --gluon-color-focus: #173f91;
      --gluon-color-danger: #a52222;
    }
  }
`;

export const darkThemeStyles = css`
  @layer atoms {
    [data-gluon-theme="dark"] {
      color-scheme: dark;
      --gluon-color-canvas: #101716;
      --gluon-color-surface: #172220;
      --gluon-color-text: #f1f7f5;
      --gluon-color-muted: #b8c9c6;
      --gluon-color-rule: #526663;
      --gluon-color-action: #65d5c8;
      --gluon-color-action-text: #071f1c;
      --gluon-color-action-soft: #20443f;
      --gluon-color-action-soft-text: #e8fffb;
      --gluon-color-focus: #8caeff;
      --gluon-color-danger: #ff9b9b;
    }
  }
`;

interface SheetOwnership {
  count: number;
  readonly installed: boolean;
}

const themeOwnership = new WeakMap<StyleTarget, Map<CSSStyleSheet, SheetOwnership>>();

export function getThemeStyles(theme: UiThemeName): CSSStyleSheet {
  return theme === 'dark' ? darkThemeStyles : lightThemeStyles;
}

export function installUiTheme(
  target: StyleTarget,
  theme: UiThemeName = 'light',
): () => void {
  const themeStyles = getThemeStyles(theme);
  retainSheet(target, uiTokenStyles);
  retainSheet(target, themeStyles);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    releaseSheet(target, themeStyles);
    releaseSheet(target, uiTokenStyles);
  };
}

function retainSheet(target: StyleTarget, sheet: CSSStyleSheet): void {
  let ownership = themeOwnership.get(target);
  if (!ownership) {
    ownership = new Map();
    themeOwnership.set(target, ownership);
  }
  const current = ownership.get(sheet);
  if (current) {
    current.count += 1;
    return;
  }
  const installed = !target.adoptedStyleSheets.includes(sheet);
  if (installed) adoptStyles(target, sheet);
  ownership.set(sheet, { count: 1, installed });
}

function releaseSheet(target: StyleTarget, sheet: CSSStyleSheet): void {
  const ownership = themeOwnership.get(target);
  const current = ownership?.get(sheet);
  if (!ownership || !current) return;
  current.count -= 1;
  if (current.count > 0) return;
  ownership.delete(sheet);
  if (current.installed) unadoptStyles(target, sheet);
  if (ownership.size === 0) themeOwnership.delete(target);
}
