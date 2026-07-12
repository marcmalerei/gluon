import { afterEach, expect, test } from 'vitest';
import { html } from '@gluonjs/core';
import { Button } from '@gluonjs/atoms';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';

afterEach(() => cleanupFixtures());

test('renders an operable starter control', () => {
  const fixture = renderFixture(() => Button({ label: 'Ready' }));
  expect(fixture.get<HTMLButtonElement>('button').textContent).toBe('Ready');
});
