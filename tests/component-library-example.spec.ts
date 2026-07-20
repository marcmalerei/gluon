import { afterEach, describe, expect, it } from 'vitest';
import { createApp, html } from '../src/index.js';
import { ProductBadge } from '../examples/component-library/src/library.js';

afterEach(() => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('component-library consumer example', () => {
  it('uses public functional and Custom Element exports in a consumer flow', async () => {
    const host = document.createElement('main');
    document.body.append(host);
    const app = createApp(() => html`<section>${ProductBadge('In stock')}<example-product-picker value="2"></example-product-picker></section>`).mount(host);
    const picker = host.querySelector('example-product-picker') as HTMLElement & { value: number; updateComplete: Promise<void> };
    await picker.updateComplete;

    expect(host.textContent).toContain('In stock');
    expect(picker.shadowRoot?.adoptedStyleSheets).toHaveLength(1);
    const event = new Promise<CustomEvent<{ quantity: number }>>((resolve) => picker.addEventListener('change', resolve as EventListener, { once: true }));
    (picker.shadowRoot?.querySelector('[aria-label="Increase quantity"]') as HTMLButtonElement).click();
    expect((await event).detail).toEqual({ quantity: 3 });
    await picker.updateComplete;
    expect(picker.shadowRoot?.querySelector('output')?.textContent).toBe('3');

    app.unmount();
    expect(host.replaceChildren()).toBeUndefined();
  });
});
