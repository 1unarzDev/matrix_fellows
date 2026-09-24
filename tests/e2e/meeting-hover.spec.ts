import { expect, test } from '@playwright/test'

test('hero meeting panel eases into its lifted hover state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Hover motion is pointer-specific')
  await page.goto('/')

  const panel = page.locator('[class*="group/meeting"]')
  await expect(panel).toBeVisible()
  const transitionProperties = await panel.evaluate(
    (element) => getComputedStyle(element).transitionProperty,
  )
  expect(transitionProperties).toContain('scale')
  expect(transitionProperties).toContain('translate')

  await panel.hover()
  await page.waitForTimeout(80)
  const scale = Number(await panel.evaluate((element) => getComputedStyle(element).scale))
  expect(scale).toBeGreaterThan(1)
  expect(scale).toBeLessThan(1.01)
})
