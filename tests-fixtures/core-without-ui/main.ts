import { html, isTemplateResult } from '@gluonjs/core';

export const coreOnly = isTemplateResult(html`<p>Core only</p>`);
