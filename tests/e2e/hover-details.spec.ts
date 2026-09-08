import { test, expect } from '@playwright/test'

test('timeline hover keeps dates and checkpoint markers stationary', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  const tab = page.getByRole('tablist').first().getByRole('tab').first()
  await tab.hover()
  for (const selector of ['[data-timeline-date]', '[data-timeline-dot]']) {
    const element = tab.locator(selector)
    await expect(element).toHaveCSS('translate', 'none')
    await expect(element).toHaveCSS('transform', 'none')
    await expect(element).toHaveCSS('scale', 'none')
  }
  await tab.focus()
  await expect(tab.locator('[data-timeline-date]')).toHaveCSS('translate', 'none')
})

test('hover gestures use slow easing without delaying interaction', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#community')
  const dot = page.locator('[data-timeline-dot]').first()
  await expect(dot).toHaveCSS('transition-duration', '2s')
  await expect(dot).toHaveCSS('transition-timing-function', 'cubic-bezier(0.45, 0, 0.25, 1)')
  await expect(dot).toHaveCSS('transition-delay', '0s')
  const orbit = page.locator('[data-hero-detail] ellipse')
  await expect(orbit).toHaveCSS('transition-duration', '2.4s')
  await expect(orbit).toHaveCSS('transition-timing-function', 'cubic-bezier(0.45, 0, 0.25, 1)')
})

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
