---
title: UI catalog
description: Browse Gluon Atoms, Molecules, and Organisms with variants, states, accessibility contracts, and previews.
---

<script setup lang="ts">
import { onMounted } from 'vue';
import catalog from '../../../../data/ui-catalog.json';

const labels = { atom: 'Atoms', molecule: 'Molecules', organism: 'Organisms' };

onMounted(() => {
  const root = document.querySelector('[data-ui-catalog]');
  const search = root?.querySelector<HTMLInputElement>('[data-ui-catalog-search]');
  const cards = [...(root?.querySelectorAll<HTMLElement>('[data-ui-catalog-card]') ?? [])];
  const filters = [...(root?.querySelectorAll<HTMLElement>('[data-layer-filter]') ?? [])];
  const status = root?.querySelector<HTMLElement>('[data-ui-catalog-status]');
  let activeLayer = 'all';
  const update = () => {
    const query = search?.value.trim().toLowerCase() ?? '';
    let visible = 0;
    for (const card of cards) {
      const matchesLayer = activeLayer === 'all' || card.dataset.layer === activeLayer;
      const matchesSearch = !query || card.dataset.name?.includes(query);
      card.hidden = !(matchesLayer && matchesSearch);
      if (!card.hidden) visible += 1;
    }
    if (status) status.textContent = `${visible} component${visible === 1 ? '' : 's'} shown`;
  };
  search?.addEventListener('input', update);
  for (const filter of filters) filter.addEventListener('click', () => {
    activeLayer = filter.dataset.layerFilter ?? 'all';
    for (const item of filters) item.setAttribute('aria-pressed', String(item === filter));
    update();
  });
  update();
});
</script>

# Gluon UI catalog

This catalog is generated from the public UI package manifests. It is the
user-facing overview of the component library; Storybook remains the developer
verification surface.

