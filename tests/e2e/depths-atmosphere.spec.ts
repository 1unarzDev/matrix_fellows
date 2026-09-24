import { expect, test } from '@playwright/test'

test('Depths buoyancy is bounded, chapter-scoped, and reduced-motion safe', async (
  { page },
  testInfo,
) => {
  await page.goto('/#frontiers')
  await page.locator('[data-ready="true"]').waitFor()

  const panel = page.locator('[data-depths-panel]')
  await expect(panel).toHaveClass(/depths-panel--active/)
  if (testInfo.project.name === 'mobile') {
    await expect(panel).toHaveCSS('animation-name', 'none')
  } else {
    await expect(panel).toHaveCSS('animation-play-state', 'running')
  }

  const amplitude = await panel.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).getPropertyValue('--depths-drift')),
  )
  expect(amplitude).toBeLessThanOrEqual(1.5)

  await page.goto('/#discovery')
  await page.locator('[data-ready="true"]').waitFor()
  await expect(panel).not.toHaveClass(/depths-panel--active/)
  if (testInfo.project.name !== 'mobile')
    await expect(panel).toHaveCSS('animation-play-state', 'paused')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#frontiers')
  await page.locator('[data-ready="true"]').waitFor()
  await expect(panel).toHaveCSS('animation-name', 'none')
  await expect(panel.locator('.depths-current__line').first()).toHaveCSS('animation-name', 'none')
})
