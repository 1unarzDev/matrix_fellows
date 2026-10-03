import { expect, test } from '@playwright/test'

test('document motion keeps active cadence after the camera reaches its final chapter', async ({
  page,
}) => {
  await page.goto('/?matrixProfile=1')
  await expect(page.locator('canvas[data-engine]')).toHaveCSS('opacity', '1')
  const result = await page.evaluate(async () => {
    const community = document.querySelector<HTMLElement>('#community')!
    const startY = community.offsetTop + 300
    window.scrollTo(0, startY)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const profile = (window as any).__matrixWorldProfile
    const before = (window as any).__matrixWorldDebug.snapshot()
    const first = profile.frames.length
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const step = () => {
        window.scrollTo(0, startY + (performance.now() - start) / 4)
        if (performance.now() - start < 2500) requestAnimationFrame(step)
        else resolve()
      }
      step()
    })
    const targets = profile.frames.slice(first).map((frame: any) => frame.targetFps)
    const endY = scrollY
    const after = (window as any).__matrixWorldDebug.snapshot()
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return { startY, endY, targets, before, after, idle: profile.frames.at(-1).targetFps }
  })
  expect(result.endY - result.startY).toBeGreaterThan(500)
  expect(result.targets.length).toBeGreaterThan(10)
  expect(result.before.progress).toBe(5)
  expect(result.after.progress).toBe(5)
  expect(result.after.cameraUpdates).toBe(result.before.cameraUpdates)
  // The first submitted frame may precede the scroll callback.
  expect(result.targets.slice(2).every((target: number) => target === 60)).toBe(true)
  expect(result.idle).toBe(30)
})

test('balanced callback jitter does not discard available active scene frames', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop')
  test.skip(process.env.PROFILE_GPU !== 'hardware', 'requires available hardware callback headroom')
  await page.addInitScript(() => {
    const nativeRaf = window.requestAnimationFrame.bind(window)
    let previous = -Infinity,
      mapped = 0,
      frame = 0,
      previousSlot = -Infinity
    // Diagnostic timestamps only: deliver every real callback, preserve their
    // ordering, and give all callbacks in a browser frame the same timestamp.
    // This neither caps the UI ticker nor changes shipped scheduling.
    window.requestAnimationFrame = (callback) =>
      nativeRaf((now) => {
        if (now !== previous) {
          previous = now
          const interval = 1000 / 60
          const slot = Math.max(previousSlot + 1, Math.round(now / interval))
          previousSlot = slot
          mapped = slot * interval - (++frame % 2 ? interval * 0.1 : 0)
        }
        callback(mapped)
      })
  })
  await page.goto('/?matrixProfile=1')
  await expect(page.locator('canvas[data-engine]')).toHaveCSS('opacity', '1')
  await page.evaluate(() => (window as any).__matrixWorldDebug.freeze(0.8, 8))
  await page.waitForTimeout(1000)
  const start = await page.evaluate(() => {
    const profile = (window as any).__matrixWorldProfile
    return { frames: profile.frames.length, callbacks: profile.callbacks.length }
  })
  await page.waitForTimeout(2000)
  const result = await page.evaluate((start) => {
    const profile = (window as any).__matrixWorldProfile
    return {
      frames: profile.frames.length - start.frames,
      callbacks: profile.callbacks.length - start.callbacks,
      minimumRawInterval: Math.min(
        ...profile.callbacks.slice(start.callbacks).map((v: any) => v.interval),
      ),
      state: (window as any).__matrixWorldDebug.snapshot(),
    }
  }, start)
  expect(result.callbacks).toBeGreaterThan(60)
  expect(result.minimumRawInterval).toBeGreaterThan(0)
  expect(result.minimumRawInterval).toBeLessThan(15.8)
  expect(result.frames / result.callbacks).toBeGreaterThanOrEqual(0.97)
  const expectedRatio = await page.evaluate(() => Math.min(devicePixelRatio, 2))
  expect(result.state.quality.atmosphereRatio).toBe(expectedRatio)
  expect(result.state.quality.foregroundRatio).toBe(expectedRatio)
  expect(result.state.quality.detail).toBe(true)
  expect(result.state.particleCount).toBe(12000)
  expect(result.state.bloomEnabled).toBe(true)
})

test('a touch-primary device with a secondary fine pointer keeps efficient rendering but smooths mouse wheels', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile')
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = (query) => {
      const result = original(query)
      if (query === '(any-pointer: fine)') Object.defineProperty(result, 'matches', { value: true })
      return result
    }
  })
  await page.goto('/?matrixProfile=1')
  await page.locator('canvas.opacity-100').waitFor()
  const result = await page.evaluate(() => {
    const coarse = new WheelEvent('wheel', {
      deltaMode: 1,
      deltaY: 3,
      bubbles: true,
      cancelable: true,
    })
    document.body.dispatchEvent(coarse)
    const precision = new WheelEvent('wheel', { deltaY: 3.5, bubbles: true, cancelable: true })
    document.body.dispatchEvent(precision)
    return {
      coarse: coarse.defaultPrevented,
      precision: precision.defaultPrevented,
      state: (window as any).__matrixWorldDebug.snapshot(),
    }
  })
  expect(result.coarse).toBe(true)
  expect(result.precision).toBe(false)
  expect(result.state.quality.profile).toBe('efficient')
  expect(result.state.particleCount).toBe(12000)
  expect(result.state.quality.foregroundRatio).toBe(3)
})

