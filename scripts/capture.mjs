import { chromium, devices } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const output = 'test-results/visual'
await mkdir(output, { recursive: true })
const args = process.env.SOFTWARE_GPU
  ? ['--no-sandbox', '--enable-unsafe-swiftshader']
  : [
      '--no-sandbox',
      '--enable-gpu',
      '--use-gl=angle',
      '--use-angle=gl-egl',
      '--ignore-gpu-blocklist',
    ]
const browser = await chromium.launch({ args })
const metrics = []
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext(
      mobile
        ? { ...devices['iPhone 13'], defaultBrowserType: undefined }
        : { viewport: { width: 1440, height: 960 } },
    )
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(process.env.TEST_BASE_URL || 'http://localhost:3000', {
      waitUntil: 'networkidle',
    })
    await page.locator('[data-ready="true"]').waitFor()
    for (const id of [
      'beginning',
      'discovery',
      'research',
      'frontiers',
      'connection',
      'community',
    ]) {
      await page
        .locator(`#${id}`)
        .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
      await page.waitForTimeout(4500)
      const metric = await page.locator('canvas').evaluate((canvas) => ({ ...canvas.dataset }))
      metrics.push({ device: mobile ? 'mobile-emulation' : 'desktop', chapter: id, ...metric })
      await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${id}.png` })
    }
    // Reverse navigation must return the world to the desert state.
    await page
      .locator('#beginning')
      .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
    await page.waitForTimeout(1500)
    if (Number(await page.locator('canvas').getAttribute('data-progress')) > 0.01)
      throw new Error('Reverse scroll did not reset the world')
    if (errors.length) throw new Error(errors.join('\n'))
    await context.close()
  }
  await writeFile(`${output}/metrics.json`, JSON.stringify(metrics, null, 2))
  console.log(JSON.stringify(metrics, null, 2))
} finally {
  await browser.close()
}
