import { svg, type TemplateValue } from '@gluonjs/core';

export function ArrowIcon(): TemplateValue {
  return svg`<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h13M14 7l5 5-5 5"></path>
  </svg>`;
}

export function SearchIcon(): TemplateValue {
  return svg`<svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10.8" cy="10.8" r="6.8"></circle>
    <path d="m16 16 4.2 4.2"></path>
  </svg>`;
}

export function MenuIcon(): TemplateValue {
  return svg`<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 7h18M3 12h18M3 17h18"></path>
  </svg>`;
}

export function CloseIcon(): TemplateValue {
  return svg`<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 5 14 14M19 5 5 19"></path>
  </svg>`;
}

export function MinusIcon(): TemplateValue {
  return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path></svg>`;
}

export function PlusIcon(): TemplateValue {
  return svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"></path></svg>`;
}
