import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { createComponentStyleDependency, css, html } from '@gluonjs/core';
import { ResponsiveDisclosure } from '@gluonjs/molecules';

const storyStyles = css`
  #storybook-root { display: block; color: #101010; font: 16px/1.5 system-ui, sans-serif; }
  .responsive-disclosure-story { display: grid; gap: 1rem; inline-size: min(100%, 34rem); padding: 1.5rem; background: #fff; }
  .responsive-disclosure-story p { margin: 0; }
`;
const storyStyleDependency = createComponentStyleDependency({ id: 'example-story-responsive-disclosure', sheet: storyStyles, layer: 'molecule', order: 101 });

const meta = {
  title: 'Component library/Responsive disclosure',
  render: (args) => html`
    <section class="responsive-disclosure-story" data-responsive-disclosure-story aria-labelledby="responsive-disclosure-heading">
      <h2 id="responsive-disclosure-heading">Responsive filter panel</h2>
      ${ResponsiveDisclosure({ id: 'story-responsive-disclosure', summary: args.summary, compactBreakpoint: args.compactBreakpoint, compactInitialOpen: args.compactInitialOpen, children: html`<p>${args.content}</p>` })}
    </section>
  `.withStyleDependencies([storyStyleDependency]),
  args: { summary: 'Catalog filters', content: 'Availability, size, and finish filters stay in one semantic content tree.', compactBreakpoint: '(max-width: 48rem)', compactInitialOpen: false },
  argTypes: { summary: { control: 'text' }, content: { control: 'text' }, compactBreakpoint: { control: 'text' }, compactInitialOpen: { control: 'boolean' } },
} satisfies Meta<{ summary: string; content: string; compactBreakpoint: string; compactInitialOpen: boolean }>;

export default meta;
type Story = StoryObj<{ summary: string; content: string; compactBreakpoint: string; compactInitialOpen: boolean }>;
export const CompactClosed: Story = {
  args: { compactBreakpoint: '(max-width: 60rem)', compactInitialOpen: false },
};
export const CompactOpen: Story = {
  args: { compactBreakpoint: '(max-width: 60rem)', compactInitialOpen: true },
};
