import { html } from '@gluonjs/core';
import { cleanupFixtures, mountComponent } from '@gluonjs/test-utils';

const fixture = mountComponent(
  ({ label }: Readonly<{ label: string }>) => html`<button>${label}</button>`,
  { props: { label: 'Save' } },
);

if (fixture.get('button').textContent !== 'Save') throw new Error('Expected Save');
await cleanupFixtures();
