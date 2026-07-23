/**
 * Storybook framework preset selecting Vite and the Gluon renderer.
 *
 * @internal
 */
export const core = {
  builder: import.meta.resolve('@storybook/builder-vite'),
  renderer: import.meta.resolve('@gluonjs/gluon-components-vite/renderer-preset'),
};
