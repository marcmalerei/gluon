import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("routes/product.tsx"), route("checkout", "routes/checkout.tsx")] satisfies RouteConfig;
