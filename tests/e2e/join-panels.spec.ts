import { expect, test } from '@playwright/test'

test('mobile join panels have readable individual surfaces without displacing the form', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 360, 390, 430, 520, 600, 640, 768, 1024, 1180, 1279, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/join')
    await expect(page.locator('[data-join-form-ready="true"]')).toBeVisible()
    const cards = page.locator('.join-promise')
    await expect(cards).toHaveCount(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width < 640) {
      const boxes = await cards.evaluateAll((elements) =>
        elements.map((el) => {
          const bounds = el.getBoundingClientRect()
          const icon = el.querySelector('.join-promise__icon')!.getBoundingClientRect()
          return {
            top: bounds.top,
            bottom: bounds.bottom,
            iconWidth: icon.width,
            fontSize: parseFloat(getComputedStyle(el.querySelector('p')!).fontSize),
            radius: parseFloat(getComputedStyle(el).borderRadius),
          }
        }),
      )
      expect(boxes[1]!.top - boxes[0]!.bottom).toBeGreaterThanOrEqual(12)
      expect(boxes[2]!.top - boxes[1]!.bottom).toBeGreaterThanOrEqual(12)
      for (const box of boxes) {
        expect(box.iconWidth).toBeGreaterThanOrEqual(24)
        expect(box.fontSize).toBeGreaterThanOrEqual(12)
        expect(box.radius).toBeGreaterThanOrEqual(16)
      }
      expect((await page.locator('#join-form').boundingBox())!.y).toBeLessThanOrEqual(820)
    }
    if (width < 1280) {
      const alignment = await page.locator('.join-intro').evaluate((el) => {
        const title = el.querySelector('h1')!.getBoundingClientRect()
        const description = el.querySelector(':scope > p')!.getBoundingClientRect()
        const form = document.querySelector('#join-form')!.getBoundingClientRect()
        return {
          titleX: title.x,
          descriptionX: description.x,
          formX: form.x,
          titleHeight: title.height,
        }
      })
      expect(Math.abs(alignment.titleX - alignment.descriptionX)).toBeLessThanOrEqual(1)
      expect(Math.abs(alignment.titleX - alignment.formX)).toBeLessThanOrEqual(1)
      expect(alignment.titleHeight).toBeLessThanOrEqual(220)
      const colors = await cards
        .locator('.join-promise__icon')
        .evaluateAll((elements) => elements.map((el) => getComputedStyle(el).color))
      expect(new Set(colors).size).toBe(1)
    }
    await page.screenshot({
      path: `/tmp/matrix-join-refinement/after-${width}-${info.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  // The decorative upgrade must not make noninteractive cards into keyboard stops.
  await expect(page.locator('.join-promises').getByRole('button')).toHaveCount(0)
  await expect(page.locator('.join-promise').first()).toHaveCSS('transition-duration', '0s')
})
