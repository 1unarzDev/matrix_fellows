import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, devices } from '@playwright/test'

const output = 'test-results/mobile-visual-quality'
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'
await mkdir(output, { recursive: true })

const browser = await chromium.launch({
  args:
    process.env.PROFILE_GPU === 'hardware'
      ? [
          '--no-sandbox',
          '--enable-gpu',
          '--use-gl=angle',
          '--use-angle=gl-egl',
          '--ignore-gpu-blocklist',
        ]
      : ['--no-sandbox', '--enable-unsafe-swiftshader'],
})

try {
  for (const [name, device] of [
    ['iphone', devices['iPhone 13']],
    ['ipad', devices['iPad (gen 7)']],
  ]) {
    const context = await browser.newContext({ ...device, defaultBrowserType: undefined })
    const page = await context.newPage()
    await page.goto(`${baseURL}/?matrixProfile=1`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-ready="true"]').waitFor({ timeout: 60_000 })
    await page.locator('canvas.opacity-100').waitFor({ timeout: 60_000 })
    if (process.env.PROFILE_REFERENCE === '1') {
      for (const [chapter, progress] of [
        ['ridge', 0.2],
        ['palms', 0.85],
        ['rain', 1.8],
        ['water', 2.35],
        ['caustics', 3],
        ['cosmos', 4.4],
      ]) {
        for (const [tier, ratio] of [
          ['initial', 1],
          ['reference', Math.min(device.deviceScaleFactor, 3)],
        ]) {
          await page.evaluate(
            ({ progress, ratio }) => {
              window.__matrixWorldDebug.freeze(progress, 8)
              window.__matrixWorldDebug.setQuality({ atmosphereRatio: ratio })
            },
            { progress, ratio },
          )
          await page.waitForTimeout(200)
          await page.locator('canvas[data-engine]').screenshot({
            path: `${output}/${name}-${chapter}-${tier}.png`,
            style:
              'body * { visibility: hidden !important; } canvas[data-engine] { visibility: visible !important; }',
          })
        }
      }
      await page.evaluate(() => window.__matrixWorldDebug.resume())
    }

    await page
      .locator('#beginning')
      .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(1_500)
    await page.screenshot({ path: `${output}/${name}-beginning.png` })

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
      atmosphereRatio: Number(canvas.dataset.atmosphereRatio),
      palmTrunkParts: Number(canvas.dataset.palmTrunkParts),
      palmFoliageParts: Number(canvas.dataset.palmFoliageParts),
    }))

    await page
      .locator('#research')
      .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(1_500)
    await page.screenshot({ path: `${output}/${name}-research.png` })

    await page
      .locator('#connection')
      .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
    // The first deterministic event begins at 3.8 active cosmic seconds. A
    // fixed sample avoids relying on the intentionally throttled DOM metrics.
    await page.waitForTimeout(4_150)
    await page.screenshot({ path: `${output}/${name}-meteor.png` })

    console.log(name, canvasState)
    assert.ok(
      canvasState.pixelRatio >= Math.min(canvasState.devicePixelRatio, 3),
      `${name} foreground buffer is only ${canvasState.pixelRatio}x on a ${canvasState.devicePixelRatio}x display; thin lines and silhouettes will be upscaled`,
    )
    assert.ok(
      canvasState.atmosphereRatio >= Math.min(canvasState.devicePixelRatio, 1),
      `${name} atmosphere is only ${canvasState.atmosphereRatio}x; each source sample spans more than two CSS pixels`,
    )
    assert.ok(canvasState.palmTrunkParts >= 1, `${name} oasis omitted the palm trunk geometry`)
    assert.ok(canvasState.palmFoliageParts >= 1, `${name} oasis omitted the palm foliage geometry`)
    await context.close()
  }
} finally {
  await browser.close()
}
