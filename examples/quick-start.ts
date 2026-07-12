import {
  adoptStyles,
  compose,
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

render(compose(AppShell, {
  header: q.h1({ children: 'Gluon' }),
  navigation: q.a({ href: '#welcome', children: 'Welcome' }),
})`
  ${compose(Card, {
    title: 'Native interface layers',
    actions: Button({
      label: 'Continue',
      onClick: () => console.log('Continue'),
    }),
  })`<p id="welcome">Quarks compose into Atoms, Molecules, and Organisms.</p>`}
`, document.body);
