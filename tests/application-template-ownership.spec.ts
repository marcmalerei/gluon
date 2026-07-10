import { expect, it } from 'vitest';
import { createApp, html, nothing, repeat } from '../src/index.js';
import { nextTick, reactive } from '@gluonjs/reactivity';

it('tracks top-level conditional nodes across application renders', async () => {
  const state = reactive({ open: false, query: '' });
  const items = ['lamp', 'tote', 'tray', 'stool'];
  let renders = 0;
  const panel = () => html`
    <header>
      <button @click=${() => { state.open = false; }}>Close</button>
    </header>
    ${state.open ? html`<section>${repeat(
      items.filter((item) => item.includes(state.query)),
      (item) => item,
      (item) => html`<a href=${`/${item}`}>${item}</a>`,
    )}</section>` : nothing}
  `;
  const app = createApp(() => {
    renders += 1;
    return html`${panel()}<main>Body</main>`;
  });
  const root = document.createElement('div');
  document.body.append(root);
  app.mount(root);

  state.open = true;
  await nextTick();
  expect(root.querySelector('section')).not.toBeNull();

  state.query = 'lamp';
  await nextTick();
  expect(root.querySelector('section')?.textContent).toBe('lamp');

  root.querySelector<HTMLButtonElement>('button')!.click();
  await nextTick();
  expect(root.querySelector('section')).toBeNull();
  expect(renders).toBe(4);
  app.unmount();
});
