import assert from 'node:assert/strict';
import test from 'node:test';
import { DropdownMenu, Menubar, Toolbar } from '../packages/molecules/dist/index.js';
import { renderToString } from '../packages/ssr/dist/index.js';

test('serializes deterministic menu relationships and controlled state', async () => {
  const closed = await renderToString(DropdownMenu({
    id: 'ssr-actions',
    label: 'Actions',
    trigger: 'Actions',
    open: false,
    onOpenChange: () => {},
    items: [{ id: 'view', label: 'View', expanded: false, submenu: [{ id: 'details', label: 'Details' }] }],
  }));
  const repeated = await renderToString(DropdownMenu({
    id: 'ssr-actions',
    label: 'Actions',
    trigger: 'Actions',
    open: false,
    onOpenChange: () => {},
    items: [{ id: 'view', label: 'View', expanded: false, submenu: [{ id: 'details', label: 'Details' }] }],
  }));
  assert.equal(repeated, closed);
  assert.match(closed, /id="ssr-actions-trigger"/);
  assert.match(closed, /aria-controls="ssr-actions-menu"/);
  assert.match(closed, /aria-expanded="false"/);
  assert.match(closed, /id="ssr-actions-menu-view"/);
  assert.match(closed, /hidden/);
});

test('serializes native menubar links and toolbar controls', async () => {
  const markup = await renderToString([
    Menubar({ id: 'ssr-menubar', label: 'Main', items: [{ id: 'help', label: 'Help', href: '/help' }] }),
    Toolbar({ id: 'ssr-toolbar', label: 'Actions', items: [{ id: 'save', label: 'Save' }, { id: 'docs', kind: 'link', label: 'Docs', href: '/docs' }] }),
  ]);
  assert.match(markup, /role="menubar"/);
  assert.match(markup, /href="\/help"/);
  assert.match(markup, /role="toolbar"/);
  assert.match(markup, /<button/);
  assert.match(markup, /href="\/docs"/);
});
