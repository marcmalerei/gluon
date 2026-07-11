import {
  adoptStyles,
  foundationStyles,
  layerOrderStyles,
  render,
} from '../src/index.js';
import { Button, atomStyles } from '@gluonjs/atoms';
import { Card, moleculeStyles } from '@gluonjs/molecules';
import { AppShell, organismStyles } from '@gluonjs/organisms';
import { q } from '@gluonjs/quarks';

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
