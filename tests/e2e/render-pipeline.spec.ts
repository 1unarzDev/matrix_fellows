import { expect, test } from '@playwright/test'

test('quality changes resize actual buffers and change executed desktop passes and uniforms', async ({
  page,
}, testInfo) => {
  await page.goto('/?matrixProfile=1')
  await page.waitForFunction(() => Boolean((window as any).__matrixWorldDebug))
  await page.locator('canvas.opacity-100').waitFor()
  const result = await page.evaluate(async () => {
    const debug = (window as any).__matrixWorldDebug
    debug.freeze(0.8, 8)
    const frame = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    await frame()
    const before = debug.snapshot()
    debug.setQuality({
      atmosphereRatio: 0.9,
      foregroundRatio: 1,
      detail: false,
      halo: false,
      particleFraction: 0.75,
    })
    await frame()
    const lower = debug.snapshot()
    debug.setQuality(before.quality)
    await frame()
    return { before, lower, recovered: debug.snapshot() }
  })
  expect(result.lower.buffer.width).toBe(Math.floor(result.lower.css.width))
  expect(result.lower.detailUniform).toBe(0)
  expect(result.lower.haloUniform).toBe(0)
  expect(result.lower.particleCount).toBe(9000)
  expect(result.recovered.buffer).toEqual(result.before.buffer)
  expect(result.recovered.atmosphere).toEqual(result.before.atmosphere)
  expect(result.recovered.detailUniform).toBe(1)
  expect(result.recovered.particleCount).toBe(12000)
  if (testInfo.project.name === 'desktop') {
    expect(result.lower.composer.width).toBe(result.lower.buffer.width)
    expect(result.lower.bloomEnabled).toBe(false)
    expect(result.recovered.bloomEnabled).toBe(true)
    expect(result.recovered.drawCalls).toBeGreaterThan(result.lower.drawCalls)
  } else {
    expect(result.lower.atmosphere.width).toBe(Math.round(result.lower.css.width * 0.9))
    expect(result.before.buffer.width).toBe(result.before.css.width * 3)
  }
})

test('coalesces a burst to the latest camera state, preserves bounds, and tears down profiling', async ({
  page,
}) => {
  await page.goto('/?matrixProfile=1')
  await page.waitForFunction(() => Boolean((window as any).__matrixWorldDebug))
  await page.locator('canvas.opacity-100').waitFor()
  const result = await page.evaluate(async () => {
    const debug = (window as any).__matrixWorldDebug
    const before = debug.snapshot()
    for (let index = 0; index < 100; index++) debug.setProgress(0.8 + index / 1000)
    const pending = debug.snapshot()
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return { before, pending, after: debug.snapshot() }
  })
  expect(result.pending.cameraUpdates).toBe(result.before.cameraUpdates)
  expect(result.after.cameraUpdates).toBe(result.before.cameraUpdates + 1)
  expect(result.after.progress).toBeCloseTo(0.899)
  await page.setViewportSize({ width: 844, height: 390 })
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const state = (window as any).__matrixWorldDebug.snapshot()
        const bounds = document.querySelector('canvas')!.getBoundingClientRect()
        return Math.abs(state.buffer.width / state.buffer.height - bounds.width / bounds.height)
      }),
    )
    .toBeLessThan(0.003)
  await page.locator('a[href="/guides"]').last().click()
  await expect(page).toHaveURL(/\/guides/)
  await expect
    .poll(() => page.evaluate(() => Boolean((window as any).__matrixWorldDebug)))
    .toBe(false)
})
