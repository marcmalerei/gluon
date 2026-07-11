import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  html,
  repeat,
  render,
  type Key,
} from '../src/index.js';

interface Row {
  readonly id: string;
  readonly label: string;
}

const row = (id: string, label = id.toUpperCase()): Row => ({ id, label });

function keyedView(rows: readonly Row[]) {
  return html`<ul>${repeat(
    rows,
    (item) => item.id,
    (item) => html`<li data-id=${item.id}>${item.label}</li>`,
  )}</ul>`;
}

function listItems(root: Element): HTMLLIElement[] {
  return [...root.querySelectorAll('li')];
}

describe('keyed list renderer conformance', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('preserves keyed DOM identity through every supported list operation', () => {
    const root = document.createElement('div');
    let rows = [row('a'), row('b'), row('c')];
    render(keyedView(rows), root);

    const identities = new Map(
      listItems(root).map((item) => [item.dataset.id!, item]),
    );
    const assertRows = (expected: readonly Row[]): void => {
      expect(listItems(root).map((item) => item.dataset.id)).toEqual(
        expected.map((item) => item.id),
      );
      for (const item of expected) {
        const previous = identities.get(item.id);
        if (previous) expect(root.querySelector(`[data-id="${item.id}"]`)).toBe(previous);
      }
    };

    rows = [...rows, row('d')];
    render(keyedView(rows), root);
    assertRows(rows);
    identities.set('d', root.querySelector('[data-id="d"]') as HTMLLIElement);

    rows = [row('z'), ...rows];
    render(keyedView(rows), root);
    assertRows(rows);
    identities.set('z', root.querySelector('[data-id="z"]') as HTMLLIElement);

    rows = [rows[0]!, rows[1]!, row('m'), ...rows.slice(2)];
    render(keyedView(rows), root);
    assertRows(rows);
    identities.set('m', root.querySelector('[data-id="m"]') as HTMLLIElement);

    rows = rows.filter((item) => item.id !== 'b');
    render(keyedView(rows), root);
    assertRows(rows);

    rows = [...rows].reverse();
    render(keyedView(rows), root);
    assertRows(rows);

    rows = [...rows].sort((left, right) => left.id.localeCompare(right.id));
    render(keyedView(rows), root);
    assertRows(rows);

    rows = [rows[3]!, rows[0]!, rows[4]!, rows[2]!, rows[1]!];
    render(keyedView(rows), root);
    assertRows(rows);
  });

  it('preserves Custom Element instances and their local state across moves', () => {
    const tag = 'gluon-keyed-conformance-item';
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends HTMLElement {
        localState = 0;
      });
    }

    const root = document.createElement('div');
    const view = (rows: readonly Row[]) => html`<section>${repeat(
      rows,
      (item) => item.id,
      (item) => html`
        <gluon-keyed-conformance-item data-id=${item.id}>${item.label}</gluon-keyed-conformance-item>
      `,
    )}</section>`;

    render(view([row('a'), row('b'), row('c')]), root);
    const instance = root.querySelector('[data-id="b"]') as HTMLElement & { localState: number };
    instance.localState = 42;

    render(view([row('c'), row('b', 'Bee'), row('a')]), root);

    const moved = root.querySelector('[data-id="b"]') as HTMLElement & { localState: number };
    expect(moved).toBe(instance);
    expect(moved.localState).toBe(42);
    expect(moved.textContent?.trim()).toBe('Bee');
  });

  it('moves only displaced keyed groups around the longest stable run', () => {
    const root = document.createElement('div');
    const view = (ids: readonly string[]) => html`<ol>${repeat(
      ids,
      (id) => id,
      (id) => html`<li data-id=${id}>${id}</li><li data-detail=${id}>detail</li>`,
    )}</ol>`;
    const ids = ['a', 'b', 'c', 'd', 'e'];
    render(view(ids), root);

    const list = root.querySelector('ol')!;
    const identities = new Map(
      [...list.children].map((item) => [
        item.getAttribute('data-id') ?? `detail:${item.getAttribute('data-detail')}`,
        item,
      ]),
    );
    const insertBefore = vi.spyOn(list, 'insertBefore');

    render(view([...ids.slice(2), ...ids.slice(0, 2)]), root);

    expect(insertBefore).toHaveBeenCalledTimes(4);
    expect([...list.querySelectorAll('[data-id]')].map((item) => item.getAttribute('data-id'))).toEqual([
      'c', 'd', 'e', 'a', 'b',
    ]);
    for (const [key, item] of identities) {
      const selector = key.startsWith('detail:')
        ? `[data-detail="${key.slice(7)}"]`
        : `[data-id="${key}"]`;
      expect(list.querySelector(selector)).toBe(item);
    }
  });

  it('inserts only the new keyed groups for a bounded replacement window', () => {
    const root = document.createElement('div');
    const ids = Array.from({ length: 10 }, (_, index) => String(index));
    const view = (values: readonly string[]) => html`<ol>${repeat(
      values,
      (id) => id,
      (id) => html`<li data-id=${id}>${id}</li>`,
    )}</ol>`;
    render(view(ids), root);

    const list = root.querySelector('ol')!;
    const survivors = new Map(
      [...list.children].slice(2).map((item) => [item.getAttribute('data-id'), item]),
    );
    const insertBefore = vi.spyOn(list, 'insertBefore');

    render(view([...ids.slice(2), 'new-a', 'new-b']), root);

    expect(insertBefore).toHaveBeenCalledTimes(2);
    expect([...list.children].map((item) => item.getAttribute('data-id'))).toEqual([
      ...ids.slice(2),
      'new-a',
      'new-b',
    ]);
    for (const [id, item] of survivors) {
      expect(list.querySelector(`[data-id="${id}"]`)).toBe(item);
    }
  });

  it('cleans a removed keyed child exactly once without cleaning moved survivors', () => {
    const root = document.createElement('div');
    const firstRef = vi.fn<(element: Element | undefined) => void>();
    const secondRef = vi.fn<(element: Element | undefined) => void>();
    const click = vi.fn();
    const refs = new Map([
      ['a', firstRef],
      ['b', secondRef],
    ]);
    const view = (ids: readonly string[]) => html`<div>${repeat(
      ids,
      (id) => id,
      (id) => html`<button ...=${{ ref: refs.get(id), onClick: click }}>${id}</button>`,
    )}</div>`;

    render(view(['a', 'b']), root);
    const removed = root.querySelectorAll('button')[1] as HTMLButtonElement;

    render(view(['b', 'a']), root);
    expect(firstRef).toHaveBeenCalledTimes(1);
    expect(secondRef).toHaveBeenCalledTimes(1);
    removed.click();

    render(view(['a']), root);
    render(view(['a']), root);
    removed.click();

    expect(firstRef).toHaveBeenCalledTimes(1);
    expect(secondRef).toHaveBeenCalledTimes(2);
    expect(secondRef).toHaveBeenLastCalledWith(undefined);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate and missing keys before the current DOM is changed', () => {
    const root = document.createElement('div');
    render(keyedView([row('a'), row('b')]), root);
    const original = root.querySelector('[data-id="a"]');

    expect(() => render(keyedView([row('a'), row('a')]), root)).toThrow(
      'repeat() received the duplicate key "a" at index 1.',
    );
    expect(root.querySelector('[data-id="a"]')).toBe(original);
    expect(listItems(root)).toHaveLength(2);

    const missingView = () => html`<ul>${repeat(
      [row('a')],
      () => undefined as unknown as Key,
      (item) => html`<li>${item.label}</li>`,
    )}</ul>`;
    expect(() => render(missingView(), root)).toThrow(
      'repeat() received a missing key at index 0.',
    );
    expect(root.querySelector('[data-id="a"]')).toBe(original);
    expect(listItems(root)).toHaveLength(2);
  });

  it('treats a changed key as removal plus insertion', () => {
    const root = document.createElement('div');
    const ref = vi.fn<(element: Element | undefined) => void>();
    const view = (key: string) => html`<div>${repeat(
      [{ key }],
      (item) => item.key,
      () => html`<span ...=${{ ref }}>state</span>`,
    )}</div>`;

    render(view('stable'), root);
    const original = root.querySelector('span');
    render(view('changed'), root);

    expect(root.querySelector('span')).not.toBe(original);
    expect(ref.mock.calls).toEqual([
      [original],
      [undefined],
      [root.querySelector('span')],
    ]);
  });

  it('returns a validated immutable reconciliation plan', () => {
    const result = repeat(
      [row('a')],
      (item) => item.id,
      (item) => html`<span>${item.label}</span>`,
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
    expect(Object.isFrozen(result.items[0])).toBe(true);
  });

  it('updates keyed primitive and nested repeat children without wrapper bindings', () => {
    const root = document.createElement('div');
    const primitiveView = (rows: readonly Row[]) => html`<div>${repeat(
      rows,
      (item) => item.id,
      (item) => item.label,
    )}</div>`;

    render(primitiveView([row('a', 'A')]), root);
    render(primitiveView([row('a', 'B')]), root);
    expect(root.textContent).toBe('B');

    const nestedView = (rows: readonly Row[]) => html`<div>${repeat(
      [{ id: 'group', rows }],
      (group) => group.id,
      (group) => repeat(group.rows, (item) => item.id, (item) => item.label),
    )}</div>`;
    render(nestedView([row('x', 'X')]), root);
    render(nestedView([row('x', 'Y')]), root);
    expect(root.textContent).toBe('Y');
  });

  it('keeps ordinary arrays index-based and reuses the instance at each position', () => {
    const root = document.createElement('div');
    const view = (rows: readonly Row[]) => html`<ul>${rows.map(
      (item) => html`<li data-id=${item.id}>${item.label}</li>`,
    )}</ul>`;

    render(view([row('a'), row('b'), row('c')]), root);
    const positions = listItems(root);
    render(view([row('c'), row('b'), row('a')]), root);

    expect(listItems(root)[0]).toBe(positions[0]);
    expect(listItems(root)[1]).toBe(positions[1]);
    expect(listItems(root)[2]).toBe(positions[2]);
    expect(listItems(root).map((item) => item.dataset.id)).toEqual(['c', 'b', 'a']);
  });
});
