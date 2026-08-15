import {
  AspectRatio,
  Avatar,
  Button,
  Checkbox,
  Radio,
  Icon,
  Input,
  Label,
  Progress,
  Slider,
  ScrollArea,
  Select,
  StatusBadge,
  Separator,
  Switch,
  ToggleButton,
  Textarea,
  defineButtonPreset,
  defineIcon,
  installUi,
} from '@gluonjs/atoms';
import {
  adoptStyles,
  createApp,
  css,
  svg,
} from '@gluonjs/core';
import {
  Accordion,
  Card,
  ButtonGroup,
  ChoiceGroup,
  ControlField,
  ContextMenu,
  DialogSurface,
  Disclosure,
  ResponsiveDisclosure,
  DropdownMenu,
  EmptyState,
  FormField,
  InlineNotice,
  NavigationStrip,
  ResponsiveActionBar,
  NavigationMenu,
  SearchField,
  SearchResults,
  Menubar,
  SegmentedControl,
  TableRegion,
  Tabs,
  Toolbar,
  ToastViewport,
  createDialogSurfaceController,
  createToastController,
  defineMolecule,
} from '@gluonjs/molecules';
import { AppShell, ConfirmationDialog, WorkflowTimeline, defineOrganism } from '@gluonjs/organisms';
import {
  Dialog,
  Field,
  Listbox,
  Overlay,
  Popover,
  Tooltip,
  HoverCard,
  createFocusScope,
  q,
} from '@gluonjs/quarks';
import { ref } from '@gluonjs/reactivity';
import examplePortrait from '../../docs/assets/examples/foundation-avatar.svg?url&no-inline';

const theme = ref<'light' | 'dark'>('light');
const finish = ref('black');
const searchQuery = ref('cable');
const dialogOpen = ref(false);
const purchaseRef: { value?: HTMLButtonElement } = {};
const analyticsEvents: string[] = [];
const dialogFocusOptions = { initialFocus: '[data-dialog-initial-focus]' } satisfies Parameters<typeof createFocusScope>[1];
const dialogController = createDialogSurfaceController(dialogFocusOptions);
const toastController = createToastController();
// DialogSurface composes these same public headless primitives; applications can still use them directly.
const headlessDialogPrimitives = { Dialog, Overlay, createFocusScope };
void headlessDialogPrimitives;
const menuAndToolbarPrimitives = { ContextMenu, DropdownMenu, Menubar, Toolbar };
void menuAndToolbarPrimitives;
const customBagIcon = defineIcon({
  name: 'example-bag',
  viewBox: '0 0 24 24',
  body: svg`<path d="M6 8h12l1 13H5L6 8zm3 0a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="2" fill="none"></path>`,
});
const PurchaseButton = defineButtonPreset({
  displayName: 'ExamplePurchaseButton',
  class: 'example-purchase',
  attributes: { data: { analyticsAction: 'purchase' } },
});
const DangerButton = defineButtonPreset({
  displayName: 'ExampleDangerButton',
  class: 'example-danger',
});
const PurchaseAction = defineMolecule((props: { total: string }) => PurchaseButton({
  children: [Icon({ icon: customBagIcon, label: 'Bag' }), ` Buy for ${props.total}`],
  attributes: {
    ref: purchaseRef,
    data: { productAction: 'buy' },
    onClick: () => analyticsEvents.push('purchase'),
  },
}), 'ExamplePurchaseAction');
const CheckoutActions = defineOrganism((props: { total: string }) => q.footer({
  class: 'example-actions',
  children: [PurchaseAction(props), DangerButton({ label: 'Cancel order' })],
}), 'ExampleCheckoutActions');
const exampleStyles = css`
  @layer gluon {
    body { margin: 0; background: var(--gluon-color-canvas); }
    .example-actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .example-purchase { --gluon-button-background: #171717; --gluon-button-color: #fff; }
    .example-danger { --gluon-button-background: #a52222; --gluon-button-color: #fff; }
    [role="listbox"] { display: grid; gap: 4px; margin-block: 20px; padding: 4px; border: 1px solid var(--gluon-color-rule); }
    [role="option"] { min-block-size: 44px; padding: 12px; }
    [role="option"][aria-selected="true"] { background: var(--gluon-color-action-soft); color: var(--gluon-color-action-soft-text); }
    [role="listbox"]:focus-visible { outline: 3px solid var(--gluon-color-focus); }
    .gluon-field { display: grid; gap: 0.375rem; margin-block: 16px; }
    .gluon-field .gluon-input { inline-size: 100%; }
    .example-overlay { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; background: rgb(0 0 0 / 45%); }
    .example-dialog { max-inline-size: 360px; border: 1px solid var(--gluon-color-rule); background: var(--gluon-color-surface); color: var(--gluon-color-text); }
    [popover] { max-inline-size: 360px; padding: 24px; border: 1px solid var(--gluon-color-rule); background: var(--gluon-color-surface); color: var(--gluon-color-text); }
  }
`;

function closeDialog(): void {
  dialogOpen.value = false;
  dialogController.deactivate();
}

