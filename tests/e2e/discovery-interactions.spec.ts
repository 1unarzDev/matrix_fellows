import { test, expect } from '@playwright/test'

test('discovery thought follows the pointer and reveals as one composition', async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name === 'mobile', 'Hover interaction requires a fine pointer')
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/#discovery')
  await page.locator('[data-ready="true"]').waitFor()

  const reveal = page.locator('[data-discovery-reveal]')
  await reveal.scrollIntoViewIfNeeded()
  const bounds = await reveal.boundingBox()
  expect(bounds).not.toBeNull()

  await page.mouse.move(bounds!.x + bounds!.width * 0.68, bounds!.y + bounds!.height * 0.42)
  await expect(reveal.locator('.discovery-reveal__alternate')).toHaveCSS('opacity', '1')
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '0')

  const point = await reveal.evaluate((element) => ({
    x: Number.parseFloat(getComputedStyle(element).getPropertyValue('--reveal-x')),
    y: Number.parseFloat(getComputedStyle(element).getPropertyValue('--reveal-y')),
  }))
  expect(point.x).toBeCloseTo(bounds!.width * 0.68, 0)
  expect(point.y).toBeCloseTo(bounds!.height * 0.42, 0)

  await page.mouse.move(1300, 100)
  await expect(reveal.locator('.discovery-reveal__alternate')).toHaveCSS('opacity', '0')
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '1')
})

test('discovery interactions are keyboard reachable and respect reduced motion', async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name === 'mobile', 'Keyboard focus treatment is tested on desktop')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#discovery')
  await page.locator('[data-ready="true"]').waitFor()

  const reveal = page.locator('[data-discovery-reveal]')
  await reveal.scrollIntoViewIfNeeded()
  await reveal.focus()
  await expect(reveal).toBeFocused()
  await expect(reveal.locator('.discovery-reveal__alternate')).toHaveCSS('opacity', '1')
  await expect(reveal.locator('.discovery-reveal__bloom')).toHaveCSS('transition-duration', '0s')

  const compass = page.getByRole('link', { name: 'Find a research idea — explore the guide' })
  await expect(compass).toHaveAttribute('href', '/guides/find-a-research-idea')
  await expect(compass.locator('svg path').first()).toHaveCSS('transition-property', 'none')
})

test('touch layouts keep the primary discovery copy without requiring hover', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#discovery')

  const reveal = page.locator('[data-discovery-reveal]')
  await reveal.scrollIntoViewIfNeeded()
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '1')
  await expect(reveal.locator('.discovery-reveal__alternate')).toHaveCSS('opacity', '0')
  await expect(page.getByText('Curiosity finds', { exact: false })).toBeVisible()
})
