import type { ComponentLibraryManifest } from '@gluonjs/quarks';

export const componentLibraryManifest = {
  schemaVersion: 1,
  name: '@gluonjs/example-component-library',
  entries: [{
    id: 'product-badge',
    module: '@gluonjs/example-component-library/product-badge',
    exportName: 'ProductBadge',
    layer: 'atom',
    styles: ['example-product-badge'],
    dependencies: [],
    accessibility: 'Renders a short textual availability status.',
    storyId: 'component-library-product-picker--default',
  }, {
    id: 'product-picker',
    module: '@gluonjs/example-component-library/product-picker',
    exportName: 'ProductPicker',
    layer: 'element',
    tag: 'example-product-picker',
    styles: [],
    dependencies: [],
    accessibility: 'Uses labelled native buttons and reports quantity changes.',
    storyId: 'component-library-product-picker--default',
  }],
} as const satisfies ComponentLibraryManifest;
