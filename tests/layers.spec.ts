import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '../src/index.js';
import {
  Button,
  Icon,
  Input,
  Label,
  buttonStyles,
  iconStyles,
  inputStyles,
  installUi,
  labelStyles,
} from '@gluonjs/atoms';
import { Card, FormField, cardStyles, formFieldStyles } from '@gluonjs/molecules';
import { AppShell, appShellStyles } from '@gluonjs/organisms';
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
    for (const component of [Button, Card, AppShell]) {
      expect(Object.keys(component)).toEqual(['layer', 'displayName', 'styles']);
      expect(Object.getOwnPropertyDescriptor(component, 'layer')).toMatchObject({
        configurable: false,
        enumerable: true,
        writable: false,
      });
      expect(Object.getOwnPropertyDescriptor(component, 'displayName')).toMatchObject({
        configurable: false,
        enumerable: true,
        writable: false,
      });
      expect(Object.getOwnPropertyDescriptor(component, 'styles')).toMatchObject({
        configurable: false,
        enumerable: true,
        writable: false,
      });
    }
    expect(Button.styles.map(({ id }) => id)).toEqual(['gluon-atom-button']);
    expect(FormField.styles.map(({ id }) => id)).toEqual(['gluon-molecule-form-field']);
    expect(AppShell.styles.map(({ id }) => id)).toEqual(['gluon-organism-app-shell']);
  });

  it('composes every layer and adopts only the exact used sheets', () => {
    const owner = installUi(document, { theme: 'light' });

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
    expect(document.adoptedStyleSheets.filter((sheet) => [
      buttonStyles,
      iconStyles,
      inputStyles,
      labelStyles,
      cardStyles,
      formFieldStyles,
      appShellStyles,
    ].includes(sheet))).toEqual([
      buttonStyles,
      iconStyles,
      inputStyles,
      labelStyles,
      cardStyles,
      formFieldStyles,
      appShellStyles,
    ]);
    expect(document.querySelector('style[data-gluon]')).toBeNull();
    owner.dispose();
  });
});
