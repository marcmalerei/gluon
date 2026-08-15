import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { DropdownMenu, Menubar, Toolbar } from '@gluonjs/molecules';
import { html } from '@gluonjs/core';

const meta = {
  title: 'Molecules/Menu and toolbar',
  render: () => html`
    <div data-menu-toolbar-story>
      ${Toolbar({ id: 'story-actions', label: 'Actions', items: [{ id: 'bag', label: 'Bag' }, { id: 'search', label: 'Search' }] })}
      ${Menubar({ id: 'story-menubar', label: 'Main navigation', items: [{ id: 'shop', label: 'Shop', href: '/shop' }, { id: 'account', label: 'Account', disabled: true }] })}
      ${DropdownMenu({ id: 'story-bag-menu', label: 'Bag actions', trigger: 'Bag actions', open: true, onOpenChange: () => {}, items: [{ id: 'save', label: 'Save for later', kind: 'checkbox', checked: true }, { id: 'remove', label: 'Remove' }] })}
    </div>
  `,
} satisfies Meta;

export default meta;
export const Default: StoryObj = {};
