import { test, expect } from '@playwright/test'

test('public icons never depend on emoji arrow glyphs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/[↗⬅➡⬇]/u)
})

test('browser chrome has a dark first-paint surface', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark')
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/)
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(16, 20, 19)')
})

test('mobile toolbar resizing does not reallocate the WebGL surface', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile')
  await page.goto('/#discovery')
  const canvas = page.locator('canvas:not([data-arrival-veil])')
  await expect(canvas).toHaveAttribute('data-progress', /^1\./, { timeout: 20000 })
  const before = await canvas.getAttribute('height')
  await page.setViewportSize({ width: 390, height: 780 })
  await page.waitForTimeout(500)
  expect(await canvas.getAttribute('height')).toBe(before)
})

test('mobile camera settles after a touch-sized scroll step and keeps foreground sharp', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('/#research')
  const canvas = page.locator('canvas[data-progress]')
  await expect(canvas).toHaveAttribute('data-progress', /^2\./, { timeout: 20000 })
  await expect(canvas).toHaveCSS('opacity', '1', { timeout: 20000 })
  await expect(canvas).toHaveAttribute('data-pixel-ratio', '1.00')
  const before = Number(await canvas.getAttribute('data-progress'))
  await page.evaluate(() => window.scrollBy(0, 160))
  await expect.poll(async () => Number(await canvas.getAttribute('data-progress'))).toBeGreaterThan(before)
  await page.waitForTimeout(1000)
  const settled = Number(await canvas.getAttribute('data-progress'))
  await page.waitForTimeout(300)
  expect(Math.abs(Number(await canvas.getAttribute('data-progress')) - settled)).toBeLessThan(.003)
  expect(Number(await canvas.getAttribute('data-atmosphere-ratio'))).toBeLessThan(1)
  expect(errors).toEqual([])
})
