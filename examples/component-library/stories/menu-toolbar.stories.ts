import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { DropdownMenu, Menubar, Toolbar } from '@gluonjs/molecules';
import { html } from '@gluonjs/core';

const meta = {
  title: 'Molecules/Menu and toolbar',
  render: () => html`
    <div style="display:grid;gap:1rem;max-inline-size:28rem">
      ${Toolbar({ label: 'Actions', children: html`<button type="button">Bag</button><button type="button">Search</button>` })}
      ${Menubar({ label: 'Main navigation', items: [{ id: 'shop', label: 'Shop', href: '/shop' }, { id: 'account', label: 'Account', disabled: true }] })}
      ${DropdownMenu({ label: 'Bag actions', open: true, items: [{ id: 'save', label: 'Save for later', kind: 'checkbox', checked: true }, { id: 'remove', label: 'Remove' }] })}
    </div>
  `,
} satisfies Meta;

export default meta;
export const Default: StoryObj = {};
