import { test, expect } from '@playwright/test'

test('unexplored marker draws an orbit on hover and returns cleanly', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const marker = page.locator('[data-hero-detail]').filter({ hasText: 'The unexplored' })
  await expect(marker).toBeVisible()
  const orbit = marker.locator('ellipse')
  await expect(orbit).toHaveCSS('stroke-dashoffset', '1px')
  await marker.hover()
  await expect(orbit).toHaveCSS('stroke-dashoffset', '0px')
  await page.mouse.move(5, 5)
  await expect(orbit).toHaveCSS('stroke-dashoffset', '1px')
})

test('timeline dots have room for their hover halo within the scrollport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#community')
  const rail = page.getByRole('tablist').first()
  await expect(rail).toBeVisible()
  const clearance = await rail.evaluate(element => {
    const box = element.getBoundingClientRect()
    const dot = element.querySelector('[data-timeline-dot]')!.getBoundingClientRect()
    return dot.top - box.top
  })
  expect(clearance).toBeGreaterThanOrEqual(20)
})
