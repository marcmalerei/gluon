import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from '@gluonjs/reactivity';
import { createSignalsExample } from '../examples/signals/src/app.js';
import { signalsExampleStyles } from '../examples/signals/src/styles.js';

async function settle(): Promise<void> {
  await Promise.resolve();
  await nextTick();
}

afterEach(() => {
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('runnable Signals interoperability example', () => {
  it('renders and updates both real external signal implementations', async () => {
    document.adoptedStyleSheets = [signalsExampleStyles];
    const { app } = createSignalsExample();
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    await settle();

    expect(root.textContent).toContain('1 workshop lamp · €48');
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
    buttons[0]!.click();
    buttons[1]!.click();
    await settle();
    expect(root.textContent).toContain('2 workshop lamps · €96');
    expect(root.querySelectorAll('section')).toHaveLength(2);

    app.unmount();
    expect(root.childNodes).toHaveLength(0);
  });
});
