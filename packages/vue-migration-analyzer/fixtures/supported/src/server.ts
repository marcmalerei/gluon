import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
const app = createSSRApp({});
void renderToString(app);
