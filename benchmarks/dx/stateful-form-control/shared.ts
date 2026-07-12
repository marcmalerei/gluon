export interface ProductInput {
  readonly id: string;
  readonly name: string;
  readonly price: number;
}

export interface QuantityChange {
  readonly productId: string;
  readonly quantity: number;
}

export interface QuantityControlPublic extends HTMLElement {
  product: ProductInput;
  value: number;
  required: boolean;
  readonly quantity: number;
  readonly form: HTMLFormElement | null;
  readonly validationMessage: string;
  setQuantity(quantity: number): boolean;
  checkValidity(): boolean;
  focus(options?: FocusOptions): void;
}

export const product: ProductInput = Object.freeze({
  id: 'orbit-lamp',
  name: 'Orbit Lamp',
  price: 249,
});

export const quantityControlCss = `
  :host { display: block; }
  .control { display: grid; gap: 8px; }
  .stepper { display: flex; align-items: center; gap: 8px; }
  button { min-width: 44px; min-height: 44px; }
  output { min-width: 2ch; text-align: center; }
  button:focus-visible { outline: 2px solid #1457d9; outline-offset: 2px; }
`;

export function adoptQuantityStyles(root: ShadowRoot): void {
  if (root.adoptedStyleSheets.length > 0) return;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(quantityControlCss);
  root.adoptedStyleSheets = [sheet];
}

export function appendQuantityContent(element: HTMLElement): void {
  element.append('Orbit Lamp');
  const help = document.createElement('span');
  help.slot = 'help';
  help.textContent = 'Choose one to five.';
  element.append(help);
}
