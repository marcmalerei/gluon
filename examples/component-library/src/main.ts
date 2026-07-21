import { createApp, html, type TemplateResult } from '@gluonjs/core';
import { createComponentLibraryLoader, type ComponentLibraryEntry } from '@gluonjs/quarks';
import { ref } from '@gluonjs/reactivity';
import { componentLibraryManifest } from '@gluonjs/example-component-library/manifest';

const moduleLoaders: Readonly<Record<string, () => Promise<Record<string, unknown>>>> = {
  '@gluonjs/example-component-library/product-badge': () => import('@gluonjs/example-component-library/product-badge'),
  '@gluonjs/example-component-library/product-picker': () => import('@gluonjs/example-component-library/product-picker'),
};
const loadedModules = new Map<string, Record<string, unknown>>();

const loader = createComponentLibraryLoader(componentLibraryManifest, {
  async load(entry: ComponentLibraryEntry) {
    const loadModule = moduleLoaders[entry.module];
    if (!loadModule) throw new RangeError(`No public module resolver for ${entry.module}.`);
    const module = await loadModule();
    loadedModules.set(entry.id, module);
    if (!(entry.exportName in module)) throw new TypeError(`Missing public export ${entry.exportName}.`);
    return module[entry.exportName];
  },
}, {
  styleTarget: document,
  styles: {
    resolve(entry) {
      const module = loadedModules.get(entry.id);
      return entry.styles.map((styleId) => {
        if (styleId === 'example-product-badge' && module?.productBadgeStyles instanceof CSSStyleSheet) return module.productBadgeStyles;
        throw new TypeError(`Missing constructable stylesheet ${styleId}.`);
      });
    },
  },
});

const badgeResult = await loader.load('product-badge');
const ProductBadge = badgeResult.value as (label: string) => TemplateResult;
const pickerLoaded = ref(false);
const pickerStatus = ref(loader.status('product-picker'));

const loadPicker = async (): Promise<void> => {
  pickerStatus.value = 'loading';
  await loader.load('product-picker');
  pickerStatus.value = loader.status('product-picker');
  pickerLoaded.value = true;
};

createApp(() => html`
  <section aria-labelledby="component-library-heading">
    <h1 id="component-library-heading">Packed library consumer</h1>
    <p>${ProductBadge('In stock')}</p>
    <p data-loader-status aria-live="polite">Picker: ${pickerStatus.value}</p>
    <button type="button" @click=${loadPicker}>Load product picker</button>
    ${pickerLoaded.value ? html`<example-product-picker value="1"></example-product-picker>` : ''}
  </section>
`).mount(document.querySelector('#app')!);
