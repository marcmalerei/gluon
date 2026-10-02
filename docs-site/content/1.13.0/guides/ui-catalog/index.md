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
  let activeLayer = 'all';
  const update = () => {
    const query = search?.value.trim().toLowerCase() ?? '';
    for (const card of cards) {
      const matchesLayer = activeLayer === 'all' || card.dataset.layer === activeLayer;
      const matchesSearch = !query || card.dataset.name?.includes(query);
      card.hidden = !(matchesLayer && matchesSearch);
    }
  };
  search?.addEventListener('input', update);
  for (const filter of filters) filter.addEventListener('click', () => {
    activeLayer = filter.dataset.layerFilter ?? 'all';
    for (const item of filters) item.setAttribute('aria-pressed', String(item === filter));
    update();
  });
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

  <div class="ui-catalog-grid" data-ui-catalog-grid>
    <article v-for="entry in catalog.entries" :key="`${entry.layer}-${entry.name}`" class="ui-catalog-card" data-ui-catalog-card :data-layer="entry.layer" :data-name="entry.name.toLowerCase()">
      <header>
        <p class="ui-catalog-kicker">{{ labels[entry.layer] }} · {{ entry.package }}</p>
        <h2 :id="`catalog-${entry.layer}-${entry.name}`"><code>{{ entry.name }}</code></h2>
      </header>
      <div class="ui-catalog-preview" :data-preview="entry.preview ?? 'manifest-only'">
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
          <template v-else-if="entry.preview === 'heading'">
            <span class="ui-sample-heading">Swiss editorials</span>
          </template>
          <template v-else-if="entry.preview === 'text' || entry.preview === 'link'">
            <span class="ui-sample-copy">Configure your product with confidence.</span>
            <a href="#catalog-atom-Button" class="ui-sample-link">View details</a>
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
          <template v-else-if="['icon', 'avatar'].includes(entry.preview)">
            <span class="ui-sample-avatar" aria-hidden="true">{{ entry.preview === 'icon' ? '✦' : 'AL' }}</span><span>{{ entry.preview === 'icon' ? 'Informative icon' : 'Ada Lovelace' }}</span>
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
            <div class="ui-sample-shell"><span class="is-bar"></span><span class="is-content"></span><span class="is-content is-short"></span></div>
          </template>
          <template v-else-if="entry.preview === 'aspect-ratio' || entry.preview === 'image'">
            <div class="ui-sample-media"><span>{{ entry.name }}</span></div>
          </template>
          <template v-else-if="entry.preview === 'segmented'">
            <div class="ui-sample-tabs"><span class="is-active">Grid</span><span>List</span></div>
          </template>
          <template v-else-if="entry.layer === 'organism'">
            <div class="ui-sample-shell"><span class="is-bar"></span><span class="is-content"></span><span class="is-content is-short"></span></div>
          </template>
          <template v-else>
            <span class="ui-sample-component">{{ entry.name }}</span>
            <span class="ui-sample-variant">{{ entry.variants[0] }}</span>
          </template>
        </div>
        <span class="ui-catalog-preview-label">Representative {{ entry.preview ? 'component' : 'contract' }} preview</span>
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
