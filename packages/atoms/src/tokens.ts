/** Values accepted by the public Gluon UI custom-property contract. */
export type UiTokenValue = string | number;

/** Built-in names plus application-defined `--gluon-*` extensions. */
export type UiTokenName = `--gluon-${string}`;

/** Tenant and application overrides stay inside the Gluon custom-property namespace. */
export type UiTokenOverrides = Readonly<Partial<Record<UiTokenName, UiTokenValue>>>;

export const uiTokenDefaults = Object.freeze({
  '--gluon-font-family': 'ui-sans-serif, system-ui, sans-serif',
  '--gluon-font-family-display': 'ui-sans-serif, system-ui, sans-serif',
  '--gluon-font-size-base': '1rem',
  '--gluon-line-height': '1.5',
  '--gluon-density': 'comfortable',
  '--gluon-radius-control': '0.625rem',
  '--gluon-radius-surface': '1rem',
  '--gluon-radius-pill': '999px',
  '--gluon-space-control-block': '0.75rem',
  '--gluon-space-control-inline': '1rem',
  '--gluon-space-1': '0.25rem',
  '--gluon-space-2': '0.5rem',
  '--gluon-space-3': '0.75rem',
  '--gluon-space-4': '1rem',
  '--gluon-space-5': '1.25rem',
  '--gluon-space-6': '1.5rem',
  '--gluon-focus-width': '3px',
  '--gluon-focus-offset': '3px',
  '--gluon-motion-duration-fast': '140ms',
  '--gluon-motion-duration-normal': '220ms',
  '--gluon-motion-ease': 'cubic-bezier(0.2, 0, 0, 1)',
  '--gluon-shadow-surface': '0 12px 32px rgb(0 0 0 / 14%)',
} as const satisfies Record<string, UiTokenValue>);

export const lightThemeTokenValues = Object.freeze({
  '--gluon-color-canvas': '#ffffff',
  '--gluon-color-surface': '#ffffff',
  '--gluon-color-surface-raised': '#ffffff',
  '--gluon-color-text': '#12312f',
  '--gluon-color-muted': '#526663',
  '--gluon-color-rule': '#b8c9c6',
  '--gluon-color-action': '#087f7b',
  '--gluon-color-action-text': '#ffffff',
  '--gluon-color-action-soft': '#e6f4f1',
  '--gluon-color-action-soft-text': '#075e5b',
  '--gluon-color-focus': '#173f91',
  '--gluon-color-danger': '#a52222',
  '--gluon-color-success': '#17633a',
  '--gluon-color-warning': '#6b4900',
  '--gluon-color-info': '#173f91',
} as const satisfies Record<string, UiTokenValue>);

export const darkThemeTokenValues = Object.freeze({
  '--gluon-color-canvas': '#101716',
  '--gluon-color-surface': '#172220',
  '--gluon-color-surface-raised': '#21302d',
  '--gluon-color-text': '#f1f7f5',
  '--gluon-color-muted': '#b8c9c6',
  '--gluon-color-rule': '#526663',
  '--gluon-color-action': '#65d5c8',
  '--gluon-color-action-text': '#071f1c',
  '--gluon-color-action-soft': '#20443f',
  '--gluon-color-action-soft-text': '#e8fffb',
  '--gluon-color-focus': '#8caeff',
  '--gluon-color-danger': '#ff9b9b',
  '--gluon-color-success': '#8de0ac',
  '--gluon-color-warning': '#f1c56e',
  '--gluon-color-info': '#a9c0ff',
} as const satisfies Record<string, UiTokenValue>);

export type UiThemeTokenValues = Readonly<Record<string, UiTokenValue>>;

export function getThemeTokenValues(theme: 'light' | 'dark'): UiThemeTokenValues {
  return Object.freeze({
    ...uiTokenDefaults,
    ...(theme === 'dark' ? darkThemeTokenValues : lightThemeTokenValues),
  });
}

export function tokenDeclarations(values: UiThemeTokenValues): string {
  return Object.entries(values)
    .map(([name, value]) => `${name}: ${value};`)
    .join('');
}
