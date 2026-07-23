import { fileURLToPath } from 'node:url';

/**
 * Adds Gluon's preview renderer to Storybook's existing annotations.
 *
 * @internal
 */
export function previewAnnotations(input: readonly string[] = []): string[] {
  return [
    ...input,
    fileURLToPath(import.meta.resolve('@gluonjs/gluon-components-vite/entry-preview')),
  ];
}
