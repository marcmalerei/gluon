import type {
  RouteLocationRaw,
  Router,
} from '../packages/router/src/memory.js';

type AppRoutes = {
  home: { params: {} };
  user: { params: { id: string | number } };
  files: { params: { parts: readonly string[] } };
};

declare const router: Router<AppRoutes>;

router.push({ name: 'home', params: {} });
router.push({ name: 'user', params: { id: 42 }, query: { tab: 'profile' } });
router.replace({ name: 'files', params: { parts: ['one', 'two'] } });

const location: RouteLocationRaw<AppRoutes> = { name: 'user', params: { id: '7' } };
router.resolve(location);

// @ts-expect-error user routes require an id
router.push({ name: 'user', params: {} });
// @ts-expect-error route names are constrained by AppRoutes
router.push({ name: 'missing', params: {} });
// @ts-expect-error file parts must be an array
router.push({ name: 'files', params: { parts: 'one' } });
