// Long production-journey profiler. It records actual world render submissions,
// not just browser RAF callbacks. Emulation/SwiftShader remain device proxies.
import { chromium, devices } from '@playwright/test'

const base = process.env.TEST_BASE_URL || 'http://localhost:8787'
const duration = Number(process.env.PROFILE_DURATION_MS || 120_000)
const software = process.env.PROFILE_GPU === 'software'
const width = Number(process.env.PROFILE_WIDTH || 390)
const height = Number(process.env.PROFILE_HEIGHT || 844)
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

const percentile = (values, fraction) => {
  if (!values.length) return null
  const sorted = values.toSorted((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
}

try {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width, height },
    screen: { width, height },
  })
  await context.addInitScript(() => {
    window.__MATRIX_PROFILE__ = true
    window.__matrixStartup = { lcp: 0, longTasks: [], longFrames: [] }
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__matrixStartup.lcp = entry.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        window.__matrixStartup.longTasks.push({ start: entry.startTime, duration: entry.duration })
    }).observe({ type: 'longtask', buffered: true })
    if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'))
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          window.__matrixStartup.longFrames.push({
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
  const navigationStart = performance.now()
  await page.goto(`${base}/?matrixProfile=1`, { waitUntil: 'domcontentloaded' })
  const domReady = performance.now() - navigationStart
  await page.locator('[data-ready="true"]').waitFor()
  const hydrated = performance.now() - navigationStart
  const canvas = page.locator('canvas[data-progress]')
  await canvas.waitFor({ timeout: 30_000 })
  await page.locator('canvas.opacity-100').waitFor({ timeout: 30_000 })
  const cinematicReady = performance.now() - navigationStart

  const tapToPaint = await page.evaluate(async () => {
    const link = document.querySelector('[aria-label="Mobile sections"] a[href="#discovery"]')
    if (!(link instanceof HTMLElement)) return null
    const start = performance.now()
    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
    link.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }))
    link.click()
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return performance.now() - start
  })

  const trace = await page.evaluate(async (duration) => {
    const profile = window.__matrixWorldProfile
    if (!profile) throw new Error('World profile was not initialized')
    const main = document.querySelector('main')
    const maxScroll = document.documentElement.scrollHeight - innerHeight
    const journeyStart = performance.now() - profile.startedAt
    profile.events.push({ time: journeyStart, name: 'journey-start' })
    const start = performance.now()
    await new Promise((resolve) => {
      const drive = (now) => {
        const phase = ((now - start) / 20_000) % 2
        const progress = phase <= 1 ? phase : 2 - phase
        window.scrollTo(0, maxScroll * progress)
        if (now - start < duration) requestAnimationFrame(drive)
        else resolve()
      }
      requestAnimationFrame(drive)
    })
    const journeyEnd = performance.now() - profile.startedAt
    profile.events.push({ time: journeyEnd, name: 'journey-end' })
    return {
      profile: structuredClone(profile),
      startup: structuredClone(window.__matrixStartup),
      journeyStart,
      journeyEnd,
      mainHeight: main?.getBoundingClientRect().height || 0,
      canvas: { ...document.querySelector('canvas')?.dataset },
    }
  }, duration)

  const frames = trace.profile.frames.filter(
    (frame) => frame.time >= trace.journeyStart && frame.time <= trace.journeyEnd,
  )
  const windows = []
  for (let start = trace.journeyStart; start < trace.journeyEnd; start += 10_000) {
    const end = Math.min(start + 10_000, trace.journeyEnd)
    // Browser timers rarely land on the requested duration exactly. Do not
    // misreport the few trailing milliseconds as a separate ten-second gate.
    if (end - start < 9_000) break
    const windowFrames = frames.filter((frame) => frame.time >= start && frame.time < end)
    const intervals = windowFrames.flatMap((frame) =>
      frame.interval === null ? [] : [frame.interval],
    )
    windows.push({
      start: Math.round(start - trace.journeyStart),
      duration: Math.round(end - start),
      fps: (windowFrames.length * 1000) / (end - start),
      renderedP95: percentile(intervals, 0.95),
      stallsOver100: intervals.filter((value) => value > 100).length,
      maxInterval: intervals.length ? Math.max(...intervals) : null,
    })
  }
  const gpu = frames.flatMap((frame) => (frame.gpuMs === null ? [] : [frame.gpuMs]))
  const intervals = frames.flatMap((frame) => (frame.interval === null ? [] : [frame.interval]))
  const worstFrame = frames.reduce(
    (worst, frame) =>
      (frame.interval || 0) > (worst?.interval || 0) ? frame : worst,
    null,
  )
  const report = {
    environment: { software, width, height, duration, base },
    startup: {
      domReady,
      hydrated,
      cinematicReady,
      lcp: trace.startup.lcp,
      longTaskCount: trace.startup.longTasks.length,
      longTaskTime: trace.startup.longTasks.reduce((sum, entry) => sum + entry.duration, 0),
      longFrameCount: trace.startup.longFrames.length,
      tapToPaint,
    },
    journey: {
      renderedFrames: frames.length,
      fps: (frames.length * 1000) / (trace.journeyEnd - trace.journeyStart),
      renderedMedian: percentile(intervals, 0.5),
      renderedP95: percentile(intervals, 0.95),
      stallsOver100: intervals.filter((value) => value > 100).length,
      maxInterval: intervals.length ? Math.max(...intervals) : null,
      worstFrame,
      cpuSubmissionP95: percentile(
        frames.map((frame) => frame.cpuMs),
        0.95,
      ),
      gpuTiming: trace.profile.gpuTiming,
      gpuSamples: gpu.length,
      gpuP95: percentile(gpu, 0.95),
      rejectedGpuSamples: trace.profile.rejectedGpuSamples,
      maxCalls: Math.max(...frames.map((frame) => frame.calls)),
      maxTriangles: Math.max(...frames.map((frame) => frame.triangles)),
      maxPoints: Math.max(...frames.map((frame) => frame.points)),
      windows,
      qualityEvents: trace.profile.events.filter((event) => event.name === 'quality-degraded'),
      finalCanvas: trace.canvas,
    },
    errors,
  }
  console.log(JSON.stringify(report, null, 2))
  const windowsPass = windows.every(
    (window) => window.fps >= 28 && window.fps <= 30.5 && window.renderedP95 <= 50,
  )
  const noRecurringStalls = report.journey.stallsOver100 <= 1
  const interactionPass = tapToPaint !== null && tapToPaint <= 200
  if (!windowsPass || !noRecurringStalls || !interactionPass || errors.length) process.exitCode = 1
  await context.close()
} finally {
  await browser.close()
}
