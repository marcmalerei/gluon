import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from '@gluonjs/reactivity';
import { createVirtualizerExample } from '../examples/virtualizer/src/app.js';
import { virtualizerExampleStyles } from '../examples/virtualizer/src/styles.js';

async function settle(): Promise<void> {
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await nextTick();
}

afterEach(() => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('runnable virtualizer example', () => {
  it('renders and operates a bounded 500-item inventory through public APIs', async () => {
    document.adoptedStyleSheets = [virtualizerExampleStyles];
    const { app, state } = createVirtualizerExample();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    await settle();

    const viewport = root.querySelector<HTMLElement>('.inventory-viewport')!;
    expect(viewport.getAttribute('role')).toBe('grid');
    expect(viewport.getAttribute('aria-label')).toBe('GLUON GOODS inventory');
    expect(root.textContent).toContain('500 logical items');
    expect(root.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('[role="gridcell"]').length).toBeLessThan(500);
    expect(root.querySelector('[aria-posinset="1"]')?.textContent).toContain('GG-0001');

    const controls = [...root.querySelectorAll<HTMLButtonElement>('.controls button')];
    controls.find((button) => button.textContent?.includes('Use list'))!.click();
    await settle();
    expect(root.querySelector('.inventory-viewport')?.getAttribute('role')).toBe('list');
    expect(root.querySelectorAll('[role="listitem"]').length).toBeLessThan(500);

    controls.find((button) => button.textContent?.includes('Reverse'))!.click();
    await settle();
    expect(state.items[0]?.id).toBe('GG-0500');
    expect(root.querySelector('[aria-posinset="1"]')?.textContent).toContain('GG-0500');

    controls.find((button) => button.textContent?.includes('Remove last'))!.click();
    await settle();
    expect(state.items).toHaveLength(499);
    expect(root.textContent).toContain('499 logical items');

    viewport.scrollTop = viewport.scrollHeight / 2;
    viewport.dispatchEvent(new Event('scroll'));
    await settle();
    expect(root.querySelector('[aria-posinset="1"]')).toBeNull();

    app.unmount();
    expect(root.childNodes).toHaveLength(0);
  });
});
