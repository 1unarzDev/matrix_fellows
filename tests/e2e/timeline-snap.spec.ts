import { test, expect } from '@playwright/test'

test.describe('cinematic timeline settling', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (String(type).startsWith('webgl')) return null
        return getContext.call(this, type, ...args)
      } as typeof HTMLCanvasElement.prototype.getContext
    })
  })

  test('completes only decisive chapter gestures in the original direction', async ({ page }) => {
    test.skip(
      test.info().project.name === 'mobile',
      'Programmatic scrollTo is not a representative native touch flick',
    )
    test.setTimeout(60_000)
    await page.goto('/')
    await page
      .locator('[data-horizon-preview]:not([data-scene-state="pending"])')
      .waitFor({ state: 'attached', timeout: 20_000 })

    const positions = await page.evaluate(() =>
      Object.fromEntries(
        Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]')).map((chapter) => [
          chapter.id,
          chapter.offsetTop,
        ]),
      ),
    )

    const settleAt = async (top: number, expected: number) => {
      if (test.info().project.name === 'desktop') {
        const current = await page.evaluate(() => window.scrollY)
        await page.mouse.wheel(0, (top - current) / 0.7)
      } else {
        await page.evaluate(
          (nextTop) => window.scrollTo({ top: nextTop, behavior: 'instant' }),
          top,
        )
      }
      await expect
        .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - expected), {
          timeout: 12_000,
        })
        .toBeLessThan(test.info().project.name === 'desktop' ? 40 : 5)
    }

    // A decisive forward burst released between frames completes forward.
    await settleAt(
      positions.beginning! + (positions.discovery! - positions.beginning!) * 0.55,
      positions.discovery!,
    )

    // From the later frame, the same decisive gesture continues backward when the
    // user's original gesture was upward; it never reverses their intent.
    await settleAt(positions.research!, positions.research!)
    await settleAt(
      positions.discovery! + (positions.research! - positions.discovery!) * 0.55,
      positions.discovery!,
    )
  })

  test('does not tug near an existing chapter frame', async ({ page }) => {
    await page.goto('/')
    await page
      .locator('[data-horizon-preview]:not([data-scene-state="pending"])')
      .waitFor({ state: 'attached', timeout: 20_000 })
    const discoveryTop = await page.locator('#discovery').evaluate((chapter) => chapter.offsetTop)
    const restingPosition = discoveryTop * 0.16

    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), restingPosition)
    await page.waitForTimeout(1_000)

    expect(Math.abs((await page.evaluate(() => window.scrollY)) - restingPosition)).toBeLessThan(5)
  })

  test('leaves a slow deliberate scroll untouched even in a transition window', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .locator('[data-horizon-preview]:not([data-scene-state="pending"])')
      .waitFor({ state: 'attached', timeout: 20_000 })
    const discoveryTop = await page.locator('#discovery').evaluate((chapter) => chapter.offsetTop)
    const restingPosition = discoveryTop * 0.55

    await page.evaluate(async (top) => {
      for (let step = 1; step <= 12; step++) {
        window.scrollTo({ top: (top * step) / 12, behavior: 'instant' })
        await new Promise((resolve) => setTimeout(resolve, 110))
      }
    }, restingPosition)
    await page.waitForTimeout(700)

    expect(Math.abs((await page.evaluate(() => window.scrollY)) - restingPosition)).toBeLessThan(5)
  })

  test('keeps native mobile flicks free of timeline settling', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Native touch scrolling is mobile-specific')
    await page.goto('/')
    await page
      .locator('[data-horizon-preview]:not([data-scene-state="pending"])')
      .waitFor({ state: 'attached', timeout: 20_000 })
    const discoveryTop = await page.locator('#discovery').evaluate((chapter) => chapter.offsetTop)
    const releasedAt = discoveryTop * 0.55

    await page.mouse.wheel(0, releasedAt)
    await page.waitForTimeout(1_000)

    expect(Math.abs((await page.evaluate(() => window.scrollY)) - releasedAt)).toBeLessThan(5)
  })

  test('smooths the late research-to-depths transition without trapping project rows', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile',
      'Mobile keeps native touch inertia without settling',
    )
    await page.goto('/#research')
    await page
      .locator('[data-horizon-preview]:not([data-scene-state="pending"])')
      .waitFor({ state: 'attached', timeout: 20_000 })
    const [researchTop, frontiersTop] = await Promise.all([
      page.locator('#research').evaluate((chapter) => chapter.offsetTop),
      page.locator('#frontiers').evaluate((chapter) => chapter.offsetTop),
    ])
    const researchRest = researchTop + (frontiersTop - researchTop) * 0.13
    const quickScrollTo = async (top: number) => {
      const current = await page.evaluate(() => window.scrollY)
      await page.mouse.wheel(
        0,
        (top - current) / (test.info().project.name === 'desktop' ? 0.7 : 1),
      )
    }

    await quickScrollTo(researchTop + (frontiersTop - researchTop) * 0.76)
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - frontiersTop), {
        timeout: 12_000,
      })
      .toBeLessThan(20)

    await quickScrollTo(researchTop + (frontiersTop - researchTop) * 0.5)
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - researchRest), {
        timeout: 12_000,
      })
      .toBeLessThan(20)
  })

  test('does not turn a decelerated research scroll into an abrupt depths jump', async ({
    page,
  }, testInfo) => {
    await page.goto('/#research')
    await page.waitForTimeout(1_800)

    const [researchTop, frontiersTop] = await Promise.all([
      page.locator('#research').evaluate((chapter) => chapter.offsetTop),
      page.locator('#frontiers').evaluate((chapter) => chapter.offsetTop),
    ])
    const transitionLength = frontiersTop - researchTop
    const preTransition = researchTop + transitionLength * 0.56
    if (testInfo.project.name === 'desktop') {
      const current = await page.evaluate(() => window.scrollY)
      await page.mouse.wheel(0, (preTransition - current) / 0.7)
    } else {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), preTransition)
    }
    await page.waitForTimeout(900)

    // A brief initial impulse followed by a long, slow tail models a trackpad
    // or touch gesture that has clearly decelerated before the handoff.
    if (testInfo.project.name === 'desktop') await page.mouse.wheel(0, 200)
    else await page.evaluate(() => window.scrollBy({ top: 140, behavior: 'instant' }))
    await page.waitForTimeout(70)
    for (let step = 0; step < 20; step++) {
      if (testInfo.project.name === 'desktop') await page.mouse.wheel(0, 5)
      else await page.evaluate(() => window.scrollBy({ top: 3.5, behavior: 'instant' }))
      await page.waitForTimeout(100)
    }
    const releasedAt = await page.evaluate(() => window.scrollY)
    await page.waitForTimeout(1_200)
    const settledAt = await page.evaluate(() => window.scrollY)

    expect(settledAt).toBeGreaterThanOrEqual(releasedAt - 5)
    expect(settledAt - releasedAt).toBeLessThan(260)
    expect(settledAt).toBeLessThan(frontiersTop - transitionLength * 0.2)
  })

  test('does not pull long-form community content back to the chapter start', async ({ page }) => {
    await page.goto('/#community')
    await page
      .locator('[data-horizon-preview]:not([data-scene-state="pending"])')
      .waitFor({ state: 'attached', timeout: 20_000 })
    const communityTop = await page.locator('#community').evaluate((chapter) => chapter.offsetTop)
    const readingPosition = communityTop + 900

    if (test.info().project.name === 'desktop')
      await page.mouse.wheel(
        0,
        (readingPosition - (await page.evaluate(() => window.scrollY))) / 0.7,
      )
    else
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), readingPosition)
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - readingPosition), {
        timeout: 12_000,
      })
      .toBeLessThan(test.info().project.name === 'desktop' ? 40 : 5)
  })

  test('keeps the project-list reading area freely scrollable', async ({ page }) => {
    await page.goto('/#research')
    await page
      .locator('[data-horizon-preview]:not([data-scene-state="pending"])')
      .waitFor({ state: 'attached', timeout: 20_000 })
    const [researchTop, frontiersTop] = await Promise.all([
      page.locator('#research').evaluate((chapter) => chapter.offsetTop),
      page.locator('#frontiers').evaluate((chapter) => chapter.offsetTop),
    ])
    const readingPosition = researchTop + (frontiersTop - researchTop) * 0.55

    if (test.info().project.name === 'desktop')
      await page.mouse.wheel(
        0,
        (readingPosition - (await page.evaluate(() => window.scrollY))) / 0.7,
      )
    else
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), readingPosition)
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - readingPosition), {
        timeout: 12_000,
      })
      .toBeLessThan(test.info().project.name === 'desktop' ? 40 : 5)
  })
})
