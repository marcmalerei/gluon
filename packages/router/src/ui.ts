import {
  createInjectionKey,
  html,
  inject,
  nothing,
  type GluonPlugin,
  type TemplateValue,
} from '@gluonjs/core';
import type { RouteRecordNormalized } from './matcher.js';
import type {
  RouteLocationNormalized,
  RouteLocationRaw,
  RouteNamedMap,
  Router,
} from './router.js';

export const routerKey = createInjectionKey<Router>('gluon-router');

export function createRouterPlugin(router: Router): GluonPlugin {
  const plugin: GluonPlugin = {
    install(app) {
      app.provide(routerKey, router);
      app.config.globalProperties.$router = router;
      Object.defineProperty(app.config.globalProperties, '$route', {
        configurable: true,
        enumerable: true,
        get: () => router.currentRoute.value,
      });
      return () => {
        delete app.config.globalProperties.$router;
        delete app.config.globalProperties.$route;
        router.destroy();
      };
    },
  };
  return Object.freeze(plugin);
}

export function useRouter<Routes extends RouteNamedMap = RouteNamedMap>(): Router<Routes> {
  return inject(routerKey) as unknown as Router<Routes>;
}

export function useRoute(): RouteLocationNormalized {
  return useRouter().currentRoute.value;
}

export interface RouterLinkProps<Routes extends RouteNamedMap = RouteNamedMap> {
  readonly to: RouteLocationRaw<Routes>;
  readonly replace?: boolean;
  readonly activeClass?: string;
  readonly exactActiveClass?: string;
  readonly ariaCurrentValue?: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly children?: TemplateValue;
}

export function RouterLink<Routes extends RouteNamedMap = RouteNamedMap>(
  props: RouterLinkProps<Routes>,
): TemplateValue {
  const router = useRouter<Routes>();
  const target = router.resolve(props.to);
  const current = router.currentRoute.value;
  const exact = current.fullPath === target.fullPath;
  const active = isRouteActive(current, target);
  const attributes = props.attributes ?? {};
  const linkTarget = typeof attributes.target === 'string' ? attributes.target : undefined;
  const navigate = (event: MouseEvent): void => {
    if (event.currentTarget instanceof HTMLAnchorElement && event.currentTarget.hasAttribute('download')) return;
    if (!canNavigate(event, linkTarget)) return;
    event.preventDefault();
    const result = props.replace ? router.replace(props.to) : router.push(props.to);
    void result.catch(() => undefined);
  };

  return html`<a ...=${{
    ...attributes,
    href: target.href,
    class: [
      attributes.class,
      active && (props.activeClass ?? 'router-link-active'),
      exact && (props.exactActiveClass ?? 'router-link-exact-active'),
    ],
    'aria-current': exact ? (props.ariaCurrentValue ?? 'page') : undefined,
    '@click': navigate,
  }}>${props.children ?? target.href}</a>`;
}

export interface RouterViewProps {
  readonly depth?: number;
  readonly name?: string;
  readonly fallback?: TemplateValue;
}

export function RouterView({
  depth = 0,
  name = 'default',
  fallback = nothing,
}: RouterViewProps = {}): TemplateValue {
  const router = useRouter();
  const route = router.currentRoute.value;
  const record = route.matched[depth];
  if (!record) return fallback;
  const component = router.getRouteComponent(record, name);
  return component ? component({ route, router, record }) : fallback;
}

export function isRouteActive(
  current: RouteLocationNormalized,
  target: RouteLocationNormalized,
  exact = false,
): boolean {
  if (exact) return current.fullPath === target.fullPath;
  return target.matched.length > 0
    && target.matched.every((record: RouteRecordNormalized) => current.matched.includes(record))
    && Object.entries(target.params).every(([name, value]) => equalParam(current.params[name], value));
}

function equalParam(
  left: string | readonly string[] | undefined,
  right: string | readonly string[],
): boolean {
  return Array.isArray(left) || Array.isArray(right)
    ? Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => value === right[index])
    : left === right;
}

function canNavigate(event: MouseEvent, target: string | undefined): boolean {
  return !event.defaultPrevented
    && event.button === 0
    && !event.metaKey
    && !event.altKey
    && !event.ctrlKey
    && !event.shiftKey
    && (!target || target.toLowerCase() === '_self');
}
