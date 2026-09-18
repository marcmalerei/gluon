<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/gluon-components-vite.png" alt="@gluonjs/gluon-components-vite — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

The official Storybook renderer for Gluon accepts native `TemplateResult`
stories, renders them with `@gluonjs/core`, and releases renderer-owned DOM,
bindings, and constructable stylesheets when Storybook replaces a story.

## Install

```sh
npm install --save-dev @gluonjs/gluon-components-vite storybook vite
```

Keep `@gluonjs/core` installed in the component library itself.

## Configure Storybook

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@gluonjs/gluon-components-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  framework: '@gluonjs/gluon-components-vite',
};

export default config;
```

## Write a first story

```ts
import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';

const meta = {
  title: 'Shop/Stock label',
  args: { label: 'In stock' },
  render: ({ label }) => html`<strong>${label}</strong>`,
} satisfies Meta<{ label: string }>;

export default meta;
type Story = StoryObj<{ label: string }>;

export const Available: Story = {};
```

The render function must return a Gluon template created by `html` or `svg`.
Return a stable template callsite to let Gluon update bindings and retain DOM
identity when controls change. For component styles, attach official component
style dependencies to the returned template; do not create a wrapper
`ShadowRoot` only to adapt Gluon to another renderer.

Storybook's Vite builder, controls, decorators, loaders, play functions, and
addons remain available. The framework package selects the Vite builder and
registers Gluon's preview annotation automatically.

## Verify SSR hydration

Enable strict SSR-to-browser hydration verification on an individual story:

```ts
import type {
  GluonStoryParameters,
  Meta,
  StoryObj,
} from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';

const meta = {
  title: 'Shop/SSR stock label',
  render: ({ label }) => html`<strong>${label}</strong>`,
} satisfies Meta<{ label: string }>;

export default meta;
type Story = StoryObj<{ label: string }>;

export const Retained: Story = {
  args: { label: 'In stock' },
  parameters: {
    gluon: { ssrHydration: true },
  } satisfies GluonStoryParameters,
};
```

The renderer serializes the template, carries its exact component styles,
materializes Declarative Shadow DOM, and hydrates with `recovery: 'throw'`.
Mismatch recovery is therefore never hidden by a client-side replacement.

For Custom Elements, add `@gluonjs/ssr` to the component-library project and
return an `html` template that interpolates
`renderElement(Component, { properties })`, with all reflected initial
properties explicit. `renderElement()` is required because a literal
custom-element tag does not contain enough information to serialize its
Declarative Shadow DOM. This verifies Gluon's SSR/hydration contract in the
Storybook browser preview; it is not a separate Node-server execution.

## Cleanup contract

`renderToCanvas()` asynchronously returns a teardown that calls Gluon's public `unmount()`.
Story switches therefore release event bindings and exact component stylesheet
claims. A forced remount clears the prior Gluon root before rendering.

## License

MIT License, Copyright © 2026 Marc Malerei.
