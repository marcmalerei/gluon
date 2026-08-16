import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';
import { PasswordToggleField } from '@gluonjs/molecules';

const meta = {
  title: 'Component library/Password toggle field',
  render: (args) => {
    let visible = args.visible;
    return html`<div data-password-toggle-story style="box-sizing:border-box;display:grid;gap:1rem;inline-size:min(100%, 24rem);padding:1rem;direction:${args.direction}">${PasswordToggleField({
      id: 'storybook-password',
      label: args.label,
      value: 'example-password',
      visible,
      showLabel: args.showLabel,
      hideLabel: args.hideLabel,
      helper: args.helper,
      error: args.error || undefined,
      onVisibleChange: (next) => { visible = next; },
    })}</div>`;
  },
  args: {
    label: 'Password',
    showLabel: 'Show password',
    hideLabel: 'Hide password',
    helper: 'Localized labels and native validation remain caller-owned.',
    error: '',
    visible: false,
    direction: 'ltr' as const,
  },
  argTypes: {
    direction: { control: 'inline-radio', options: ['ltr', 'rtl'] },
    error: { control: 'text' },
    visible: { control: 'boolean' },
  },
} satisfies Meta<{ label: string; showLabel: string; hideLabel: string; helper: string; error: string; visible: boolean; direction: 'ltr' | 'rtl' }>;

export default meta;
export const StatesAndResponsive: StoryObj<typeof meta> = {};
