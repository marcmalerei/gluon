declare module '*.gluon' {
  import type { Component } from '@gluonjs/core';

  const component: Component<Record<string, unknown>>;
  export default component;
}
