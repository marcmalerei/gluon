import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';
import { OneTimePasswordField } from '@gluonjs/molecules';

type OneTimePasswordFieldStoryArgs = {
  label: string;
  length: number;
  mode: 'numeric' | 'alphanumeric';
  value: string;
  helper?: string;
  error?: string;
};

const meta = {
  title: 'Molecules/One-time password field',
  render: (args) => html`
    <div style="display:grid;gap:1.5rem;max-inline-size:40rem;padding:1.5rem">
      ${OneTimePasswordField({ id: 'storybook-otp', label: args.label, length: args.length, mode: args.mode, value: args.value, helper: args.helper, error: args.error, name: 'storybook-code' })}
    </div>
  `,
  args: { label: 'One-time code', length: 6, mode: 'numeric' as const, value: '123', helper: 'Enter the code from your device.', error: undefined },
  argTypes: {
    label: { control: 'text' },
    length: { control: { type: 'number', min: 1, max: 12, step: 1 } },
    mode: { control: 'select', options: ['numeric', 'alphanumeric'] },
    value: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
  },
} satisfies Meta<OneTimePasswordFieldStoryArgs>;

export default meta;
type Story = StoryObj<OneTimePasswordFieldStoryArgs>;
export const Default: Story = {};
export const Alphanumeric: Story = { args: { mode: 'alphanumeric', value: 'A1b', helper: 'Letters and numbers are accepted.' } };
export const Error: Story = { args: { error: 'Enter the complete code.', helper: undefined } };
export const NarrowLongLabel: Story = { args: { label: 'One-time code for the current device and sign-in session', length: 8, value: 'A1B2', mode: 'alphanumeric' } };
