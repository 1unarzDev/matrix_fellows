import { expect, test } from '@playwright/test'

test('homepage opportunities use neutral transparent glass', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#community')

  const card = page.locator('.opportunity-card').first()
  await expect(card).toBeVisible()
  const surface = await card.evaluate((element) => {
    const style = getComputedStyle(element)
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    context.fillStyle = style.backgroundColor
    context.fillRect(0, 0, 1, 1)
    return {
      color: [...context.getImageData(0, 0, 1, 1).data],
      image: style.backgroundImage,
    }
  })
  expect(surface.image).toBe('none')
  expect(surface.color[3]).toBeGreaterThanOrEqual(2)
  expect(surface.color[3]).toBeLessThanOrEqual(4)
})

test('join popup follows the calendar popup surface and motion contract', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop hover and modal motion contract')
  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Open join form' }).click()

  const backdrop = page.locator('.join-backdrop')
  const panel = page.locator('.join-panel')
  await expect(panel).toBeAttached()
  const motion = await panel.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      property: style.transitionProperty,
      duration: style.transitionDuration,
      easing: style.transitionTimingFunction,
    }
  })
  expect(motion.property).toBe('opacity, translate, scale')
  expect(motion.duration).toBe('0.26s, 0.42s, 0.42s')
  expect(motion.easing).toContain('cubic-bezier(0.16, 1, 0.3, 1)')

  await expect(panel).toBeVisible()
  const theme = await page.evaluate(() => {
    const read = (selector: string) => {
      const style = getComputedStyle(document.querySelector(selector)!)
      return {
        backgroundColor: style.backgroundColor,
        backdropFilter: style.backdropFilter,
        borderRadius: style.borderRadius,
      }
    }
    return {
      backdrop: read('.join-backdrop'),
      panel: read('.join-panel'),
    }
  })
  expect(theme.backdrop.backgroundColor).toBe('rgba(5, 8, 8, 0.76)')
  expect(theme.backdrop.backdropFilter).toBe('blur(12px)')
  expect(theme.panel.backdropFilter).toBe('blur(18px) saturate(1.18)')
  expect(theme.panel.borderRadius).toBe('24px')
})
