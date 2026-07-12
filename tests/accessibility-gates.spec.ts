import { beforeEach, expect, test } from 'vitest';
import axe, { type Result } from 'axe-core';
import { adoptStyles } from '../src/index.js';
import { nextTick } from '@gluonjs/reactivity';
import { createMemoryHistory } from '@gluonjs/router';
import { createShopApplication } from '../examples/shop/src/app.js';
import { shopStyles } from '../examples/shop/src/styles.js';

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  adoptStyles(document, shopStyles);
});

test('keeps the GLUON GOODS customer journey free of automated WCAG A/AA violations', async () => {
  const { app, router } = createShopApplication(createMemoryHistory(['/']), { storage: null });
  await router.isReady();
  const root = document.createElement('div');
  document.body.append(root);
  app.mount(root);

  await expectNoViolations('home');
  root.querySelector<HTMLAnchorElement>('[aria-label^="Orbit Lamp"]')!.click();
  await settle();
  await expectNoViolations('product detail');
  root.querySelector('gluon-product-configurator')!
    .shadowRoot!.querySelector<HTMLButtonElement>('.add-to-bag')!.click();
  await settle();
  await expectNoViolations('bag dialog');
  document.querySelector<HTMLAnchorElement>('.bag-summary a')!.click();
  await settle();
  await expectNoViolations('checkout');

  app.unmount();
  router.destroy();
});

async function expectNoViolations(surface: string): Promise<void> {
  await settleFiniteAnimations();
  const results = await axe.run(document, {
    resultTypes: ['violations'],
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
    },
  });
  expect(results.violations, formatViolations(surface, results.violations)).toEqual([]);
}

async function settleFiniteAnimations(): Promise<void> {
  const animations = document.getAnimations().filter((animation) => {
    const iterations = animation.effect?.getTiming().iterations;
    return iterations !== Infinity;
  });
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
}

function formatViolations(surface: string, violations: readonly Result[]): string {
  if (violations.length === 0) return `${surface}: no automated accessibility violations`;
  return `${surface} accessibility violations:\n${violations.map((violation) => [
    `- ${violation.id}: ${violation.help}`,
    ...violation.nodes.map((node) => `  ${node.target.join(' ')} — ${node.failureSummary ?? 'failed'}`),
  ].join('\n')).join('\n')}`;
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
