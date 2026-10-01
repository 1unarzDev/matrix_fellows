import { devices, expect, test } from '@playwright/test'

test('high-density mobile screens retain a legible world render scale', async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')

  for (const deviceName of ['iPhone 13', 'iPad Pro 11']) {
    const context = await browser.newContext({ ...devices[deviceName] })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('[data-scene-state="ready"]')).toBeAttached()

    const resolution = await page.locator('canvas[data-engine]').evaluate((canvas) => ({
      devicePixelRatio,
      renderScale: canvas.width / canvas.clientWidth,
      atmosphereScale: Number(canvas.dataset.atmosphereRatio),
    }))

    expect(
      resolution.devicePixelRatio,
      `${deviceName} should emulate a high-density screen`,
    ).toBeGreaterThan(1)
    expect(
      resolution.renderScale,
      `${deviceName} should retain the bounded Retina foreground scale`,
    ).toBeGreaterThanOrEqual(Math.min(resolution.devicePixelRatio, 3) - 0.01)
    expect(resolution.atmosphereScale).toBeGreaterThanOrEqual(1)

    await page
      .locator('#research')
      .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
    await expect(page.locator('canvas[data-engine]')).toHaveAttribute('data-progress', /^2\./)
    expect(
      Number(await page.locator('canvas[data-engine]').getAttribute('data-atmosphere-ratio')),
    ).toBeGreaterThanOrEqual(1)
    // Invisible constellation ribbons should not execute a storm-frame draw.
    await expect(page.locator('canvas[data-engine]')).toHaveAttribute('data-draw-calls', '3')

    await context.close()
  }
})
