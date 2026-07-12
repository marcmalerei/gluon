import { compose, render } from '../src/index.js';
import { Button, installUi } from '@gluonjs/atoms';
import { Card } from '@gluonjs/molecules';
import { AppShell } from '@gluonjs/organisms';
import { q } from '@gluonjs/quarks';

installUi(document, { theme: 'light' });

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
