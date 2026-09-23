import { devices, expect, test } from '@playwright/test'

test('high-density mobile screens retain a legible world render scale', async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')

  for (const deviceName of ['iPhone 13', 'iPad Pro 11']) {
    const context = await browser.newContext({ ...devices[deviceName] })
    const page = await context.newPage()
    await page.goto('/#frontiers')
    await expect(page.locator('[data-scene-state="ready"]')).toBeAttached()

    const resolution = await page.locator('canvas[data-engine]').evaluate((canvas) => ({
      devicePixelRatio,
      renderScale: canvas.width / canvas.clientWidth,
    }))

    expect(
      resolution.devicePixelRatio,
      `${deviceName} should emulate a high-density screen`,
    ).toBeGreaterThan(1)
    expect(
      resolution.renderScale,
      `${deviceName} should not render foreground particles and silhouettes at the visibly coarse 1.25× scale`,
    ).toBeGreaterThanOrEqual(1.5)

    await context.close()
  }
})