function openDialog(trigger: HTMLElement): void {
  dialogOpen.value = true;
  dialogController.activate(trigger);
}

const uiOwner = installUi(document, { theme: 'light' });
adoptStyles(document, exampleStyles);

createApp(() => AppShell({
  header: q.div({
    children: ButtonGroup({
      label: 'Example actions',
      attributes: { class: 'example-actions' },
      children: [
      q.strong({ children: [Icon({ name: 'spark' }), Label({ children: ' GLUON UI' })] }),
      Button({
        label: `Use ${theme.value === 'light' ? 'dark' : 'light'} theme`,
        variant: 'ghost',
        onClick: () => {
          theme.value = theme.value === 'light' ? 'dark' : 'light';
          uiOwner.setTheme(theme.value);
        },
      }),
      Button({
        label: 'Open dialog',
        variant: 'secondary',
        onClick: (event) => openDialog(event.currentTarget as HTMLElement),
      }),
      Button({
        label: 'Show saved notification',
        variant: 'secondary',
        onClick: () => toastController.add({
          id: 'profile-saved-toast',
          title: 'Profile saved',
          children: 'Your public details are up to date.',
          tone: 'success',
        }),
      }),
      q.button({ type: 'button', popovertarget: 'ui-help', children: 'Open help popover' }),
      ],
    }),
  }),
  navigation: q.a({ href: '#profile', children: 'Profile' }),
  children: [
    WorkflowTimeline({
      id: 'ui-system-workflow',
      state: 'complete',
      steps: [{ id: 'profile', label: 'Profile reviewed', status: 'completed', evidence: 'Example record' }],
    }),
    NavigationStrip({
      label: 'Account sections',
      children: [
        q.a({ href: '#profile', 'aria-current': 'page', children: 'Profile' }),
        q.a({ href: '#orders', children: 'Orders' }),
        q.a({ href: '#security', children: 'Security' }),
      ],
    }),
    ResponsiveActionBar({
      summary: 'Profile changes ready',
      status: 'All fields are valid.',
      primaryAction: Button({ label: 'Save profile' }),
    }),
    NavigationMenu({
      label: 'Primary navigation',
      open: ['ui-shop-navigation'],
      items: [{
        id: 'ui-shop-navigation',
        label: 'Shop',
        href: '#profile',
        children: [{ id: 'ui-orders-navigation', label: 'Orders', href: '#orders' }],
      }],
    }),
    Card({
      attributes: { id: 'profile' },
      title: 'Profile',
      subtitle: 'Stable atoms, molecules, and headless choices',
      actions: Button({ label: 'Save profile' }),
      children: [
        SearchField({
          id: 'ui-example-search',
          label: 'Search products',
          query: searchQuery.value,
          submitLabel: 'Find',
          onQueryChange: (query) => { searchQuery.value = query; },
        }),
        SearchResults({
          id: 'ui-example-results',
          heading: 'Search results',
          groups: [{ id: 'example-products', heading: 'Products', count: 1, children: q.li({ children: q.a({ href: '#cobalt', children: 'Cobalt cable' }) }) }],
        }),
        Select({
          value: finish.value,
          attributes: { 'aria-label': 'Native finish selector' },
          onChange: (event) => {
            finish.value = (event.currentTarget as HTMLSelectElement).value;
          },
          children: [
            q.option({ value: 'black', children: 'Black' }),
            q.option({ value: 'cobalt', children: 'Cobalt' }),
          ],
        }),
        Textarea({
          value: 'Leave parcels with reception.',
          name: 'delivery-notes',
          rows: 3,
          fullWidth: true,
          attributes: { 'aria-label': 'Delivery notes' },
        }),
        q.label({
          children: [Checkbox({ name: 'updates', checked: true }), ' Product updates'],
        }),
        q.div({
          role: 'group',
          aria: { label: 'Preferred material' },
          children: [
            q.label({ children: [Radio({ name: 'material', value: 'steel', checked: true }), ' Steel'] }),
            q.label({ children: [Radio({ name: 'material', value: 'aluminium' }), ' Aluminium'] }),
          ],
        }),
        q.label({ children: [Switch({ name: 'network' }), ' Allow network access'] }),
        ToggleButton({ pressed: true, label: 'Grid view', variant: 'ghost' }),
        Progress({ value: 72, attributes: { 'aria-label': 'Profile completion' } }),
        Slider({ defaultValue: 40, min: 0, max: 100, step: 5, valueText: '40 percent', attributes: { 'aria-label': 'Notification volume' } }),
        StatusBadge({ tone: 'success', children: 'Profile active' }),
        AspectRatio({
          ratio: 4 / 3,
          attributes: { style: { maxInlineSize: '12rem' } },
          children: q.img({ src: examplePortrait, alt: 'Ada Lovelace profile portrait' }),
        }),
        Avatar({
          src: examplePortrait,
          alt: 'Ada Lovelace',
          status: 'loaded',
          attributes: { loading: 'lazy' },
        }),
        Separator({ decorative: true }),
        ScrollArea({
          label: 'Profile activity',
          attributes: {
            style: {
              '--gluon-scroll-area-max-block-size': '6rem',
              border: '1px solid var(--gluon-color-rule)',
              padding: '0.75rem',
            },
          },
          children: q.div({
            children: [
              q.p({ children: 'Profile created.' }),
              q.p({ children: 'Delivery preference updated.' }),
              q.p({ children: 'Security key registered.' }),
              q.p({ children: 'Profile reviewed.' }),
            ],
          }),
        }),
        ControlField({
          id: 'profile-note',
          label: 'Profile note',
          helper: 'Visible to the account owner.',
          control: (relationships) => Textarea({
            value: 'Prefers email updates.',
            attributes: { id: relationships.controlId, aria: relationships.aria },
          }),
        }),
        ChoiceGroup({
          id: 'profile-visibility',
          legend: 'Profile visibility',
          orientation: 'horizontal',
          children: [
            q.label({ children: [Radio({ name: 'visibility', checked: true }), ' Team'] }),
            q.label({ children: [Radio({ name: 'visibility' }), ' Private'] }),
          ],
        }),
        SegmentedControl({
          label: 'Profile layout',
          value: 'details',
          options: [
            { value: 'details', label: 'Details' },
            { value: 'summary', label: 'Summary' },
          ],
        }),
        Tabs({
          label: 'Profile information',
          value: 'overview',
          items: [
            { id: 'profile-overview', value: 'overview', label: 'Overview', panel: 'Profile overview' },
            { id: 'profile-history', value: 'history', label: 'History', panel: 'Profile history' },
          ],
        }),
        Disclosure({
          id: 'profile-delivery-details',
          summary: 'Delivery details',
          children: 'Tracked delivery in 2–3 working days.',
        }),
        ResponsiveDisclosure({
          id: 'responsive-catalog-filters',
          summary: 'Catalog filters',
          compactBreakpoint: '(max-width: 48rem)',
          compactInitialOpen: false,
          children: 'Availability and finish filters.',
        }),
        Accordion({
          label: 'Account help',
          value: 'delivery',
          items: [
            { id: 'profile-delivery', value: 'delivery', summary: 'Delivery', children: 'Tracked delivery in 2–3 working days.' },
            { id: 'profile-returns', value: 'returns', summary: 'Returns', children: 'Unused objects can be returned within 30 days.' },
          ],
        }),
        InlineNotice({
          tone: 'success',
          title: 'Profile saved',
          children: 'Your public details are up to date.',
        }),
        EmptyState({
          presentation: 'compact',
          heading: 'No archived projects',
          children: 'Completed projects will appear here.',
          action: Button({ label: 'Create project' }),
        }),
        TableRegion({
          id: 'recent-orders',
          label: 'Recent orders',
          summary: 'One recent order.',
          scrollHint: 'Scroll horizontally to review every column.',
          children: q.table({ children: q.tbody({ children: q.tr({ children: [q.th({ scope: 'row', children: 'A-101' }), q.td({ children: 'Ready' })] }) }) }),
        }),
        FormField({ label: 'Name', value: 'Ada Lovelace', helper: 'Shown on receipts' }),
      Field({
        label: 'Reference',
        helper: 'Optional order reference',
        children: Input({ name: 'reference' }),
      }),
      Listbox({
        id: 'finish',
        label: 'Preferred finish',
        value: finish.value,
        onChange: (value) => { finish.value = value; },
        options: [
          { value: 'black', label: 'Black' },
          { value: 'cobalt', label: 'Cobalt' },
          { value: 'natural', label: 'Natural' },
        ],
      }),
      q.p({ children: `Selected finish: ${finish.value}` }),
      CheckoutActions({ total: '$128.00' }),
      Popover({ id: 'ui-help', children: 'Native popover: Escape closes this surface.' }),
      Tooltip({ id: 'ui-tooltip', trigger: (attributes) => q.button({ ...attributes, children: 'Hover or focus' }), content: 'A concise description.' }),
      HoverCard({ id: 'ui-hover-card', label: 'More context', trigger: (attributes) => q.button({ ...attributes, children: 'More context' }), content: q.p({ children: 'A focusable explanation.' }) }),
        dialogOpen.value
          ? DialogSurface({
              id: 'profile-preferences',
              labelledBy: 'profile-preferences-title',
              title: 'Profile preferences',
              description: 'Update the preferences owned by this profile.',
              controller: dialogController,
              onDismiss: closeDialog,
              overlayAttributes: { class: 'example-overlay' },
              attributes: { class: 'example-dialog' },
              closeAction: Button({
                label: 'Close dialog',
                attributes: { data: { dialogInitialFocus: true } },
                onClick: closeDialog,
              }),
              children: 'Profile preferences remain application-owned.',
            })
          : null,
      ],
    }),
    ToastViewport({ controller: toastController, label: 'Profile notifications' }),
  ],
  footer: 'Keyboard: Tab, Shift+Tab, Arrow keys, Home, End',
})).mount(document.querySelector('#ui-system')!);
