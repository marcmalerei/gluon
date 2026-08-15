import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';
import { SearchField, SearchResults } from '@gluonjs/molecules';
import { q } from '@gluonjs/quarks';

const meta = {
  title: 'Molecules/Search compositions',
  render: (args) => html`
    <div style="display:grid;gap:1.5rem;max-inline-size:40rem;padding:1.5rem">
      ${SearchField({ id: 'storybook-search', label: args.label, query: args.query, submitLabel: 'Find' })}
      ${SearchResults({ id: 'storybook-results', heading: 'Results', state: args.state, groups: [{ id: 'products', heading: 'Products', count: 2, description: 'Caller-owned result content', children: [q.li({ children: q.a({ href: '#cobalt', children: 'Cobalt cable' }) }), q.li({ children: q.a({ href: '#graphite', children: 'Graphite cable' }) })] }] })}
    </div>
  `,
  args: { label: 'Search products', query: 'cable', state: 'ready' as const },
  argTypes: { label: { control: 'text' }, query: { control: 'text' }, state: { control: 'select', options: ['ready', 'loading', 'empty', 'partial-failure', 'disabled'] } },
} satisfies Meta<{ label: string; query: string; state: 'ready' | 'loading' | 'empty' | 'partial-failure' | 'disabled' }>;

export default meta;
type Story = StoryObj<{ label: string; query: string; state: 'ready' | 'loading' | 'empty' | 'partial-failure' | 'disabled' }>;
export const Ready: Story = {};
export const Loading: Story = { args: { state: 'loading' } };
export const Empty: Story = { args: { state: 'empty' } };
export const PartialFailure: Story = { args: { state: 'partial-failure' } };
export const Disabled: Story = { args: { state: 'disabled' } };
export const ResponsiveLongContent: Story = { args: { label: 'Search products with a deliberately long accessible label', query: 'a very long query that wraps safely', state: 'partial-failure' } };
