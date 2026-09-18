import type {
  GluonStoryParameters,
  Meta,
  StoryObj,
} from '@gluonjs/gluon-components-vite';
import {
  createComponentStyleDependency,
  css,
  html,
} from '@gluonjs/core';
import {
  ProductPicker,
  type ProductPickerElement,
} from '@gluonjs/example-component-library/product-picker';
import { renderElement } from '@gluonjs/ssr';

const storyStyles = css`
  #storybook-root { color: #101010; font: 16px/1.5 system-ui, sans-serif; }
  .ssr-hydration-story { display: grid; gap: 1rem; max-inline-size: 28rem; padding: 1.5rem; border: 1px solid #d8d8d8; background: #fff; }
  .ssr-hydration-story h2, .ssr-hydration-story p { margin: 0; }
`;

const storyStyleDependency = createComponentStyleDependency({
  id: 'example-story-ssr-hydration',
  sheet: storyStyles,
  layer: 'organism',
  order: 103,
});

const meta = {
  title: 'Component library/SSR hydration',
  render: (args) => html`
    <section class="ssr-hydration-story" aria-labelledby="ssr-hydration-heading">
      <h2 id="ssr-hydration-heading">${args.heading}</h2>
      <p>Server markup is retained before the interactive product picker attaches.</p>
      ${renderElement(ProductPicker, { properties: { value: args.quantity } })}
    </section>
  `.withStyleDependencies([storyStyleDependency]),
  args: { heading: 'Retained product picker', quantity: 1 },
  argTypes: {
    heading: { control: 'text' },
    quantity: { control: { type: 'number', min: 1, max: 10, step: 1 } },
  },
} satisfies Meta<{ heading: string; quantity: number }>;

export default meta;
type Story = StoryObj<{ heading: string; quantity: number }>;

export const Retained: Story = {
  parameters: {
    gluon: { ssrHydration: true },
  } satisfies GluonStoryParameters,
  play: async ({ canvasElement }) => {
    const picker = canvasElement.querySelector<ProductPickerElement>('example-product-picker');
    const increase = picker?.shadowRoot?.querySelector<HTMLButtonElement>('[aria-label="Increase quantity"]');
    const output = picker?.shadowRoot?.querySelector('output');
    if (!picker || !increase || !output) throw new Error('The SSR story did not hydrate the public product picker.');
    increase.click();
    await waitFor(() => output.textContent === '2' && picker.value === 2);
  },
};

async function waitFor(assertion: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!assertion()) {
    if (Date.now() >= deadline) throw new Error('The retained SSR product picker did not become interactive.');
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
  }
}
