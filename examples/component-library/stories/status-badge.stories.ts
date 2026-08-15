import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { createComponentStyleDependency, css, html } from '@gluonjs/core';
import { StatusBadge } from '@gluonjs/atoms';

const storyStyles = css`
  #storybook-root {
    display: block;
    color: #101010;
    font: 16px/1.5 system-ui, sans-serif;
  }

  .status-badge-story {
    display: grid;
    gap: 1rem;
    inline-size: min(100%, 26rem);
    padding: 1.5rem;
    border: 1px solid #d8d8d8;
    background: #fff;
  }

  .status-badge-story section {
    display: grid;
    gap: 0.5rem;
    padding: 1rem;
    border: 1px solid #ececec;
    border-radius: 0.75rem;
    background: #fafafa;
  }

  .status-badge-story h2,
  .status-badge-story p {
    margin: 0;
  }

  .status-badge-story .constrained {
    inline-size: 12rem;
  }
`;

const storyStyleDependency = createComponentStyleDependency({
  id: 'example-story-status-badge',
  sheet: storyStyles,
  layer: 'organism',
  order: 101,
});

const meta = {
  title: 'Component library/Status badge',
  render: (args) => html`
    <section class="status-badge-story" data-status-badge-story aria-labelledby="status-badge-story-heading">
      <h2 id="status-badge-story-heading">Status badges</h2>
      <section data-short-badge>
        <p>Short label in German:</p>
        <p class="constrained">${StatusBadge({
          children: args.shortLabel,
          tone: 'success',
        })}</p>
      </section>
      <section data-long-badge dir="rtl">
        <p>Long bounded token:</p>
        <p class="constrained">${StatusBadge({
          children: args.longLabel,
          tone: 'warning',
        })}</p>
      </section>
    </section>
  `.withStyleDependencies([
    storyStyleDependency,
  ]),
  args: {
    shortLabel: 'Eingeschränkt',
    longLabel: 'status-token-4f8d6e12e9a34a7d9f1b2c6a8d0e4f79',
  },
  argTypes: {
    shortLabel: { control: 'text' },
    longLabel: { control: 'text' },
  },
} satisfies Meta<{ shortLabel: string; longLabel: string }>;

export default meta;
type Story = StoryObj<{ shortLabel: string; longLabel: string }>;

export const Default: Story = {};
