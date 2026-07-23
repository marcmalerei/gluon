# Storybook with Gluon

Use `@gluonjs/gluon-components-vite` when a component library needs an isolated
developer catalog. The framework selects Storybook's Vite builder and renders
the same Gluon `TemplateResult` used by the application.

## 1. Install the framework

```sh
npm install --save-dev @gluonjs/gluon-components-vite storybook vite
```

`@gluonjs/core` remains a normal dependency of the component library.

## 2. Select it in `main.ts`

```ts
import type { StorybookConfig } from '@gluonjs/gluon-components-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y'],
  framework: '@gluonjs/gluon-components-vite',
};

export default config;
```

No Web Components renderer, Lit adapter, custom canvas wrapper, or manual
`render()` call belongs in a Gluon story.

## 3. Return a Gluon template

```ts
import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';
import { StockLabel } from './stock-label.js';

const meta = {
  title: 'Catalog/Stock label',
  args: { label: 'In stock' },
  render: ({ label }) => html`
    <p>${StockLabel(label)}</p>
  `,
} satisfies Meta<{ label: string }>;

export default meta;
type Story = StoryObj<{ label: string }>;

export const Available: Story = {};
export const BackOrder: Story = {
  args: { label: 'Ships in two weeks' },
};
```

`html` and `svg` are the valid top-level story values. DOM nodes may still be
interpolated inside a Gluon template when an imperative integration genuinely
owns one, but a bare DOM node is not a Gluon story result.

## Component styles

Official Atoms, Molecules, and Organisms carry their own style dependencies.
For story-only layout, create one stable component style dependency and attach
it to the returned template:

```ts
import {
  createComponentStyleDependency,
  css,
  html,
} from '@gluonjs/core';

const storyLayout = createComponentStyleDependency({
  id: 'story-stock-label',
  sheet: css`
    #storybook-root { padding: 2rem; }
  `,
  layer: 'organism',
  order: 100,
});

const renderStockLabel = (label: string) => html`
  <p>${label}</p>
`.withStyleDependencies([storyLayout]);
```

The renderer claims the sheet through Gluon's normal exact-style ownership and
releases it during teardown.

## Controls, play functions, and addons

Storybook still owns args, controls, decorators, loaders, play functions, and
addons. The renderer owns only the canvas result. A play function queries the
normal `canvasElement`; Shadow DOM queries are needed only when the component
itself intentionally owns a ShadowRoot.

## Lifecycle contract

For each canvas render the framework:

1. evaluates the story;
2. verifies that it returned a Gluon template;
3. calls Gluon's public `render()` on Storybook's canvas;
4. reports page-load completion to Storybook;
5. returns a teardown that calls Gluon's public `unmount()`.

A forced remount clears the previous Gluon root first. Teardown removes
renderer-owned DOM, disconnects bindings, and releases exact stylesheet
claims.

## Runnable reference

`examples/component-library` uses the package for a packed library catalog with
controls, real interactions, loader states, accessibility checks, and committed
visual baselines:

```sh
npm run storybook:component-library
npm run check:storybook:component-library
```

The catalog is developer evidence for a reusable component library. GLUON
GOODS remains the customer-facing application acceptance surface.
