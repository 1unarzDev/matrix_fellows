// Run against the Nuxt dev server. Checks real desktop/mobile shaders and assets.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, devices } from '@playwright/test'

const output = 'test-results/oasis-dressing'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ args: [
  '--no-sandbox', '--enable-gpu', '--use-gl=angle',
  '--use-angle=gl-egl', '--ignore-gpu-blocklist',
] })
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext(mobile
      ? { ...devices['iPhone 13'], defaultBrowserType: undefined }
      : { viewport: { width: 1440, height: 960 } })
    const page = await context.newPage()
    const errors = [], assets = new Set()
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('response', response => {
      if (/\/models\/desert\/.*\.glb/.test(response.url()) && response.ok()) assets.add(response.url())
    })
    await page.goto(process.env.TEST_BASE_URL || 'http://localhost:3000')
    await page.locator('[data-ready="true"]').waitFor({ timeout: 60000 })
    for (const progress of [0, .6, 1, 1.75, 2.05, 1]) {
      await page.evaluate(progress => {
        const sections = [...document.querySelectorAll('[data-chapter]')]
        const index = Math.floor(progress)
        window.scrollTo({ behavior: 'instant', top: sections[index].offsetTop +
          (sections[index + 1].offsetTop - sections[index].offsetTop) * (progress - index) })
      }, progress)
      await page.waitForTimeout(3000)
      await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${progress}.png` })
      const state = await page.locator('canvas').evaluate(canvas => ({ ...canvas.dataset }))
      assert.ok(Math.abs(Number(state.progress) - progress) < .05, `Scene did not settle: ${JSON.stringify(state)}`)
    }
    assert.equal(assets.size, 8, 'All eight compact dressing assets must load')
    assert.deepEqual(errors, [], 'No renderer, shader or page errors')
    console.log(`${mobile ? 'Mobile emulation' : 'Desktop'}: eight assets loaded; crest, oasis, flood and reverse checked`)
    await context.close()
  }
} finally {
  await browser.close()
}
