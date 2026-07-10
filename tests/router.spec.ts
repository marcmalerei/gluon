import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, html } from '../src/index.js';
import { nextTick } from '@gluonjs/reactivity';
import {
  RouterLink,
  RouterView,
  createRouterPlugin,
  isRouteActive,
  useRoute,
  useRouter,
} from '../packages/router/src/ui.js';
import {
  createMemoryHistory,
  createWebHashHistory,
  createWebHistory,
} from '../packages/router/src/history.js';
import { createRouter } from '../packages/router/src/router.js';
import { lazyRoute } from '../packages/router/src/matcher.js';

describe('@gluonjs/router browser integration', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('installs into an app and renders reactive links and nested views', async () => {
    const history = createMemoryHistory();
    const router = createRouter({
      history,
      routes: [
        { path: '/', name: 'home', component: () => html`<h1>Home</h1>` },
        {
          path: '/projects/:id',
          name: 'project',
          component: ({ route }) => html`
            <section>Project ${route.params.id}${RouterView({ depth: 1 })}</section>
          `,
          children: [{
            path: 'settings',
            name: 'settings',
            component: () => html`<p>Settings</p>`,
          }],
        },
      ],
    });
    await router.isReady();
    const app = createApp(() => {
      expect(useRouter()).toBe(router);
      const route = useRoute();
      return html`
        <nav>
          ${RouterLink({ to: '/', children: 'Home', attributes: { id: 'home' } })}
          ${RouterLink({
            to: { name: 'settings', params: { id: '7' } },
            children: 'Project settings',
            attributes: { id: 'settings', class: 'custom' },
          })}
        </nav>
        <output>${route.fullPath}</output>
        <main>${RouterView()}</main>
      `;
    });
    app.use(createRouterPlugin(router));
    const root = document.createElement('div');
    document.body.append(root);
    const mount = app.mount(root);

    const home = root.querySelector<HTMLAnchorElement>('#home')!;
    const settings = root.querySelector<HTMLAnchorElement>('#settings')!;
    expect(home.getAttribute('aria-current')).toBe('page');
    expect(home.classList.contains('router-link-exact-active')).toBe(true);
    expect(settings.href.endsWith('/projects/7/settings')).toBe(true);
    expect(root.querySelector('h1')?.textContent).toBe('Home');
    settings.click();
    await settleRender();
    expect(root.querySelector('main')?.textContent).toContain('Project 7Settings');
    expect(root.querySelector('output')?.textContent).toBe('/projects/7/settings');
    expect(settings.classList.contains('custom')).toBe(true);
    expect(settings.classList.contains('router-link-exact-active')).toBe(true);
    expect(app.config.globalProperties.$router).toBe(router);
    expect(app.config.globalProperties.$route).toBe(router.currentRoute.value);

    mount.unmount();
    expect(app.config.globalProperties.$router).toBeUndefined();
    await expect(router.push('/')).rejects.toThrow('destroyed router');
  });

  it('honors link modifiers, targets, downloads, replacement, custom classes, and fallback views', async () => {
    const history = createMemoryHistory(['/missing']);
    const router = createRouter({
      history,
      routes: [{ path: '/' }, { path: '/next', name: 'next' }],
    });
    await router.isReady();
    const app = createApp(() => html`
      ${RouterLink({
        to: '/next',
        replace: true,
        activeClass: 'active',
        exactActiveClass: 'exact',
        ariaCurrentValue: 'step',
        attributes: { id: 'replace' },
      })}
      ${RouterLink({ to: '/', attributes: { id: 'blank', target: '_blank' } })}
      ${RouterLink({ to: '/', attributes: { id: 'download', download: '' } })}
      ${RouterLink({ to: '/missing' })}
      ${RouterView({ fallback: html`<em>Not found</em>` })}
    `);
    app.use(createRouterPlugin(router));
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    expect(root.querySelector('em')?.textContent).toBe('Not found');

    const replaceLink = root.querySelector<HTMLAnchorElement>('#replace')!;
    const blankLink = root.querySelector<HTMLAnchorElement>('#blank')!;
    const downloadLink = root.querySelector<HTMLAnchorElement>('#download')!;
    for (const link of [replaceLink, blankLink, downloadLink]) {
      link.addEventListener('click', (event) => event.preventDefault());
    }
    replaceLink.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      button: 0,
    }));
    expect(router.currentRoute.value.path).toBe('/missing');
    blankLink.click();
    downloadLink.click();
    await settleRender();
    expect(router.currentRoute.value.path).toBe('/missing');
    replaceLink.click();
    await settleRender();
    const replace = root.querySelector<HTMLAnchorElement>('#replace')!;
    expect(replace.classList.contains('active')).toBe(true);
    expect(replace.classList.contains('exact')).toBe(true);
    expect(replace.getAttribute('aria-current')).toBe('step');
    app.unmount();
  });

  it('computes active records and parameter equality', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/user/:id', name: 'user' },
        { path: '/files/:parts+', name: 'files' },
      ],
    });
    await router.isReady();
    const one = router.resolve({ name: 'user', params: { id: '1' } });
    const two = router.resolve({ name: 'user', params: { id: '2' } });
    expect(isRouteActive(one, one)).toBe(true);
    expect(isRouteActive(one, one, true)).toBe(true);
    expect(isRouteActive(one, two)).toBe(false);
    expect(isRouteActive(router.resolve('/missing'), router.resolve('/other'))).toBe(false);
    const files = router.resolve({ name: 'files', params: { parts: ['one', 'two'] } });
    expect(isRouteActive(files, files)).toBe(true);
    expect(isRouteActive(
      { ...files, params: { parts: ['one', 'other'] } },
      files,
    )).toBe(false);
    router.destroy();
  });

  it('contains rejected link navigation promises', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/' },
        {
          path: '/failure',
          component: lazyRoute(async () => { throw new Error('link chunk failed'); }),
        },
      ],
    });
    await router.isReady();
    const app = createApp(() => html`${RouterLink({ to: '/failure', children: 'Failure' })}`);
    app.use(createRouterPlugin(router));
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    root.querySelector<HTMLAnchorElement>('a')!.click();
    await settleRender();
    expect(router.currentRoute.value.path).toBe('/');
    app.unmount();
  });

  it('reads deep links through real web and hash histories', () => {
    const original = `${location.pathname}${location.search}${location.hash}`;
    const originalState = history.state;
    try {
      history.replaceState(null, '', '/gluon-router/deep?tab=one#section');
      const web = createWebHistory('/gluon-router');
      expect(web.location.location).toBe('/deep?tab=one#section');
      expect(web.createHref('/next')).toBe('/gluon-router/next');
      web.destroy();

      history.replaceState(null, '', '/gluon-router#/hash-deep?tab=two');
      const hash = createWebHashHistory('/gluon-router');
      expect(hash.location.location).toBe('/hash-deep?tab=two');
      hash.replace('/hash-next');
      expect(location.hash).toBe('#/hash-next');
      hash.destroy();
    } finally {
      history.replaceState(originalState, '', original);
    }
  });
});

async function settleRender(): Promise<void> {
  await Promise.resolve();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