<div class="ui-catalog" data-ui-catalog>
  <label class="ui-catalog-search">
    Search components
    <input type="search" placeholder="Button, dialog, table…" data-ui-catalog-search />
  </label>

  <div class="ui-catalog-filters" role="group" aria-label="Filter component layers">
    <button type="button" data-layer-filter="all" aria-pressed="true">All</button>
    <button type="button" data-layer-filter="atom" aria-pressed="false">Atoms</button>
    <button type="button" data-layer-filter="molecule" aria-pressed="false">Molecules</button>
    <button type="button" data-layer-filter="organism" aria-pressed="false">Organisms</button>
  </div>

  <p class="ui-catalog-status" role="status" aria-live="polite" data-ui-catalog-status>{{ catalog.entries.length }} components shown</p>

  <div class="ui-catalog-grid" data-ui-catalog-grid>
    <article v-for="entry in catalog.entries" :key="`${entry.layer}-${entry.name}`" class="ui-catalog-card" data-ui-catalog-card :data-layer="entry.layer" :data-name="entry.name.toLowerCase()" :data-preview-key="entry.preview" :data-variant-count="entry.variants.length" :data-state-count="entry.states.length">
      <header>
        <p class="ui-catalog-kicker">{{ labels[entry.layer] }} · {{ entry.package }}</p>
        <h2 :id="`catalog-${entry.layer}-${entry.name}`"><code>{{ entry.name }}</code></h2>
      </header>
      <div class="ui-catalog-preview" :data-preview="entry.preview ?? 'manifest-only'" :aria-label="`${entry.name} rendered preview`" data-preview-rendered>
        <div class="ui-catalog-preview-body">
          <template v-if="entry.preview === 'button'">
            <button class="ui-sample-button">Add to bag</button>
            <button class="ui-sample-button is-secondary">Save</button>
          </template>
          <template v-else-if="entry.preview === 'badge'">
            <span class="ui-sample-badge is-success">Ready</span>
            <span class="ui-sample-badge is-warning">Review</span>
            <span class="ui-sample-badge is-danger">Blocked</span>
          </template>
          <template v-else-if="entry.preview === 'breadcrumbs'">
            <nav class="ui-sample-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="#catalog">Catalog</a></li><li><a href="#catalog">Lighting</a></li><li aria-current="page">Orbit lamp</li></ol></nav>
          </template>
          <template v-else-if="entry.preview === 'tooltip'">
            <span class="ui-sample-tooltip"><button class="ui-sample-button is-secondary" type="button">Focus for help</button><span role="tooltip">Choose a saved configuration.</span></span>
          </template>
          <template v-else-if="entry.preview === 'stepper'">
            <ol class="ui-sample-stepper"><li class="is-done">Configure</li><li class="is-active" aria-current="step">Review</li><li>Complete</li></ol>
          </template>
          <template v-else-if="entry.preview === 'filter-bar'">
            <form class="ui-sample-filter-bar" @submit.prevent><label class="ui-sample-field">Category<select><option>All products</option><option>Lighting</option></select></label><label class="ui-sample-field">Availability<select><option>In stock</option><option>All</option></select></label><span>2 active filters</span><button class="ui-sample-link" type="button">Clear</button></form>
          </template>
          <template v-else-if="entry.preview === 'data-list'">
            <dl class="ui-sample-data-list"><dt>Availability</dt><dd>In stock</dd><dt>Delivery</dt><dd>2–4 days</dd></dl>
          </template>
          <template v-else-if="entry.preview === 'listbox-field'">
            <label class="ui-sample-field">Delivery method<select><option>Standard · 2–4 days</option><option>Express · next day</option></select></label>
            <span class="ui-sample-variant">Arrow keys · Home · End · disabled options</span>
          </template>
          <template v-else-if="entry.preview === 'heading'">
            <span class="ui-sample-heading">Swiss editorials</span>
          </template>
          <template v-else-if="entry.preview === 'text'">
            <span class="ui-sample-copy">Configure your product with confidence.</span>
          </template>
          <template v-else-if="entry.preview === 'link'">
            <a :href="`#catalog-${entry.layer}-${entry.name}`" class="ui-sample-link">View component details</a>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--badge'">
            <span class="ui-sample-badge">Neutral</span>
            <span class="ui-sample-badge is-info">Info</span>
            <span class="ui-sample-badge is-success">Ready</span>
            <span class="ui-sample-badge is-warning">Review</span>
            <span class="ui-sample-badge is-danger">Blocked</span>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--typography'">
            <h3 v-if="entry.name === 'Heading'" class="ui-sample-heading">Swiss editorials</h3>
            <p v-else class="ui-sample-copy">Supporting copy stays readable and composable.</p>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--link'">
            <a :href="`#catalog-${entry.layer}-${entry.name}`" class="ui-sample-link">Open component reference</a>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--media'">
            <figure class="ui-sample-media is-image" aria-label="Responsive image preview"><span>Product image</span></figure>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--feedback'">
            <meter v-if="entry.name === 'Meter'" class="ui-sample-meter" min="0" max="100" value="72">72%</meter>
            <template v-else-if="entry.name === 'Spinner'"><span class="ui-sample-spinner" aria-label="Loading"></span><span>Loading</span></template>
            <template v-else><span class="ui-sample-skeleton is-wide" aria-hidden="true"></span><span class="ui-sample-skeleton is-short" aria-hidden="true"></span></template>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--file-input'">
            <label class="ui-sample-field">Product photos<input type="file" accept="image/*" multiple /></label>
            <span class="ui-sample-variant">single · multiple · capture</span>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--numeric-input'">
            <label class="ui-sample-field">Quantity<input type="number" min="1" max="9" value="2" /></label>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--date-input'">
            <label class="ui-sample-field">Delivery date<input type="date" value="2026-10-02" /></label>
          </template>
          <template v-else-if="entry.preview === 'foundation-atoms--time-input'">
            <label class="ui-sample-field">Delivery time<input type="time" value="09:00" /></label>
          </template>
          <template v-else-if="['input', 'date-input', 'number-input', 'time-input', 'textarea'].includes(entry.preview)">
            <label class="ui-sample-field">{{ entry.name }}<input :type="entry.preview === 'date-input' ? 'date' : entry.preview === 'time-input' ? 'time' : entry.preview === 'number-input' ? 'number' : 'text'" :value="entry.preview === 'date-input' ? '2026-10-02' : entry.preview === 'time-input' ? '09:00' : entry.preview === 'number-input' ? '2' : 'Example value'" /></label>
          </template>
          <template v-else-if="['checkbox', 'radio', 'switch'].includes(entry.preview)">
            <label class="ui-sample-choice"><input :type="entry.preview === 'radio' ? 'radio' : 'checkbox'" :checked="entry.preview !== 'radio'" /> {{ entry.name }} option</label>
          </template>
          <template v-else-if="entry.preview === 'progress' || entry.preview === 'meter'">
            <div class="ui-sample-progress"><span :style="{ width: entry.preview === 'meter' ? '72%' : '48%' }"></span></div>
            <small>{{ entry.preview === 'meter' ? '72 / 100' : 'Step 2 of 4' }}</small>
          </template>
          <template v-else-if="entry.preview === 'spinner'">
            <span class="ui-sample-spinner" aria-label="Loading"></span><span>Loading</span>
          </template>
          <template v-else-if="entry.preview === 'skeleton'">
            <span class="ui-sample-skeleton is-wide"></span><span class="ui-sample-skeleton is-short"></span>
          </template>
          <template v-else-if="['card', 'empty-state', 'notice'].includes(entry.preview)">
            <div class="ui-sample-surface"><strong>{{ entry.name }}</strong><span>{{ entry.preview === 'notice' ? 'Action required · Success' : 'Composable content surface' }}</span></div>
          </template>
          <template v-else-if="['tabs', 'segmented', 'navigation-strip'].includes(entry.preview)">
            <div class="ui-sample-tabs"><span class="is-active">Overview</span><span>Details</span><span>Reviews</span></div>
          </template>
          <template v-else-if="entry.preview === 'pagination'">
            <nav class="ui-sample-pagination" aria-label="Pagination"><a href="#catalog" aria-label="Previous page">‹</a><a href="#catalog">1</a><a href="#catalog" class="is-active" aria-current="page">2</a><span aria-hidden="true">…</span><a href="#catalog">8</a><a href="#catalog" aria-label="Next page">›</a></nav>
          </template>
          <template v-else-if="entry.preview === 'table'">
            <div class="ui-sample-table"><span>Product</span><span>Status</span><span>Orbit lamp</span><span class="is-success">Ready</span></div>
          </template>
          <template v-else-if="entry.preview === 'select'">
            <label class="ui-sample-field">Select<select><option>Orbit lamp</option><option>Stack tray</option></select></label>
          </template>
          <template v-else-if="entry.preview === 'label'">
            <label class="ui-sample-label">Email address <span aria-hidden="true">*</span></label>
          </template>
          <template v-else-if="entry.preview === 'separator'">
            <span class="ui-sample-separator"></span>
          </template>
          <template v-else-if="entry.preview === 'slider'">
            <label class="ui-sample-field">Cable length<input type="range" min="1" max="5" value="3" /></label>
          </template>
          <template v-else-if="entry.preview === 'scroll-area'">
            <div class="ui-sample-scroll"><span v-for="item in ['Orbit lamp', 'Stack tray', 'Field tote']" :key="item">{{ item }}</span></div>
          </template>
          <template v-else-if="entry.preview === 'icon'">
            <span class="ui-sample-avatar" aria-hidden="true">✦</span><span>Informative icon</span>
          </template>
          <template v-else-if="entry.preview === 'avatar'">
            <div class="ui-sample-avatar-set" aria-label="Avatar variants">
              <span><span class="ui-sample-avatar is-image" aria-hidden="true">◉</span><small>Image</small></span>
              <span><span class="ui-sample-avatar" aria-hidden="true">AL</span><small>Initials</small></span>
              <span><span class="ui-sample-avatar is-fallback" aria-hidden="true">?</span><small>Fallback</small></span>
            </div>
          </template>
          <template v-else-if="['toggle-button', 'button-group', 'toolbar'].includes(entry.preview)">
            <div class="ui-sample-tabs"><button class="is-active">View</button><button>Sort</button><button>Filter</button></div>
          </template>
          <template v-else-if="['menu', 'menubar', 'navigation-menu'].includes(entry.preview)">
            <nav class="ui-sample-menu" aria-label="Preview navigation"><a href="#catalog">Shop</a><a href="#catalog">Journal</a><a href="#catalog">About</a></nav>
          </template>
          <template v-else-if="entry.preview === 'accordion' || entry.preview === 'disclosure'">
            <details open class="ui-sample-disclosure"><summary>{{ entry.name }} heading</summary><span>Expandable content</span></details>
          </template>
          <template v-else-if="entry.preview === 'field' || entry.preview === 'password' || entry.preview === 'otp'">
            <form class="ui-sample-form" @submit.prevent>
              <label class="ui-sample-field">{{ entry.name }}<input :type="entry.preview === 'password' ? 'password' : 'text'" :value="entry.preview === 'otp' ? '123456' : 'Configured value'" /></label>
            </form>
          </template>
          <template v-else-if="['dialog', 'confirmation-dialog'].includes(entry.preview)">
            <div class="ui-sample-dialog"><strong>Confirm changes</strong><span>Your configuration is ready.</span><div><button class="ui-sample-button">Confirm</button><button class="ui-sample-button is-secondary">Cancel</button></div></div>
          </template>
          <template v-else-if="['action-bar', 'toast', 'toast-viewport'].includes(entry.preview)">
            <div class="ui-sample-surface"><strong>{{ entry.name }}</strong><span>Saved successfully</span><button class="ui-sample-button">Continue</button></div>
          </template>
          <template v-else-if="entry.preview === 'search'">
            <label class="ui-sample-field">Search products<input type="search" value="cable" /></label>
          </template>
          <template v-else-if="entry.preview === 'results'">
            <div class="ui-sample-results"><strong>Search results</strong><span>Cobalt cable · In stock</span><span>Orbit lamp · New</span></div>
          </template>
          <template v-else-if="entry.preview === 'workflow'">
            <ol class="ui-sample-workflow"><li class="is-done">Configure</li><li class="is-active">Review</li><li>Complete</li></ol>
          </template>
          <template v-else-if="entry.preview === 'app-shell'">
            <div class="ui-sample-shell" aria-label="Application shell regions"><span class="is-bar">Nav</span><span class="is-header">Header</span><span class="is-content">Main</span><span class="is-footer">Footer</span></div>
          </template>
          <template v-else-if="entry.preview === 'async-state'">
            <div class="ui-sample-async-state"><strong>Recommendations</strong><span class="is-state">Partially loaded</span><span>Profile data is ready while recommendations refresh.</span><button class="ui-sample-button">Retry</button></div>
          </template>
          <template v-else-if="entry.preview === 'aspect-ratio'">
            <div class="ui-sample-ratios" aria-label="Aspect ratio variants">
              <figure v-for="ratio in ['16:9', '1:1', '4:3']" :key="ratio" class="ui-sample-ratio">
                <span :style="{ aspectRatio: ratio.replace(':', ' / ') }"></span>
                <figcaption>{{ ratio }}</figcaption>
              </figure>
            </div>
          </template>
          <template v-else-if="entry.preview === 'image'">
            <div class="ui-sample-media"><span>{{ entry.name }}</span></div>
          </template>
          <template v-else-if="entry.layer === 'organism'">
            <div class="ui-sample-shell" aria-label="Organism layout regions"><span class="is-bar">Nav</span><span class="is-header">Header</span><span class="is-content">Content</span><span class="is-footer">Actions</span></div>
          </template>
          <template v-else>
            <span class="ui-sample-component" data-preview-fallback="true">{{ entry.name }}</span>
            <span class="ui-sample-variant">Contract preview only · {{ entry.variants[0] }}</span>
          </template>
        </div>
        <div class="ui-catalog-preview-contract" aria-label="Documented variants and states">
          <div><span class="ui-catalog-contract-label">Variants</span><ul><li v-for="variant in entry.variants" :key="variant">{{ variant }}</li></ul></div>
          <div><span class="ui-catalog-contract-label">States</span><ul><li v-for="state in entry.states" :key="state">{{ state }}</li></ul></div>
        </div>
        <span class="ui-catalog-preview-label">Rendered anatomy · {{ entry.name }}</span>
      </div>
      <dl>
        <dt>Variants</dt>
        <dd>{{ entry.variants.join(', ') }}</dd>
        <dt>States</dt>
        <dd>{{ entry.states.join(', ') }}</dd>
        <dt>Accessibility</dt>
        <dd>{{ entry.accessibility }}</dd>
        <dt>Extension</dt>
        <dd>{{ entry.extension }}</dd>
      </dl>
      <p class="ui-catalog-links"><a :href="entry.api">API reference</a> · <a :href="entry.source">Source package</a></p>
    </article>
  </div>
</div>
