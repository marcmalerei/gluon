import { afterEach, expect, test } from 'vitest';
import { adoptStyles, unadoptStyles } from '@gluonjs/core';
import { nextTick } from '@gluonjs/reactivity';
import { createPlaygroundApplication } from '../examples/playground/src/app.js';
import { defaultProject, encodePlaygroundProject } from '../examples/playground/src/project.js';
import { playgroundStyles } from '../examples/playground/src/styles.js';

let cleanup: (() => void) | undefined;
afterEach(() => { cleanup?.(); cleanup = undefined; });

test('edits, runs, shares, increments, and opens the searchable diagnostic reference', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  adoptStyles(document, playgroundStyles);
  const { app } = createPlaygroundApplication({ hash: '', href: window.location.href });
  app.mount(container);
  cleanup = () => { app.unmount(); container.remove(); unadoptStyles(document, playgroundStyles); history.replaceState(null, '', window.location.pathname); };
  await nextTick();
  await expect.poll(() => container.querySelectorAll('.diagnostic-row').length, { timeout: 5_000 }).toBe(2);
  const preview = container.querySelector('gluon-playground-preview') as HTMLElement;
  await expect.poll(() => preview.shadowRoot?.querySelector('h1')?.textContent, { timeout: 5_000 }).toBe('Count 2');
  (preview.shadowRoot!.querySelector('button') as HTMLButtonElement).click();
  await (preview as any).updateComplete;
  expect(preview.shadowRoot!.querySelector('h1')?.textContent).toBe('Count 3');

  const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
  textarea.value = textarea.value.replace('Count ${count}', 'Executed ${count}');
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
  (findButton(container, 'Run')).click();
  await expect.poll(() => container.querySelector('.toast')?.textContent, { timeout: 5_000 }).toContain('updated');
  expect(preview.shadowRoot!.querySelector('h1')?.textContent).toBe('Executed 2');

  textarea.value = 'export default function Broken( {';
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
  (findButton(container, 'Run')).click();
  await expect.poll(() => container.querySelector('[role="alert"]')?.textContent, { timeout: 5_000 })
    .toContain('GLUON_PLAYGROUND_COMPILE_FAILED');
  expect(preview.shadowRoot!.querySelector('h1')).toBeNull();

  textarea.value = defaultProject.app.replace('Count ${count}', 'Shared ${count}');
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
  (findButton(container, 'Run')).click();
  await expect.poll(() => preview.shadowRoot!.querySelector('h1')?.textContent, { timeout: 5_000 }).toBe('Shared 2');

  (findButton(container, 'Share')).click();
  await nextTick();
  expect(window.location.hash).toMatch(/^#p=/);
  (findButton(container, 'Config')).click();
  await nextTick();
  expect(container.querySelector('.reference-detail h1')?.textContent).toBe('GLUON_TEMPLATE_VOID_CHILDREN');
  const search = container.querySelector('input[type="search"]') as HTMLInputElement;
  search.value = 'disabled';
  search.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await nextTick();
  expect(container.querySelector('.code-list')?.textContent).toContain('GLUON_DEVTOOLS_DISABLED');
  expect(container.querySelector('.reference-detail h1')?.textContent).toBe('GLUON_DEVTOOLS_DISABLED');

  search.value = 'no-such-diagnostic';
  search.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await nextTick();
  expect(container.querySelector('.reference-detail [role="status"]')?.textContent).toContain('No diagnostics match');
});

test('restores and renders a shared project when the preview ref connects', async () => {
  const project = Object.freeze({
    ...defaultProject,
    app: defaultProject.app.replace('Count ${count}', 'Reloaded ${count}'),
  });
  const container = document.createElement('div');
  document.body.append(container);
  adoptStyles(document, playgroundStyles);
  const { app } = createPlaygroundApplication({ hash: `#p=${encodePlaygroundProject(project)}`, href: window.location.href });
  app.mount(container);
  cleanup = () => { app.unmount(); container.remove(); unadoptStyles(document, playgroundStyles); history.replaceState(null, '', window.location.pathname); };
  const preview = container.querySelector('gluon-playground-preview') as HTMLElement;
  await expect.poll(() => preview.shadowRoot?.querySelector('h1')?.textContent, { timeout: 5_000 }).toBe('Reloaded 2');
});

function findButton(root: ParentNode, label: string): HTMLButtonElement {
  const button = [...root.querySelectorAll('button')].find((entry) => entry.textContent?.trim() === label);
  if (!button) throw new Error(`Missing button ${label}`);
  return button;
}
