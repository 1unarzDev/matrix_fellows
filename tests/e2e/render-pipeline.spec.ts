import { expect, test } from '@playwright/test'

test('route teardown during shader preparation leaves no live renderer or rejected tasks', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?matrixProfile=1')
  await page.locator('canvas[data-engine]').waitFor()
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/guides"]')!.click())
  await expect(page).toHaveURL(/\/guides/)
  await expect
    .poll(() => page.evaluate(() => Boolean((window as any).__matrixWorldDebug)))
    .toBe(false)
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
})

test('an active meteor disappears on reverse navigation out of the cosmic scene', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile')
  await page.goto('/?matrixProfile=1#connection')
  await page.locator('canvas.opacity-100').waitFor()
  await expect
    .poll(() => page.evaluate(() => (window as any).__matrixWorldDebug.snapshot().meteorActive), {
      timeout: 15_000,
    })
    .toBe(true)
  await page
    .locator('#discovery')
    .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
  await expect
    .poll(() => page.evaluate(() => (window as any).__matrixWorldDebug.snapshot().meteorVisibility))
    .toBe(0)
  await expect
    .poll(() => page.evaluate(() => (window as any).__matrixWorldDebug.snapshot().compositeVariant))
    .toBe('plain')
})

test('specialized world and composite preserve the frozen rendered image', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile')
  test.setTimeout(90_000)
  await page.goto('/?matrixProfile=1')
  await page.locator('canvas.opacity-100').waitFor()
  await expect(page.locator('canvas')).toHaveAttribute('data-framebuffers-warm', 'true')
  const shot = () =>
    page.locator('canvas[data-engine]').screenshot({
      style:
        'body * { visibility: hidden !important; } canvas[data-engine] { visibility: visible !important; }',
    })
  for (const progress of [0.8, 1.8, 4.4]) {
    await page.evaluate((progress) => {
      const debug = (window as any).__matrixWorldDebug
      debug.freeze(progress, 8)
      debug.useGeneralShader(true)
      debug.useGeneralComposite(true)
    }, progress)
    await page.waitForTimeout(300)
    const before = (await shot()).toString('base64')
    await page.evaluate(() => {
      const debug = (window as any).__matrixWorldDebug
      debug.useGeneralShader(false)
      debug.useGeneralComposite(false)
    })
    await page.waitForTimeout(300)
    const after = (await shot()).toString('base64')
    const difference = await page.evaluate(
      async ({ before, after }) => {
        const decode = async (data: string) => {
          const image = new Image()
          image.src = `data:image/png;base64,${data}`
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')!
          context.drawImage(image, 0, 0)
          return context.getImageData(0, 0, canvas.width, canvas.height).data
        }
        const a = await decode(before),
          b = await decode(after)
        let changed = 0,
          maxDelta = 0
        for (let i = 0; i < a.length; i++) {
          const delta = Math.abs(a[i]! - b[i]!)
          if (delta) changed++
          maxDelta = Math.max(maxDelta, delta)
        }
        return { maxDelta, fraction: changed / a.length }
      },
      { before, after },
    )
    expect(difference.maxDelta).toBeLessThanOrEqual(1)
    expect(difference.fraction).toBeLessThan(0.0001)
    const variant = await page.evaluate(
      () => (window as any).__matrixWorldDebug.snapshot().compositeVariant,
    )
    expect(variant).toBe(progress > 3.45 ? 'meteor' : 'plain')
  }
})

test('uses a prewarmed exact land shader and reverses at the first weather boundary', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.goto('/?matrixProfile=1')
  await page.locator('canvas.opacity-100').waitFor()
  for (const [progress, phase] of [
    [0.8, 'land'],
    [1.0599, 'land'],
    [1.0601, 'journey'],
    [1.4199, 'journey'],
    [1.4201, 'storm'],
    [1.5, 'storm'],
    [2.1, 'storm'],
    [2.1001, 'journey'],
    [0.8, 'land'],
  ] as const) {
    await page.evaluate(
      (progress) => (window as any).__matrixWorldDebug.freeze(progress, 8),
      progress,
    )
    await expect
      .poll(() => page.evaluate(() => (window as any).__matrixWorldDebug.snapshot().shaderPhase))
      .toBe(phase)
  }
})

test('scroll accents are scoped to visible content and navigation, not inherited across the whole document', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page
    .locator('#research')
    .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
  await expect
    .poll(() =>
      page.evaluate(() => {
        const chapter = document.querySelector<HTMLElement>('#research')!
        return chapter.style.getPropertyValue('--color-acid')
      }),
    )
    .not.toBe('')
  const state = await page.evaluate(() => ({
    root: document.documentElement.style.getPropertyValue('--color-acid'),
    chapter: getComputedStyle(document.querySelector('#research')!).getPropertyValue(
      '--color-acid',
    ),
    navigation: getComputedStyle(
      document.querySelector('[aria-label="Journey sections"]')!,
    ).getPropertyValue('--color-acid'),
  }))
  expect(state.root).toBe('')
  expect(state.navigation).toBe(state.chapter)
})

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
