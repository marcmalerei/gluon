import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';
import { AspectRatio, Avatar, ScrollArea, Separator } from '@gluonjs/atoms';
const meta = { title: 'Component library/Foundation atoms', render: () => html`<main><h2>Foundation atoms</h2>${AspectRatio({ ratio: 16/9, children: html`<img src="https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=640&q=80" alt="Mountain lake" style="inline-size:100%;block-size:100%;object-fit:cover">` })}${Avatar({ src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96', alt: 'Portrait of Ada', status: 'loaded' })}${Separator({})}${ScrollArea({ attributes: { 'aria-label': 'Scrollable notes' }, children: html`<p>Native overflow remains keyboard and screen-reader reachable.</p><p>Caller content remains ordinary region content.</p><p>Reduced motion never changes scrolling ownership.</p>` })}</main>` } satisfies Meta;
export default meta;
export const Default: StoryObj = {};
