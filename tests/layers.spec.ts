import { beforeEach, describe, expect, it } from 'vitest';
import {
  adoptStyles,
  foundationStyles,
  layerOrderStyles,
  render,
} from '../src/index.js';
import { Button, Icon, Input, Label, atomStyles } from '@gluonjs/atoms';
import { Card, FormField, moleculeStyles } from '@gluonjs/molecules';
import { AppShell, organismStyles } from '@gluonjs/organisms';
import { q } from '@gluonjs/quarks';

describe('component layers', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.adoptedStyleSheets = [];
  });

  it('exposes explicit Atom, Molecule, and Organism metadata', () => {
    expect(Icon.layer).toBe('atom');
    expect(Button.layer).toBe('atom');
    expect(Input.layer).toBe('atom');
    expect(Label.layer).toBe('atom');
    expect(Card.layer).toBe('molecule');
    expect(FormField.layer).toBe('molecule');
    expect(AppShell.layer).toBe('organism');
  });

  it('composes every layer and styles it only through adopted stylesheets', () => {
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
      navigation: q.a({ href: '#main', children: 'Main' }),
      children: Card({
        title: 'Profile',
        actions: Button({ label: 'Save' }),
        children: FormField({
          label: 'Name',
          value: 'Ada',
          helper: 'Public display name',
        }),
      }),
      footer: Icon({ name: 'spark', label: 'Gluon' }),
    }), document.body);

    expect(document.querySelector('.gluon-app-shell')).not.toBeNull();
    expect(document.querySelector('.gluon-card')).not.toBeNull();
    expect((document.querySelector('.gluon-input') as HTMLInputElement).value).toBe('Ada');
    expect(document.querySelector('svg path')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(document.adoptedStyleSheets).toHaveLength(5);
    expect(document.querySelector('style[data-gluon]')).toBeNull();
  });
});
