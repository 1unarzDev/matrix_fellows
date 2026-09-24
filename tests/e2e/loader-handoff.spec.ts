import { expect, test } from '@playwright/test'

test('the arrival veil overlaps scene readiness before fading away', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Desktop WebGL readiness drives the full dune reveal',
  )
  await page.goto('/')

  const veil = page.locator('[data-horizon-preview]')
  const loader = page.locator('[data-loading-orbit]')
  await expect(veil).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 })
  await expect(veil).toHaveAttribute('data-handoff', 'fading', { timeout: 10_000 })
  await expect(loader).toBeAttached()
  await expect(veil).toHaveCSS('transition-duration', '1.4s')
  await expect(veil).toHaveCSS('transition-property', 'opacity')

  await expect(veil).toHaveAttribute('data-handoff', 'complete', { timeout: 2_000 })
  await expect(veil).toHaveCSS('opacity', '0')
  await expect(loader).toBeHidden()
})
