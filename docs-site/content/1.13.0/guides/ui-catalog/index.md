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
    <input type="search" autocomplete="off" placeholder="Button, dialog, table…" data-ui-catalog-search />
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
        <div class="ui-catalog-preview-body" :data-preview-anatomy="entry.preview ?? 'manifest-only'">
          <template v-if="entry.preview === 'button'">
            <button class="ui-sample-button" type="button">Add to bag</button>
            <button class="ui-sample-button is-secondary" type="button">Save</button>
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
          <template v-else-if="entry.preview === 'combobox-field'">
            <label class="ui-sample-field">Product search<input role="combobox" value="Orbit" aria-expanded="true" aria-controls="catalog-combobox-list" /></label>
            <ul id="catalog-combobox-list" class="ui-sample-combobox-list" role="listbox"><li role="option" aria-selected="true">Orbit lamp</li><li role="option">Orbit cable</li><li role="option" aria-disabled="true">Orbit shade · unavailable</li></ul>
            <span class="ui-sample-variant">open · loading · empty · disabled</span>
          </template>
          <template v-else-if="entry.preview === 'command-palette'">
            <div class="ui-sample-command-palette" role="dialog" aria-label="Command palette"><strong>Quick actions</strong><input value="" placeholder="Search commands" role="combobox" aria-expanded="true" /><div class="ui-sample-command-group"><small>Navigation</small><span aria-selected="true">Open dashboard <kbd>⌘K</kbd></span><span>Search orders <kbd>↵</kbd></span></div></div>
            <span class="ui-sample-variant">grouped · keyboard · loading</span>
          </template>
          <template v-else-if="entry.preview === 'tree-view'">
            <ul class="ui-sample-tree" role="tree" aria-label="Catalog navigation"><li role="treeitem" aria-expanded="true" aria-selected="true"><span class="ui-sample-tree-toggle">▾</span><span>Shop</span><ul role="group"><li role="treeitem"><span class="ui-sample-tree-toggle">·</span><span>Lighting</span></li><li role="treeitem" aria-disabled="true"><span class="ui-sample-tree-toggle">·</span><span>Archived · unavailable</span></li></ul></li></ul>
            <span class="ui-sample-variant">Arrow keys · Home · End · nested groups</span>
          </template>
          <template v-else-if="entry.preview === 'sort-control'">
            <label class="ui-sample-sort-control">Sort products<select aria-label="Sort products"><option>Featured</option><option>Price: low to high</option><option>Newest</option></select></label>
            <span class="ui-sample-variant">native select · helper/error · disabled</span>
          </template>
          <template v-else-if="entry.preview === 'date-picker'">
            <div class="ui-sample-field ui-sample-date-picker"><label for="catalog-date-preview">Delivery date</label><input id="catalog-date-preview" type="date" value="2026-10-06" min="2026-10-03" /><small>Choose a dispatch date.</small></div>
            <span class="ui-sample-variant">native date · min/max · helper/error</span>
          </template>
          <template v-else-if="entry.preview === 'date-range-picker'">
            <fieldset class="ui-sample-date-range-picker"><legend>Delivery window</legend><div><label for="catalog-date-range-start">Start date</label><input id="catalog-date-range-start" type="date" value="2026-10-06" min="2026-10-03" /></div><div><label for="catalog-date-range-end">End date</label><input id="catalog-date-range-end" type="date" value="2026-10-08" min="2026-10-03" /></div><small>Start and end dates preserve native date controls.</small></fieldset>
            <span class="ui-sample-variant">native range · bounded · invalid order</span>
          </template>
          <template v-else-if="entry.preview === 'file-upload'">
            <div class="ui-sample-field ui-sample-file-upload"><label for="catalog-file-preview">Product photos</label><input id="catalog-file-preview" type="file" accept="image/*" multiple /><small>JPEG or PNG · multiple files</small><ul><li>orbit-lamp.png</li><li>orbit-detail.png</li></ul></div>
            <span class="ui-sample-variant">single/multiple · selected · disabled/error</span>
          </template>
          <template v-else-if="entry.preview === 'time-picker'">
            <div class="ui-sample-field ui-sample-time-picker"><label for="catalog-time-preview">Delivery time</label><input id="catalog-time-preview" type="time" value="09:00" min="08:00" max="18:00" step="900" /><small>15-minute increments · 08:00–18:00</small></div>
            <span class="ui-sample-variant">native time · min/max · step · error</span>
          </template>
          <template v-else-if="entry.preview === 'multi-select-field'">
            <label class="ui-sample-field">Delivery methods<select multiple size="3" aria-label="Delivery methods"><option selected>Standard · 2–4 days</option><option>Express · next day</option><option disabled>Pickup · unavailable</option></select></label>
            <span class="ui-sample-variant">native multiple · selected · disabled</span>
          </template>
          <template v-else-if="entry.preview === 'calendar'">
            <div class="ui-sample-calendar" role="region" aria-label="Delivery date calendar"><header><button type="button" aria-label="Previous month">‹</button><strong>October 2026</strong><button type="button" aria-label="Next month">›</button></header><table role="grid" aria-label="October 2026"><thead><tr><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th><th>Su</th></tr></thead><tbody><tr><td role="gridcell"><button type="button">28</button></td><td role="gridcell"><button type="button">29</button></td><td role="gridcell"><button type="button">30</button></td><td role="gridcell"><button type="button">1</button></td><td role="gridcell"><button type="button">2</button></td><td role="gridcell"><button type="button" aria-current="date">3</button></td><td role="gridcell"><button type="button" aria-selected="true">4</button></td></tr></tbody></table></div>
            <span class="ui-sample-variant">month grid · selected · today · bounded</span>
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
          <template v-else-if="entry.preview === 'card'">
            <article class="ui-sample-surface ui-sample-card"><strong>Orbit lamp</strong><span>Composable content surface</span><a class="ui-sample-link" href="#catalog">View details</a></article>
          </template>
          <template v-else-if="entry.preview === 'empty-state'">
            <section class="ui-sample-surface ui-sample-empty-state" aria-labelledby="catalog-empty-state-title"><strong id="catalog-empty-state-title">No saved configurations</strong><span>Start with a product to see your saved work here.</span><button class="ui-sample-button" type="button">Browse products</button></section>
          </template>
          <template v-else-if="entry.preview === 'notice'">
            <div class="ui-sample-surface ui-sample-notice" role="status"><strong>Action required</strong><span>Success and warning messages stay visible without relying on color.</span><button class="ui-sample-link" type="button">Review</button></div>
          </template>
          <template v-else-if="entry.preview === 'tabs'">
            <div class="ui-sample-tabs" role="tablist" aria-label="Product information"><button class="is-active" type="button" role="tab" aria-selected="true">Overview</button><button type="button" role="tab" aria-selected="false">Details</button><button type="button" role="tab" aria-selected="false">Reviews</button></div>
          </template>
          <template v-else-if="entry.preview === 'segmented'">
            <div class="ui-sample-tabs" role="toolbar" aria-label="View mode"><button class="is-active" type="button" aria-pressed="true">Overview</button><button type="button" aria-pressed="false">Details</button><button type="button" aria-pressed="false">Reviews</button></div>
          </template>
          <template v-else-if="entry.preview === 'navigation-strip'">
            <nav class="ui-sample-tabs" aria-label="Product sections"><a class="is-active" href="#catalog" aria-current="page">Overview</a><a href="#catalog">Details</a><a href="#catalog">Reviews</a></nav>
          </template>
          <template v-else-if="entry.preview === 'pagination'">
            <nav class="ui-sample-pagination" aria-label="Pagination"><a href="#catalog" aria-label="Previous page">‹</a><a href="#catalog">1</a><a href="#catalog" class="is-active" aria-current="page">2</a><span aria-hidden="true">…</span><a href="#catalog">8</a><a href="#catalog" aria-label="Next page">›</a></nav>
          </template>
          <template v-else-if="entry.preview === 'table'">
            <div class="ui-sample-table"><table><caption class="sr-only">Product status</caption><thead><tr><th scope="col">Product</th><th scope="col">Status</th></tr></thead><tbody><tr><td>Orbit lamp</td><td class="is-success">Ready</td></tr></tbody></table></div>
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
            <div class="ui-sample-tabs" :role="entry.preview === 'toolbar' ? 'toolbar' : 'group'" :aria-label="entry.name"><button class="is-active" type="button" :aria-pressed="entry.preview === 'toggle-button' ? 'true' : undefined">View</button><button type="button" :aria-pressed="entry.preview === 'toggle-button' ? 'false' : undefined">Sort</button><button type="button" :aria-pressed="entry.preview === 'toggle-button' ? 'false' : undefined">Filter</button></div>
          </template>
          <template v-else-if="['menu', 'menubar', 'navigation-menu'].includes(entry.preview)">
            <template v-if="entry.name === 'DropdownMenu' || entry.name === 'ContextMenu'">
              <div class="ui-sample-menu ui-sample-menu-popover"><button class="ui-sample-button is-secondary" type="button" aria-haspopup="menu" aria-expanded="true">{{ entry.name === 'ContextMenu' ? 'Open context menu' : 'Shop menu' }}</button><ul role="menu"><li role="menuitem"><a href="#catalog">Shop</a></li><li role="menuitem"><a href="#catalog">Journal</a></li><li role="menuitem" aria-disabled="true">About</li></ul></div>
            </template>
            <template v-else-if="entry.name === 'Menubar'">
              <div class="ui-sample-menu" role="menubar" aria-label="Preview navigation"><button type="button" role="menuitem" aria-haspopup="menu" aria-expanded="true">Shop</button><button type="button" role="menuitem">Journal</button><button type="button" role="menuitem">About</button></div>
            </template>
            <template v-else>
              <nav class="ui-sample-menu" aria-label="Preview navigation"><a href="#catalog" aria-current="page">Shop</a><a href="#catalog">Journal</a><a href="#catalog">About</a></nav>
            </template>
          </template>
          <template v-else-if="entry.preview === 'accordion' || entry.preview === 'disclosure'">
            <details open class="ui-sample-disclosure"><summary>{{ entry.name }} heading</summary><span>Expandable content</span></details>
          </template>
          <template v-else-if="entry.preview === 'field' || entry.preview === 'password' || entry.preview === 'otp'">
            <form class="ui-sample-form" @submit.prevent>
              <template v-if="entry.preview === 'otp'">
                <label class="ui-sample-field">One-time code<input inputmode="numeric" autocomplete="one-time-code" value="123456" /></label>
                <span class="ui-sample-otp" aria-label="Six digit code"><span v-for="digit in 6" :key="digit">{{ digit }}</span></span>
              </template>
              <template v-else-if="entry.preview === 'password'">
                <label class="sr-only">Username<input type="text" autocomplete="username" value="preview@example.test" /></label><label class="ui-sample-field">Password<input type="password" autocomplete="current-password" value="Configured value" /></label><button class="ui-sample-button is-secondary" type="button" aria-pressed="false">Show password</button>
              </template>
              <label v-else class="ui-sample-field">{{ entry.name }}<input type="text" autocomplete="off" value="Configured value" /></label>
            </form>
          </template>
          <template v-else-if="['dialog', 'confirmation-dialog'].includes(entry.preview)">
            <div class="ui-sample-dialog" role="dialog" :aria-modal="entry.preview === 'confirmation-dialog' ? 'true' : undefined" aria-labelledby="catalog-dialog-title"><strong id="catalog-dialog-title">Confirm changes</strong><span>Your configuration is ready.</span><div><button class="ui-sample-button" type="button">Confirm</button><button class="ui-sample-button is-secondary" type="button">Cancel</button></div></div>
          </template>
          <template v-else-if="entry.preview === 'popover'">
            <div class="ui-sample-popover"><button class="ui-sample-button is-secondary" type="button" aria-controls="catalog-popover-content" aria-expanded="true" aria-haspopup="dialog">Open finish help</button><div id="catalog-popover-content" class="ui-sample-popover-content" role="dialog" aria-label="Finish help"><strong>Finish help</strong><span>Choose a saved configuration.</span><a href="#catalog">View finishes</a></div></div>
            <span class="ui-sample-variant">anchored · placement · escape</span>
          </template>
          <template v-else-if="entry.preview === 'sheet'">
            <div class="ui-sample-sheet-overlay"><section class="ui-sample-sheet" role="dialog" aria-label="Filters"><header><strong>Filters</strong><button class="ui-sample-link" type="button">Close</button></header><div><label class="ui-sample-field">Availability<select><option>In stock</option></select></label></div><footer><button class="ui-sample-button" type="button">Apply filters</button></footer></section></div>
            <span class="ui-sample-variant">edge panel · focus scope · responsive</span>
          </template>
          <template v-else-if="entry.preview === 'action-bar'">
            <section class="ui-sample-surface ui-sample-action-bar" aria-label="Actions"><strong>Saved successfully</strong><button class="ui-sample-button" type="button">Continue</button></section>
          </template>
          <template v-else-if="entry.preview === 'toast'">
            <div class="ui-sample-surface ui-sample-toast" role="status" aria-live="polite"><strong>Saved successfully</strong><button class="ui-sample-link" type="button">Dismiss</button></div>
          </template>
          <template v-else-if="entry.preview === 'toast-viewport'">
            <section class="ui-sample-surface ui-sample-toast-viewport" aria-label="Notifications"><span role="status">Saved successfully</span><button class="ui-sample-button is-secondary" type="button">Dismiss</button></section>
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
          <template v-else-if="entry.preview === 'page-layout'">
            <div class="ui-sample-page-layout" aria-label="Page layout regions"><span class="is-header">Breadcrumbs · Page title · Actions</span><span class="is-main">Main content</span><span class="is-aside">Aside</span><span class="is-footer">Footer</span></div>
            <span class="ui-sample-variant">content · aside · responsive</span>
          </template>
          <template v-else-if="entry.preview === 'split-pane'">
            <div class="ui-sample-split-pane" aria-label="Split pane regions"><span class="is-primary">Primary workspace</span><span class="is-secondary">Inspector <button type="button" aria-label="Collapse secondary panel">−</button></span></div>
            <span class="ui-sample-variant">horizontal · vertical · responsive</span>
          </template>
          <template v-else-if="entry.preview === 'admin-shell'">
            <div class="ui-sample-admin-shell" aria-label="Admin shell regions"><span class="is-header">Admin header</span><span class="is-sidebar">Navigation</span><span class="is-content">Workspace</span><span class="is-footer">Status</span></div>
            <span class="ui-sample-variant">sidebar · responsive</span>
          </template>
          <template v-else-if="entry.preview === 'mega-menu'">
            <div class="ui-sample-mega-menu"><button type="button" aria-expanded="true">Shop <span aria-hidden="true">⌃</span></button><div class="ui-sample-mega-panel"><section><strong>Lighting</strong><a href="#catalog">Orbit lamp</a><a href="#catalog">Desk light</a></section><section><strong>Furniture</strong><a href="#catalog">Stack tray</a><a href="#catalog">Fold stool</a></section></div></div>
            <span class="ui-sample-variant">grouped · responsive · keyboard</span>
          </template>
          <template v-else-if="entry.preview === 'site-header'">
            <header class="ui-sample-site-header"><strong>GLUON GOODS</strong><nav aria-label="Primary navigation"><a href="#catalog">Shop</a><a href="#catalog">Journal</a></nav><div><button type="button">Search</button><button type="button">Menu</button></div></header>
            <span class="ui-sample-variant">brand · navigation · actions · mobile</span>
          </template>
          <template v-else-if="entry.preview === 'site-footer'">
            <footer class="ui-sample-site-footer"><strong>GLUON GOODS</strong><nav aria-label="Footer navigation"><a href="#catalog">Shop</a><a href="#catalog">Journal</a><a href="#catalog">Support</a></nav><small>© 2026 Gluon Goods</small></footer>
            <span class="ui-sample-variant">brand · navigation · legal · meta</span>
          </template>
          <template v-else-if="entry.preview === 'async-state'">
            <div class="ui-sample-async-state"><strong>Recommendations</strong><span class="is-state">Partially loaded</span><span>Profile data is ready while recommendations refresh.</span><button class="ui-sample-button">Retry</button></div>
          </template>
          <template v-else-if="entry.preview === 'product-card'">
            <article class="ui-sample-product-card"><div class="ui-sample-product-media">Orbit lamp</div><strong>Orbit lamp</strong><span>€128 · In stock</span><button class="ui-sample-button">Add to bag</button></article>
          </template>
          <template v-else-if="entry.preview === 'product-gallery'">
            <div class="ui-sample-product-gallery" aria-label="Product gallery preview"><figure class="is-primary"><span>Primary media</span></figure><figure><span>Detail crop</span></figure><figure><span>Alternate view</span></figure></div>
            <span class="ui-sample-variant">primary · responsive · cropped</span>
          </template>
          <template v-else-if="entry.preview === 'product-grid'">
            <div class="ui-sample-product-grid"><span>Orbit lamp</span><span>Stack tray</span><span>Field tote</span></div>
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
