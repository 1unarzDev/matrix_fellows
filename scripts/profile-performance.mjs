// Production-build profiler. Separates cold-start milestones from the expensive
// research-to-depth transition and can pause WebGL to isolate main-thread work.
import { chromium, devices } from '@playwright/test'

const base = process.env.TEST_BASE_URL || 'http://localhost:8787'
const software = process.env.PROFILE_GPU === 'software'
const modes = (process.env.PROFILE_MODES || 'normal,paused-webgl').split(',')
const browser = await chromium.launch({
  args: software
    ? ['--no-sandbox', '--enable-unsafe-swiftshader']
    : [
        '--no-sandbox',
        '--enable-gpu',
        '--use-gl=angle',
        '--use-angle=gl-egl',
        '--ignore-gpu-blocklist',
      ],
})

try {
  const reports = []
  for (const mode of modes) {
    const context = await browser.newContext({ ...devices['iPhone 13'] })
    await context.addInitScript(() => {
      globalThis.__matrixProfile = { lcp: 0, longTasks: [], longFrames: [] }
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) globalThis.__matrixProfile.lcp = entry.startTime
      }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          globalThis.__matrixProfile.longTasks.push({
            start: entry.startTime,
            duration: entry.duration,
          })
      }).observe({ type: 'longtask', buffered: true })
      if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'))
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            globalThis.__matrixProfile.longFrames.push({
              start: entry.startTime,
              duration: entry.duration,
              blocking: entry.blockingDuration,
            })
        }).observe({ type: 'long-animation-frame', buffered: true })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    const started = performance.now()
    await page.goto(`${base}/#research`, { waitUntil: 'domcontentloaded' })
    const domReady = performance.now() - started
    await page.locator('[data-ready="true"]').waitFor()
    const hydrated = performance.now() - started
    const canvas = page.locator('canvas[data-first-scene-ms]')
    await canvas.waitFor({ timeout: 30000 })
    await page.locator('canvas.opacity-100').waitFor({ timeout: 30000 })
    const cinematicReady = performance.now() - started
    await page.locator('[data-horizon-preview][data-scene-state="ready"]').waitFor({
      state: 'attached',
      timeout: 30000,
    })
    await page.waitForTimeout(350)
    const previewSettled = performance.now() - started
    if (mode === 'paused-webgl') {
      await canvas.evaluate((element) => {
        element.style.display = 'none'
      })
      await page.waitForTimeout(250)
    }
    const journey = await page.evaluate(async () => {
      const from = document.querySelector('#research').offsetTop
      const to = document.querySelector('#frontiers').offsetTop
      const intervals = []
      let previous = performance.now()
      const start = previous
      await new Promise((resolve) => {
        const sample = (now) => {
          intervals.push(now - previous)
          previous = now
          window.scrollTo(0, from + (to - from) * Math.min(1, (now - start) / 3000))
          if (now - start < 3000) requestAnimationFrame(sample)
          else resolve()
        }
        requestAnimationFrame(sample)
      })
      intervals.sort((a, b) => a - b)
      const resources = performance.getEntriesByType('resource')
      const profile = globalThis.__matrixProfile
      return {
        median: intervals[Math.floor(intervals.length * 0.5)],
        p95: intervals[Math.floor(intervals.length * 0.95)],
        frames: intervals.length,
        lcp: profile.lcp,
        longTaskTime: profile.longTasks.reduce((sum, entry) => sum + entry.duration, 0),
        longTaskCount: profile.longTasks.length,
        longFrameTime: profile.longFrames.reduce((sum, entry) => sum + entry.duration, 0),
        longFrameCount: profile.longFrames.length,
        transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
        resourceCount: resources.length,
        canvas: { ...document.querySelector('canvas[data-first-scene-ms]')?.dataset },
      }
    })
    reports.push({
      mode,
      software,
      domReady,
      hydrated,
      cinematicReady,
      previewSettled,
      ...journey,
      errors,
    })
    await context.close()
  }
  console.log(JSON.stringify(reports, null, 2))
  if (reports.some((report) => report.errors.length)) process.exitCode = 1
} finally {
  await browser.close()
}
