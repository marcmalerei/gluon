import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';
import { HoverCard, q, Tooltip } from '@gluonjs/quarks';

const meta = {
  title: 'Quarks/Tooltip and HoverCard',
  render: () => html`
    <p>
      ${Tooltip({ id: 'story-tooltip', trigger: (attributes) => q.button({ ...attributes, children: 'Tooltip' }), content: 'Short, non-interactive help.' })}
      ${HoverCard({ id: 'story-hover-card', label: 'More information', trigger: (attributes) => q.button({ ...attributes, children: 'Hover card' }), content: html`<p tabindex="0">A focusable explanation that can contain links or controls.</p>` })}
    </p>
  `,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {};
