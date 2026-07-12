import type { FormEvent, ReactNode } from 'react';

interface ShellProps {
  readonly heading: string;
  readonly actions: ReactNode;
  readonly dialog: ReactNode;
  readonly children: ReactNode;
}

interface PanelProps {
  readonly title: string;
  readonly onSubmit: (event: FormEvent) => void;
  readonly children: ReactNode;
}

function Shell({ heading, actions, dialog, children }: ShellProps) {
  return <main><h1>{heading}</h1>{children}{actions}{dialog}</main>;
}

function Panel({ title, onSubmit, children }: PanelProps) {
  return <form id="checkout" onSubmit={onSubmit}><h2>{title}</h2>{children}</form>;
}

export const checkout = (
  <Shell
    heading="Checkout"
    actions={<button form="checkout">Place order</button>}
    dialog={<dialog open aria-labelledby="confirm-title"><h2 id="confirm-title">Confirm order</h2><button>Close</button></dialog>}
  >
    <Panel title="Delivery" onSubmit={(event) => event.preventDefault()}>
      <label>Email <input name="email" type="email" required /></label>
    </Panel>
  </Shell>
);
