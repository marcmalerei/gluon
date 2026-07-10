import {
  adoptStyles,
  foundationStyles,
  layerOrderStyles,
  render,
} from '../src/index.js';
import { Button, atomStyles } from '../src/atoms/index.js';
import { Card, moleculeStyles } from '../src/molecules/index.js';
import { AppShell, organismStyles } from '../src/organisms/index.js';
import { q } from '../src/quarks/index.js';

adoptStyles(
  document,
  layerOrderStyles,
  foundationStyles,
  atomStyles,
  moleculeStyles,
  organismStyles,
);

render(AppShell({
  header: q.h1({ children: 'Gluon' }),
  navigation: q.a({ href: '#welcome', children: 'Welcome' }),
  children: Card({
    title: 'Native interface layers',
    children: q.p({
      id: 'welcome',
      children: 'Quarks compose into Atoms, Molecules, and Organisms.',
    }),
    actions: Button({
      label: 'Continue',
      onClick: () => console.log('Continue'),
    }),
  }),
}), document.body);
