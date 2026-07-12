import { compose, html, type TemplateResult } from '@gluonjs/core';

interface ShellProps {
  readonly heading: string;
  readonly actions: TemplateResult;
  readonly dialog: TemplateResult;
  readonly children: TemplateResult;
}

interface PanelProps {
  readonly title: string;
  readonly onSubmit: (event: Event) => void;
  readonly children: TemplateResult;
}

function Shell({ heading, actions, dialog, children }: ShellProps): TemplateResult {
  return html`<main><h1>${heading}</h1>${children}${actions}${dialog}</main>`;
}

function Panel({ title, onSubmit, children }: PanelProps): TemplateResult {
  return html`<form id="checkout" @submit=${onSubmit}><h2>${title}</h2>${children}</form>`;
}

export const checkout = compose(Shell, {
  heading: 'Checkout',
  actions: html`<button form="checkout">Place order</button>`,
  dialog: html`<dialog open aria-labelledby="confirm-title"><h2 id="confirm-title">Confirm order</h2><button>Close</button></dialog>`,
})`
  ${compose(Panel, {
    title: 'Delivery',
    onSubmit: (event) => event.preventDefault(),
  })`<label>Email <input name="email" type="email" required></label>`}
`;
