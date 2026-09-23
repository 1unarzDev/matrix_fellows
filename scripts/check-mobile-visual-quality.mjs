import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, devices } from '@playwright/test'

const output = 'test-results/mobile-visual-quality'
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'
await mkdir(output, { recursive: true })

const browser = await chromium.launch({
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})

try {
  for (const [name, device] of [
    ['iphone', devices['iPhone 13']],
    ['ipad', devices['iPad (gen 7)']],
  ]) {
    const context = await browser.newContext({ ...device, defaultBrowserType: undefined })
    const page = await context.newPage()
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-ready="true"]').waitFor({ timeout: 60_000 })

    await page
      .locator('#discovery')
      .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(1_500)
    await page.screenshot({ path: `${output}/${name}-oasis.png` })

    const canvasState = await page.locator('canvas').evaluate((canvas) => ({
      pixelRatio: Number(canvas.dataset.pixelRatio),
      cssWidth: canvas.getBoundingClientRect().width,
      bufferWidth: canvas.width,
      devicePixelRatio: window.devicePixelRatio,
      palmTrunkParts: Number(canvas.dataset.palmTrunkParts),
      palmFoliageParts: Number(canvas.dataset.palmFoliageParts),
    }))

    await page
      .locator('#connection')
      .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
    // The first deterministic event begins at 3.8 active cosmic seconds. A
    // fixed sample avoids relying on the intentionally throttled DOM metrics.
    await page.waitForTimeout(4_150)
    await page.screenshot({ path: `${output}/${name}-meteor.png` })

    console.log(name, canvasState)
    assert.ok(
      canvasState.pixelRatio >= 1.5,
      `${name} foreground buffer is only ${canvasState.pixelRatio}x; thin lines and silhouettes will alias`,
    )
    assert.ok(canvasState.palmTrunkParts >= 1, `${name} oasis omitted the palm trunk geometry`)
    assert.ok(canvasState.palmFoliageParts >= 1, `${name} oasis omitted the palm foliage geometry`)
    await context.close()
  }
} finally {
  await browser.close()
}
