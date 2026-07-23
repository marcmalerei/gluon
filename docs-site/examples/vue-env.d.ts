declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}

declare module '*.gluon' {
  import type { Component } from '@gluonjs/core';
  const component: Component<Record<string, unknown>>;
  export default component;
}