test('precision gestures remain native; discrete wheels smooth; switching cancels old easing and nested UI is untouched', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(90_000)
  await page.goto('/?matrixProfile=1')
  await page.locator('canvas.opacity-100').waitFor()
  const result = await page.evaluate(async () => {
    const wheel = (
      deltaY: number,
      deltaMode = 0,
      target: EventTarget = document.body,
      ctrlKey = false,
    ) => {
      const event = new WheelEvent('wheel', {
        deltaY,
        deltaMode,
        ctrlKey,
        bubbles: true,
        cancelable: true,
      })
      target.dispatchEvent(event)
      return event.defaultPrevented
    }
    const precision = wheel(7.5)
    const coarse = wheel(3, 1)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const stoppedAt = scrollY
    const precisionAfterWheel = wheel(4.5)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.append(dialog)
    const nested = wheel(3, 1, dialog)
    dialog.remove()
    const pinch = wheel(50, 0, document.body, true)
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      precision,
      coarse,
      precisionAfterWheel,
      nested,
      pinch,
      drift: scrollY - stoppedAt,
      mode: document.querySelector('canvas')?.dataset.wheelMode,
    }
  })
  expect(result.precision).toBe(false)
  expect(result.coarse).toBe(true)
  expect(result.precisionAfterWheel).toBe(false)
  expect(result.nested).toBe(false)
  expect(result.pinch).toBe(false)
  expect(Math.abs(result.drift)).toBeLessThan(2)
  expect(result.mode).toBe('native')
})

test('stable composer target is visually equivalent to legacy ping-pong across the journey', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(180_000)
  await page.goto('/?matrixProfile=1')
  await page.locator('canvas.opacity-100').waitFor()
  // The class starts a 900 ms fade; it does not mean the displayed pixels are
  // fully opaque yet. Compare only settled, matching presentation states.
  await expect(page.locator('canvas[data-engine]')).toHaveCSS('opacity', '1')
  const shot = () =>
    page.locator('canvas[data-engine]').screenshot({
      style:
        'body * { visibility: hidden !important; } canvas[data-engine] { visibility: visible !important; }',
    })
  for (const progress of [0.8, 1.8, 2.45, 3, 4.4]) {
    await page.evaluate((progress) => {
      const debug = (window as any).__matrixWorldDebug
      debug.freeze(progress, 8)
      debug.useLegacyComposerSwap(true)
    }, progress)
    await page.waitForTimeout(250)
    const before = (await shot()).toString('base64')
    await page.evaluate(() => (window as any).__matrixWorldDebug.useLegacyComposerSwap(false))
    await page.waitForTimeout(250)
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
  }
})

test('cinematic targets avoid duplicate allocation without changing passes, bloom or density', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.blitFramebuffer
    ;(window as any).__matrixBlits = 0
    ;(window as any).__matrixDepthBlits = 0
    ;(window as any).__matrixMultisampleStorage = []
    const storage = WebGL2RenderingContext.prototype.renderbufferStorageMultisample
    WebGL2RenderingContext.prototype.renderbufferStorageMultisample = function (...args) {
      ;(window as any).__matrixMultisampleStorage.push(args.slice(1))
      return storage.apply(this, args)
    }
    WebGL2RenderingContext.prototype.blitFramebuffer = function (...args) {
      ;(window as any).__matrixBlits++
      if ((args[8] as number) & this.DEPTH_BUFFER_BIT) (window as any).__matrixDepthBlits++
      return original.apply(this, args)
    }
  })
  await page.goto('/?matrixProfile=1')
  await page.locator('canvas.opacity-100').waitFor()
  const result = await page.evaluate(async () => {
    const debug = (window as any).__matrixWorldDebug
    debug.freeze(0.8, 8)
    await new Promise((resolve) => setTimeout(resolve, 300))
    const profile = (window as any).__matrixWorldProfile
    const frames = profile.frames.length
    const blits = (window as any).__matrixBlits
    const depthBlits = (window as any).__matrixDepthBlits
    await new Promise((resolve) => setTimeout(resolve, 500))
    return {
      state: debug.snapshot(),
      resolvesPerFrame: ((window as any).__matrixBlits - blits) / (profile.frames.length - frames),
      depthResolves: (window as any).__matrixDepthBlits - depthBlits,
      storage: (window as any).__matrixMultisampleStorage,
    }
  })
  expect(result.state.quality.profile).toBe('cinematic')
  expect(result.state.bloomEnabled).toBe(true)
  expect(result.state.particleCount).toBe(12000)
  expect(result.state.enabledPasses).toBe(4)
  expect(result.state.composition).toBe('separate-hdr')
  expect(result.state.resolvesDepth).toBe(true)
  expect(result.state.swapsAfterGrade).toBe(false)
  expect(result.resolvesPerFrame).toBeLessThanOrEqual(3.1)
  expect(result.depthResolves).toBeGreaterThan(0)
  // One color + one depth multisample attachment, not duplicate ping-pong
  // attachments. This measures GL allocations rather than object dimensions.
  expect(
    result.storage.filter(
      (entry: number[]) =>
        entry[2] === result.state.buffer.width && entry[3] === result.state.buffer.height,
    ),
  ).toHaveLength(2)
})
