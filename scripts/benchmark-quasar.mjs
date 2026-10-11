// Workspace quasar benchmark. Run with:
//   node --import tsx scripts/benchmark-quasar.mjs
// It uses the dashboard browser fixture so measurements exercise the shipped
// renderer, then reports real GL draw submissions, optional GPU timer samples,
// frame cadence, and fixed-time screenshots. Software SwiftShader output is a
// diagnostic proxy and must not be presented as device FPS.
import { chromium, devices } from '@playwright/test'
import { setup } from '../tests/fixtures/dashboard-browser.ts'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const outDir = process.env.QUASAR_OUTPUT || 'tmp/quasar-benchmark'
const mode = process.env.QUASAR_GPU === 'hardware' ? 'hardware' : 'software'
const gpuTimer = process.env.QUASAR_GPU_TIMER === '1'
const width = Number(process.env.QUASAR_WIDTH || 1440)
const height = Number(process.env.QUASAR_HEIGHT || 960)
const duration = Number(process.env.QUASAR_DURATION_MS || 5000)
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000'
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  args:
    mode === 'hardware'
      ? ['--no-sandbox', '--enable-gpu', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist']
      : ['--no-sandbox', '--enable-unsafe-swiftshader'],
})
const context = await browser.newContext({
  ...devices['Desktop Chrome'],
  viewport: { width, height },
  deviceScaleFactor: Number(process.env.QUASAR_DPR || 1),
})
// Install before app scripts create the Three renderer. This is deliberately
// scoped to WebGL draw calls on the quasar canvas and does not alter the app.
await context.addInitScript(({ gpuTimer }) => {
  const bench = { draws: [], gpu: [], timer: false, canvas: null }
  globalThis.__matrixQuasarBench = bench
  const original = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const gl = original.call(this, type, attrs)
    if (!gl || !/^webgl/.test(type) || gl.__matrixQuasarWrapped) return gl
    const canvas = this
    gl.__matrixQuasarWrapped = true
    bench.canvas = canvas
    bench.gl = gl
    const ext = gl.getExtension?.('EXT_disjoint_timer_query_webgl2') || gl.getExtension?.('EXT_disjoint_timer_query')
    if (gpuTimer && (ext || (gl.createQuery && gl.beginQuery && gl.endQuery))) bench.timer = true
    const methods = ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']
    for (const name of methods) {
      if (typeof gl[name] !== 'function') continue
      const draw = gl[name].bind(gl)
      const wrapped = (...args) => {
        if (canvas.classList.contains('workspace-quasar__canvas')) {
          const item = { t: performance.now(), query: null }
          if (gl.createQuery && gl.beginQuery && gl.endQuery && ext?.TIME_ELAPSED_EXT) {
            try {
              const query = gl.createQuery()
              gl.beginQuery(ext.TIME_ELAPSED_EXT, query)
              draw(...args)
              gl.endQuery(ext.TIME_ELAPSED_EXT)
              item.query = query
            } catch {
              draw(...args)
            }
          } else if (ext?.createQueryEXT) {
            try {
              const query = ext.createQueryEXT()
              ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query)
              draw(...args)
              ext.endQueryEXT(ext.TIME_ELAPSED_EXT)
              item.query = query
            } catch {
              draw(...args)
            }
          } else draw(...args)
          bench.draws.push(item)
          if (bench.draws.length > 3000) bench.draws.shift()
          return
        }
        return draw(...args)
      }
      try {
        Object.defineProperty(gl, name, { configurable: true, writable: true, value: wrapped })
      } catch {
        gl[name] = wrapped
      }
    }
    return gl
  }
}, { gpuTimer })

try {
  const page = await context.newPage()
  await setup(page)
  await page.route('**/api/workspace/auth/session', (route) =>
    route.fulfill({ json: { configured: true, authenticated: true, officer: { userId: 'bench', role: 'officer' } } }),
  )
  await page.route('**/api/workspace/auth/providers', (route) => route.fulfill({ json: { google: false, azure: false } }))
  await page.goto(`${base}/dashboard?section=today`, { waitUntil: 'domcontentloaded' })
  const canvas = page.locator('.workspace-quasar__canvas')
  await canvas.waitFor({ timeout: 30_000 })
  await page.waitForTimeout(Number(process.env.QUASAR_WARMUP_MS || 5000))
  if (process.env.QUASAR_ISOLATE !== '0') {
    // Keep the live canvas and its fixed-position ancestor, removing dashboard
    // work so this run measures the fragment pass rather than Vue layout.
    await page.evaluate(() => {
      const quasar = document.querySelector('.workspace-quasar')
      if (quasar?.parentElement) quasar.parentElement.replaceChildren(quasar)
    })
    await page.waitForTimeout(250)
  }
  await canvas.screenshot({ path: join(outDir, `${mode}-before.png`) })
  const result = await page.evaluate(async ({ duration }) => {
    const b = globalThis.__matrixQuasarBench
    const canvas = document.querySelector('.workspace-quasar__canvas')
    b.draws.length = 0
    const start = performance.now()
    const frames = []
    let previous = start
    await new Promise((resolve) => {
      const sample = (now) => {
        frames.push(now - previous)
        previous = now
        if (now - start < duration) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    // Let timer queries become available without blocking the render loop.
    await new Promise((resolve) => setTimeout(resolve, 100))
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl')
    const gpuMicros = []
    if (gl && b.timer) {
      const ext = gl.getExtension?.('EXT_disjoint_timer_query_webgl2') || gl.getExtension?.('EXT_disjoint_timer_query')
      for (const item of b.draws) {
        if (!item.query) continue
        try {
          const available = gl.getQuery && gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE)
          const value = available ? gl.getQueryParameter(item.query, gl.QUERY_RESULT) : null
          if (value != null) gpuMicros.push(Number(value) / 1000)
        } catch {
          try {
            if (ext?.getQueryObjectEXT(item.query, ext.QUERY_RESULT_AVAILABLE_EXT))
              gpuMicros.push(Number(ext.getQueryObjectEXT(item.query, ext.QUERY_RESULT_EXT)) / 1000)
          } catch {}
        }
      }
    }
    gpuMicros.sort((a, z) => a - z)
    const intervals = frames.toSorted((a, z) => a - z)
    const percentile = (p) => intervals.length ? intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * p))] : null
    return {
      duration,
      frames: frames.length,
      callbackFps: frames.length * 1000 / duration,
      callbackMedianMs: percentile(0.5),
      callbackP95Ms: percentile(0.95),
      drawCalls: b.draws.length,
      drawFps: b.draws.length * 1000 / duration,
      gpuTimerAvailable: b.timer,
      gpuSamples: gpuMicros.length,
      gpuMedianMs: gpuMicros.length ? gpuMicros[Math.floor(gpuMicros.length * 0.5)] : null,
      gpuP95Ms: gpuMicros.length ? gpuMicros[Math.floor(gpuMicros.length * 0.95)] : null,
      canvas: canvas ? { width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight } : null,
    }
  }, { duration })
  await canvas.screenshot({ path: join(outDir, `${mode}-after.png`) })
  console.log(JSON.stringify({ mode, width, height, dpr: Number(process.env.QUASAR_DPR || 1), ...result }, null, 2))
} finally {
  await context.close()
  await browser.close()
}
