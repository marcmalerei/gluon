import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { Slider } from '@gluonjs/atoms';
import { createComponentStyleDependency, css, html } from '@gluonjs/core';

const storyStyles = css`
  #storybook-root { color: #101010; font: 16px/1.5 system-ui, sans-serif; }
  .slider-story { display: grid; grid-template-columns: minmax(0, 1fr) 5rem; gap: 1rem; inline-size: min(100%, 32rem); padding: 1.5rem; border: 1px solid #d8d8d8; background: #fff; }
  .slider-story label { display: grid; min-inline-size: 0; gap: 0.375rem; }
  .slider-story .wide { grid-column: 1; }
  .slider-story .vertical { grid-column: 2; grid-row: 1 / span 4; }
  .slider-story output { grid-column: 1 / -1; font-variant-numeric: tabular-nums; }
`;
const storyStyleDependency = createComponentStyleDependency({ id: 'example-story-slider', sheet: storyStyles, layer: 'organism', order: 101 });

const meta = {
  title: 'Component library/Slider',
  render: (args) => {
    let inputs = 0;
    let changes = 0;
    const report = (): void => {
      const output = document.querySelector<HTMLOutputElement>('[data-slider-events]');
      if (output) output.value = `${inputs} input / ${changes} change`;
    };
    return html`<section class="slider-story" aria-label="Slider states">
      <label class="wide">${args.label}${Slider({ min: 0, max: 100, step: 5, value: args.value, orientation: args.orientation, valueText: `${args.value} percent`, onInput: () => { inputs += 1; report(); }, onChange: () => { changes += 1; report(); } })}</label>
      <label class="wide">Uncontrolled${Slider({ defaultValue: 35, min: 0, max: 100, step: 5 })}</label>
      <label class="wide" dir="rtl">Readonly RTL${Slider({ defaultValue: 65, readonly: true })}</label>
      <label class="wide">Disabled${Slider({ defaultValue: 20, disabled: true })}</label>
      <label class="vertical">Vertical${Slider({ defaultValue: 50, orientation: 'vertical' })}</label>
      <output data-slider-events aria-live="polite">0 input / 0 change</output>
    </section>`.withStyleDependencies([storyStyleDependency]);
  },
  args: { label: 'Brightness', value: 50, orientation: 'horizontal' as const },
  argTypes: { label: { control: 'text' }, value: { control: { type: 'number', min: 0, max: 100, step: 5 } }, orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] } },
} satisfies Meta<{ label: string; value: number; orientation: 'horizontal' | 'vertical' }>;

export default meta;
export const StatesAndInteractions: StoryObj<typeof meta> = {};
