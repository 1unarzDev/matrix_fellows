import assert from 'node:assert/strict'
import { chromium, devices } from '@playwright/test'

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })

try {
  const context = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 1_500_000 / 8,
    uploadThroughput: 750_000 / 8,
  })
  await page.addInitScript(() => {
    globalThis.__matrixLongTasks = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) globalThis.__matrixLongTasks.push(entry.duration)
    }).observe({ type: 'longtask', buffered: true })
  })

  const coldStart = performance.now()
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  const domReady = performance.now() - coldStart
  await page.locator('[data-ready="true"]').waitFor()
  assert.ok(await page.getByText('Meetings', { exact: true }).isVisible())
  assert.equal(await page.locator('[data-arrival-veil], [data-loading-orbit]').count(), 0)

  const inputStart = performance.now()
  await page
    .getByRole('navigation', { name: 'Mobile sections' })
    .getByRole('link', {
      name: 'Research',
      exact: true,
    })
    .click()
  await page.waitForURL(/#research$/)
  const inputResponse = performance.now() - inputStart
  await page.locator('canvas[data-first-scene-ms]').waitFor({ timeout: 30000 })
  await page.locator('canvas[data-progress^="2."]').waitFor({ timeout: 30000 })
  const coldUsable = performance.now() - coldStart
  const cold = await page.evaluate(() => ({
    longTasks: globalThis.__matrixLongTasks,
    canvas: { ...document.querySelector('canvas')?.dataset },
  }))

  const warmStart = performance.now()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('[data-ready="true"]').waitFor()
  await page.locator('canvas[data-first-scene-ms]').waitFor({ timeout: 30000 })
  const warmUsable = performance.now() - warmStart

  console.log(JSON.stringify({ domReady, inputResponse, coldUsable, warmUsable, ...cold }, null, 2))
  assert.ok(inputResponse < 1000, `early navigation response took ${inputResponse.toFixed(1)} ms`)
  assert.ok(coldUsable < 30000, 'cold scene did not become usable within watchdog window')
} finally {
  await browser.close()
}
