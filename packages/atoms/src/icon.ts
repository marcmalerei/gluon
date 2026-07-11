import { defineAtom, html, type TemplateResult } from '@gluonjs/core';

export type IconName = 'trend-up' | 'trend-down' | 'alert' | 'spark';

export interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly label?: string;
}

function renderIcon({ name, size = 18, label }: IconProps): TemplateResult {
  const attributes = {
    class: { gluon: true, atom: true, 'gluon-icon': true },
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    role: label ? 'img' : null,
    aria: label ? { label } : { hidden: true },
  };

  switch (name) {
    case 'trend-up':
      return html`<svg ...=${attributes}><path d="M5 16l6-6 4 4 6-8" stroke="currentColor" stroke-width="2" fill="none"></path></svg>`;
    case 'trend-down':
      return html`<svg ...=${attributes}><path d="M5 8l6 6 4-4 6 8" stroke="currentColor" stroke-width="2" fill="none"></path></svg>`;
    case 'alert':
      return html`<svg ...=${attributes}><path d="M12 3l9 16H3l9-16zm0 6v4m0 4h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"></path></svg>`;
    case 'spark':
      return html`<svg ...=${attributes}><path d="M3 13l4-4 3 3 4-6 5 9" stroke="currentColor" stroke-width="2" fill="none"></path></svg>`;
  }
}

export const Icon = defineAtom(renderIcon, 'Icon');
