import type { TemplateResult } from './runtime.js';

export type ComponentLayer = 'atom' | 'molecule' | 'organism';

export interface Component<Props = Record<string, never>> {
  (props: Props): TemplateResult;
  readonly layer: ComponentLayer;
  readonly displayName: string;
}

function defineComponent<Props>(
  layer: ComponentLayer,
  render: (props: Props) => TemplateResult,
  displayName = render.name || 'AnonymousComponent',
): Component<Props> {
  Object.defineProperties(render, {
    layer: { configurable: false, enumerable: true, value: layer },
    displayName: { configurable: false, enumerable: true, value: displayName },
  });
  return render as Component<Props>;
}

export function defineAtom<Props>(
  render: (props: Props) => TemplateResult,
  displayName?: string,
): Component<Props> {
  return defineComponent('atom', render, displayName);
}

export function defineMolecule<Props>(
  render: (props: Props) => TemplateResult,
  displayName?: string,
): Component<Props> {
  return defineComponent('molecule', render, displayName);
}

export function defineOrganism<Props>(
  render: (props: Props) => TemplateResult,
  displayName?: string,
): Component<Props> {
  return defineComponent('organism', render, displayName);
}
