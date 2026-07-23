import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import {
  createComponentStyleDependency,
  css,
  html,
} from '@gluonjs/core';
import {
  ProductBadge,
  productBadgeStyles,
} from '@gluonjs/example-component-library/product-badge';
import { ProductPicker } from '@gluonjs/example-component-library/product-picker';

const storyStyles = css`
  #storybook-root { display: block; color: #101010; font: 16px/1.5 system-ui, sans-serif; }
  section { inline-size: 28rem; padding: 2rem; border: 1px solid #d8d8d8; }
  h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
  p { margin: 0 0 1rem; }
`;
const storyStyleDependency = createComponentStyleDependency({
  id: 'example-story-product-picker',
  sheet: storyStyles,
  layer: 'organism',
  order: 100,
});

const meta = {
  title: 'Component library/Product picker',
  render: (args) => {
    if (customElements.get('example-product-picker') !== ProductPicker) {
      throw new Error('The public ProductPicker export must own its registered tag.');
    }
    return html`
      <section aria-labelledby="product-picker-story-heading">
        <h2 id="product-picker-story-heading">Product quantity</h2>
        <p>${ProductBadge(String(args.label))}</p>
        <example-product-picker value="1"></example-product-picker>
      </section>
    `.withStyleDependencies([
      storyStyleDependency,
      createComponentStyleDependency({
        id: 'example-product-badge-story',
        sheet: productBadgeStyles,
        layer: 'atom',
        order: 100,
      }),
    ]);
  },
  args: { label: 'In stock' },
  argTypes: { label: { control: 'text' } },
} satisfies Meta<{ label: string }>;

export default meta;
type Story = StoryObj<{ label: string }>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const pickerRoot = canvasElement.querySelector('example-product-picker')?.shadowRoot;
    const increment = pickerRoot?.querySelector<HTMLButtonElement>('[aria-label="Increase quantity"]');
    const output = pickerRoot?.querySelector('output');
    if (!increment || !output) throw new Error('Product picker story did not render its public controls.');
    increment.click();
    await waitFor(() => output.textContent === '2');
  },
};

async function waitFor(assertion: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!assertion()) {
    if (Date.now() >= deadline) throw new Error('Product picker story interaction timed out.');
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
  }
}
