declare const app: { component(name: string, component: unknown): void };
declare const Legacy: unknown;
app.component('Legacy', Legacy);
