import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { createComponentStyleDependency, css, html } from '@gluonjs/core';
import { NavigationMenu } from '@gluonjs/molecules';

const storyStyles = css`
  #storybook-root { color: #101010; font: 16px/1.5 system-ui, sans-serif; }
  .navigation-menu-story { inline-size: min(100%, 42rem); padding: 1.5rem; background: #fff; }
  .navigation-menu-story h2 { margin-block-start: 0; }
`;
const storyStyleDependency = createComponentStyleDependency({ id: 'example-story-navigation-menu', sheet: storyStyles, layer: 'molecule', order: 102 });

const meta = {
  title: 'Component library/Navigation menu',
  render: (args) => html`
    <section class="navigation-menu-story">
      <h2>Product navigation</h2>
      ${NavigationMenu({ label: 'Product navigation', open: ['story-shop'], items: [
        { id: 'story-shop', label: args.shopLabel, href: '/shop', active: true, children: [
          { id: 'story-new', label: 'New arrivals', href: '/shop?sort=new' },
          { id: 'story-objects', label: 'All objects', href: '/shop' },
        ] },
        { id: 'story-journal', label: 'Journal', href: '#journal' },
      ] })}
    </section>
  `.withStyleDependencies([storyStyleDependency]),
  args: { shopLabel: 'Shop' },
  argTypes: { shopLabel: { control: 'text' } },
} satisfies Meta<{ shopLabel: string }>;

export default meta;
type Story = StoryObj<{ shopLabel: string }>;
export const OpenHierarchy: Story = {};
export const LongLabelsAtTwoHundredPercent: Story = { args: { shopLabel: 'Shop all objects and new arrivals' } };
