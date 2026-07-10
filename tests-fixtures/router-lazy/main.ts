import { lazyRoute } from '../../packages/router/src/matcher.js';

export const routes = [{
  path: '/lazy',
  component: lazyRoute(() => import('./page.js')),
}];
