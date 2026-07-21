import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { ProductBadge } from '@gluonjs/example-component-library';
import { render } from '@gluonjs/core';
const meta = { title: 'Component library/Product picker', render: (args) => { const root = document.createElement('section'); root.setAttribute('aria-label', 'Product picker story'); root.innerHTML = '<example-product-picker value="1"></example-product-picker>'; const badge = document.createElement('p'); root.prepend(badge); render(ProductBadge(String(args.label)), badge); return root; }, args: { label: 'In stock' }, argTypes: { label: { control: 'text' } } } satisfies Meta<{ label: string }>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { play: async ({ canvasElement }) => { const increment = canvasElement.querySelector<HTMLButtonElement>('[aria-label="Increase quantity"]'); increment?.click(); if (canvasElement.querySelector('output')?.textContent !== '2') throw new Error('Product picker did not update its public interaction.'); } };
