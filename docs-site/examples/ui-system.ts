import {
  Button,
  Icon,
  Input,
  Label,
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
import { Card, FormField, defineMolecule } from '@gluonjs/molecules';
import { AppShell, defineOrganism } from '@gluonjs/organisms';
import {
  Dialog,
  Field,
  Listbox,
  Overlay,
  Popover,
  createFocusScope,
  q,
  type FocusScope,
} from '@gluonjs/quarks';
import { nextTick, ref } from '@gluonjs/reactivity';

const theme = ref<'light' | 'dark'>('light');
const finish = ref('black');
const dialogOpen = ref(false);
const purchaseRef: { value?: HTMLButtonElement } = {};
const analyticsEvents: string[] = [];
let dialogScope: FocusScope | undefined;
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
    .example-dialog, [popover] { max-inline-size: 360px; padding: 24px; border: 1px solid var(--gluon-color-rule); background: var(--gluon-color-surface); color: var(--gluon-color-text); }
  }
`;

function closeDialog(): void {
  dialogOpen.value = false;
  dialogScope?.deactivate();
  dialogScope = undefined;
}

function openDialog(trigger: HTMLElement): void {
  dialogOpen.value = true;
  void nextTick(() => {
    const dialog = document.querySelector<HTMLElement>('.example-dialog');
    if (!dialog) return;
    dialogScope = createFocusScope(dialog, {
      initialFocus: '[data-dialog-initial-focus]',
      returnFocus: trigger,
    });
    dialogScope.activate();
  });
}

const uiOwner = installUi(document, { theme: 'light' });
adoptStyles(document, exampleStyles);

createApp(() => AppShell({
  header: q.div({
    class: { 'example-actions': true },
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
      q.button({ type: 'button', popovertarget: 'ui-help', children: 'Open help popover' }),
    ],
  }),
  navigation: q.a({ href: '#profile', children: 'Profile' }),
  children: Card({
    attributes: { id: 'profile' },
    title: 'Profile',
    subtitle: 'Stable atoms, molecules, and headless choices',
    actions: Button({ label: 'Save profile' }),
    children: [
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
      dialogOpen.value
        ? Overlay({
            attributes: { class: 'example-overlay' },
            onDismiss: closeDialog,
            children: Dialog({
              label: 'Profile preferences',
              onDismiss: closeDialog,
              attributes: { class: 'example-dialog' },
              children: [
                q.h2({ children: 'Profile preferences' }),
                Button({
                  label: 'Close dialog',
                  attributes: { data: { dialogInitialFocus: true } },
                  onClick: closeDialog,
                }),
              ],
            }),
          })
        : null,
    ],
  }),
  footer: 'Keyboard: Tab, Shift+Tab, Arrow keys, Home, End',
})).mount(document.querySelector('#ui-system')!);
