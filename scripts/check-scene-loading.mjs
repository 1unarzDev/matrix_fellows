import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
const browser = await chromium.launch({
  args: [
    '--no-sandbox',
    '--enable-gpu',
    '--use-gl=angle',
    '--use-angle=gl-egl',
    '--ignore-gpu-blocklist',
  ],
})
try {
  for (const mode of ['normal', 'reduced', 'failure']) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
    })
    if (mode === 'failure')
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return /webgl/.test(type) ? null : original.call(this, type, ...args)
        }
      })
    if (mode === 'normal')
      await page.route('**/lib/scene/world.ts*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200))
        await route.continue()
      })
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-ready="true"]').waitFor()
    if (mode === 'normal') {
      assert.equal(
        await page.locator('[data-horizon-preview]').getAttribute('data-scene-state'),
        'pending',
      )
      assert.equal(await page.locator('[data-loading-orbit]').count(), 1)
      await page.screenshot({ path: '/tmp/matrix-loading-preview.png' })
    }
    const expected = mode === 'normal' ? 'ready' : 'fallback'
    await page.locator(`[data-scene-state="${expected}"]`).waitFor({ timeout: 15000 })
    assert.equal(await page.locator('[data-loading-orbit]').count(), 0)
    const preview = await page
      .locator('[data-horizon-preview]')
      .evaluate((el) => ({ pointerEvents: getComputedStyle(el).pointerEvents }))
    assert.equal(preview.pointerEvents, 'none')
    assert.ok(await page.locator('h1').isVisible())
    console.log(`${mode}: ${expected}, content visible, indicator stopped`)
    await page.close()
  }
} finally {
  await browser.close()
}
