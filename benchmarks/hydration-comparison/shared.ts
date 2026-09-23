import { createApp, html as gluonHtml } from '@gluonjs/core';
import { html as litHtml } from 'lit';
import { h as vueH } from 'vue';

export const HYDRATION_ROW_COUNT = 120;

export const hydrationRows = Object.freeze(Array.from({ length: HYDRATION_ROW_COUNT }, (_, id) => ({
  id,
  name: `Object ${String(id + 1).padStart(3, '0')}`,
  category: ['Lighting', 'Carry', 'Workspace', 'Seating'][id % 4],
})));

export interface HydrationState {
  selectedId: number;
}

export type SelectHandler = (id: number) => void;

export function createGluonApplication(state: HydrationState, onSelect: SelectHandler) {
  return createApp(() => gluonView(state, onSelect));
}

export function gluonView(state: HydrationState, onSelect: SelectHandler) {
  return gluonHtml`<main data-hydration-app><h1>Catalog</h1><p data-status>Selected: ${state.selectedId}</p><ul>${hydrationRows.map((row) => gluonHtml`<li data-row=${row.id}><button type="button" @click=${() => onSelect(row.id)}>${row.name}<span>${row.category}</span></button></li>`)}</ul></main>`;
}

export function litView(state: HydrationState, onSelect: SelectHandler) {
  return litHtml`<main data-hydration-app><h1>Catalog</h1><p data-status>Selected: ${state.selectedId}</p><ul>${hydrationRows.map((row) => litHtml`<li data-row=${row.id}><button type="button" @click=${() => onSelect(row.id)}>${row.name}<span>${row.category}</span></button></li>`)}</ul></main>`;
}

export function vueView(state: HydrationState, onSelect: SelectHandler) {
  return vueH('main', { 'data-hydration-app': '' }, [
    vueH('h1', null, 'Catalog'),
    vueH('p', { 'data-status': '' }, `Selected: ${state.selectedId}`),
    vueH('ul', null, hydrationRows.map((row) => vueH('li', { 'data-row': String(row.id), key: row.id }, [
      vueH('button', { type: 'button', onClick: () => onSelect(row.id) }, [
        row.name,
        vueH('span', null, row.category),
      ]),
    ]))),
  ]);
}

export function validateHydratedTree(root: Element, framework: string): void {
  const main = root.querySelector('main[data-hydration-app]');
  const rows = root.querySelectorAll('[data-row]');
  const status = root.querySelector('[data-status]');
  if (!main || rows.length !== HYDRATION_ROW_COUNT || status?.textContent !== 'Selected: 0') {
    throw new Error(`${framework} hydration correctness failed: rows=${rows.length}, status=${status?.textContent ?? 'missing'}.`);
  }
}
