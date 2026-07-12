import { expect, test } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
test('customer flow, persistence, SSR hydration, navigation, accessibility, and HMR', async ({ page }) => {
  await page.goto('/')
  expect(await page.evaluate(() => (window as typeof window & { __DX_SERVER_PRODUCT__?: Element }).__DX_SERVER_PRODUCT__ === document.querySelector('[data-product-title]'))).toBe(true)
  await page.getByLabel('Email').fill('buyer@example.test')
  await page.getByLabel('Quantity').fill('3')
  await page.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.getByText('3 × Evidence Tote for buyer@example.test')).toBeVisible()
  await page.goBack(); await expect(page.getByLabel('Quantity')).toHaveValue('3')
  await page.reload(); await expect(page.getByLabel('Email')).toHaveValue('buyer@example.test')
  await page.getByRole('button', { name: 'Reset' }).click(); await expect(page.getByLabel('Quantity')).toBeFocused()
  const path = new URL('../src/hmr-marker.ts', import.meta.url); const original = await readFile(path, 'utf8')
  try { await writeFile(path, original.replace('baseline', 'updated')); await expect(page.locator('[data-hmr-marker]')).toHaveText('updated'); await expect(page.getByLabel('Email')).toHaveValue('buyer@example.test') } finally { await writeFile(path, original) }
})
