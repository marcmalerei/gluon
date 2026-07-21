import { afterEach, describe, expect, it } from 'vitest';
import { createApp, html } from '../src/index.js';
import { ProductBadge, ProductPicker } from '@gluonjs/example-component-library';

afterEach(() => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('component-library consumer example', () => {
  it('uses public functional and Custom Element exports in a consumer flow', async () => {
    const documentSheetCount = document.adoptedStyleSheets.length;
    const host = document.createElement('main');
    document.body.append(host);
    const app = createApp(() => html`<section>${ProductBadge('In stock')}<example-product-picker value="2"></example-product-picker></section>`).mount(host);
    const picker = host.querySelector('example-product-picker') as HTMLElement & { value: number; updateComplete: Promise<void> };
    await picker.updateComplete;

    expect(host.textContent).toContain('In stock');
    expect(picker.shadowRoot?.adoptedStyleSheets).toHaveLength(1);
    expect(document.adoptedStyleSheets).toHaveLength(documentSheetCount);
    expect(customElements.get('example-product-picker')).toBe(ProductPicker);
    expect((await import('@gluonjs/example-component-library')).ProductPicker).toBe(ProductPicker);
    const event = new Promise<CustomEvent<{ quantity: number }>>((resolve) => picker.addEventListener('change', resolve as EventListener, { once: true }));
    (picker.shadowRoot?.querySelector('[aria-label="Increase quantity"]') as HTMLButtonElement).click();
    expect((await event).detail).toEqual({ quantity: 3 });
    await picker.updateComplete;
    expect(picker.shadowRoot?.querySelector('output')?.textContent).toBe('3');

    app.unmount();
    expect(host.querySelector('example-product-picker')).toBeNull();
    expect(document.adoptedStyleSheets).toHaveLength(documentSheetCount);
    expect(host.replaceChildren()).toBeUndefined();
  });
});
