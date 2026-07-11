import type { TemplateResult } from '@gluonjs/core';
import {
  Button,
  atomManifest,
  getThemeStyles,
  type ButtonProps,
} from '@gluonjs/atoms';
import { Card, moleculeManifest, type CardProps } from '@gluonjs/molecules';
import { AppShell, organismManifest } from '@gluonjs/organisms';
import {
  Dialog,
  Listbox,
  createFocusScope,
  q,
  quarkManifest,
  type FocusScope,
} from '@gluonjs/quarks';

const buttonProps: ButtonProps = { label: 'Save', variant: 'primary' };
const cardProps: CardProps = { title: 'Profile', actions: Button(buttonProps) };
const tree: TemplateResult = AppShell({
  children: Card({
    ...cardProps,
    children: [
      q.p({ children: 'Ready' }),
      Dialog({ label: 'Preferences', children: 'Dialog' }),
      Listbox({
        id: 'finish',
        label: 'Finish',
        options: [{ value: 'black', label: 'Black' }],
      }),
    ],
  }),
});

declare const container: HTMLElement;
const scope: FocusScope = createFocusScope(container);
const theme: CSSStyleSheet = getThemeStyles('dark');
const manifests = [quarkManifest, atomManifest, moleculeManifest, organismManifest] as const;

void tree;
void scope;
void theme;
void manifests;

// @ts-expect-error stable themes reject unknown names
getThemeStyles('contrast');
// @ts-expect-error stable dialogs require an accessible name
Dialog({ children: 'Unnamed' });
