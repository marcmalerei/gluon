import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';
import { q } from '@gluonjs/quarks';
import { Toast } from '@gluonjs/molecules';

const meta = {
  title: 'Molecules/Toast',
  render: () => html`
    <section aria-labelledby="toast-story-title">
      <h2 id="toast-story-title">Transient feedback</h2>
      ${Toast({
        id: 'story-saved-toast',
        title: 'Saved',
        children: 'Your preferences were saved.',
        tone: 'success',
        dismissAction: q.button({ type: 'button', aria: { label: 'Dismiss saved notification' }, children: '×' }),
      })}
      ${Toast({
        id: 'story-alert-toast',
        title: 'Inventory changed',
        children: 'Review the available finish before checkout.',
        tone: 'warning',
        announcement: 'assertive',
        dismissAction: q.button({ type: 'button', aria: { label: 'Dismiss inventory notification' }, children: '×' }),
      })}
    </section>
  `,
} satisfies Meta;

export default meta;
export const Default: StoryObj = {};
