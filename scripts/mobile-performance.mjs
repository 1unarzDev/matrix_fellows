// Controlled browser benchmark; software GPU results are not iPhone FPS claims.
import { chromium, devices } from '@playwright/test'
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ ...devices['iPhone 13'] })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('http://localhost:3000/#research')
  await page.locator('canvas[data-progress]').waitFor()
  await page.waitForTimeout(3500)
  const result = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas[data-progress]')
    const intervals = []
    let previous = performance.now()
    const start = previous
    const from = document.querySelector('#research').offsetTop
    const to = document.querySelector('#frontiers').offsetTop
    await new Promise(resolve => {
      const sample = now => {
        intervals.push(now - previous)
        previous = now
        window.scrollTo(0, from + (to - from) * Math.min(1, (now - start) / 6000))
        if (now - start < 6000) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    intervals.sort((a, b) => a - b)
    return { median: intervals[Math.floor(intervals.length * .5)], p95: intervals[Math.floor(intervals.length * .95)], frames: intervals.length, ...canvas.dataset }
  })
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(JSON.stringify(result, null, 2))
  if (result.p95 > 50) process.exitCode = 1
} finally { await browser.close() }
