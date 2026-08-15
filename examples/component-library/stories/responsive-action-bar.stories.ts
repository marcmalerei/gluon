import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { createComponentStyleDependency, css, html } from '@gluonjs/core';
import { Button } from '@gluonjs/atoms';
import { ResponsiveActionBar } from '@gluonjs/molecules';

const storyStyles = css`
  .action-bar-story { display: grid; box-sizing: border-box; inline-size: 100%; max-inline-size: 100%; gap: 1rem; min-block-size: 18rem; padding: 1rem; background: white; color: #101010; }
  .action-bar-story > div { box-sizing: border-box; min-inline-size: 0; max-inline-size: 100%; min-block-size: 10rem; padding: 1rem; border: 1px solid #d8d8d8; }
`;
const storyStyleDependency = createComponentStyleDependency({ id: 'example-story-responsive-action-bar', sheet: storyStyles, layer: 'organism', order: 102 });

const meta = {
  title: 'Molecules/Responsive action bar',
  render: (args) => html`
    <section class="action-bar-story" data-responsive-action-bar-story>
      <div><p>Focused-input-safe normal-flow composition.</p><input aria-label="Task field" value="Example"></div>
      ${ResponsiveActionBar({
        summary: args.summary,
        status: args.status,
        state: args.state,
        compactControl: Button({ children: 'Details', variant: 'ghost' }),
        primaryAction: Button({ children: args.action, disabled: args.state === 'disabled' || args.state === 'loading' }),
      })}
    </section>
  `.withStyleDependencies([storyStyleDependency]),
  args: { summary: 'Ready to continue', status: 'All fields are valid', action: 'Continue', state: 'ready' },
  argTypes: { state: { control: 'select', options: ['ready', 'loading', 'disabled', 'error'] }, summary: { control: 'text' }, status: { control: 'text' }, action: { control: 'text' } },
} satisfies Meta<{ summary: string; status: string; action: string; state: 'ready' | 'loading' | 'disabled' | 'error' }>;

export default meta;
type Story = StoryObj<{ summary: string; status: string; action: string; state: 'ready' | 'loading' | 'disabled' | 'error' }>;
export const Default: Story = {};
export const Ready: Story = {};
export const Loading: Story = { args: { state: 'loading', status: 'Saving…' } };
export const Disabled: Story = { args: { state: 'disabled', status: 'Unavailable' } };
export const Error: Story = { args: { state: 'error', status: 'Please fix the highlighted field.' } };
export const LongLabel: Story = { args: { summary: 'A deliberately long summary that must wrap without hiding the focused field.', action: 'Continue to the next step' } };
export const Zoom200: Story = { name: '200% zoom', args: { summary: 'Long label at 200% text zoom', action: 'Continue to the next step' }, parameters: { viewport: { defaultViewport: 'mobile1' } } };
export const SafeArea: Story = { name: 'safe-area contract', args: { summary: 'Safe-area padded action', status: 'Safe-area padding is application/device dependent' } };
export const FocusedInput: Story = { name: 'focused input', play: async ({ canvasElement }) => { canvasElement.querySelector<HTMLInputElement>('input')?.focus(); } };

export const parameters = { a11y: { test: 'error' }, controls: { expanded: true } };
