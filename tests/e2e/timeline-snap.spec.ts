import { test, expect } from '@playwright/test'

test.describe('cinematic timeline settling', () => {
  test('assists partial chapter transitions only in the original direction', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/')
    await page.locator('canvas[data-progress]').waitFor({ timeout: 20_000 })

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
        await page.evaluate((nextTop) => window.scrollTo({ top: nextTop, behavior: 'instant' }), top)
      }
      await expect
        .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - expected), {
          timeout: 12_000,
        })
        .toBeLessThan(test.info().project.name === 'desktop' ? 40 : 5)
    }

    // A forward scroll released distinctly between frames completes forward.
    await settleAt(
      positions.beginning! + (positions.discovery! - positions.beginning!) * 0.55,
      positions.discovery!,
    )

    // From the later frame, the same midpoint continues backward when the
    // user's original gesture was upward; it never reverses their intent.
    await settleAt(positions.research!, positions.research!)
    await settleAt(
      positions.discovery! + (positions.research! - positions.discovery!) * 0.55,
      positions.discovery!,
    )
  })

  test('does not tug near an existing chapter frame', async ({ page }) => {
    await page.goto('/')
    await page.locator('canvas[data-progress]').waitFor({ timeout: 20_000 })
    const discoveryTop = await page.locator('#discovery').evaluate((chapter) => chapter.offsetTop)
    const restingPosition = discoveryTop * 0.16

    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), restingPosition)
    await page.waitForTimeout(1_000)

    expect(Math.abs((await page.evaluate(() => window.scrollY)) - restingPosition)).toBeLessThan(5)
  })

  test('leaves a slow deliberate scroll untouched even in a transition window', async ({ page }) => {
    await page.goto('/')
    await page.locator('canvas[data-progress]').waitFor({ timeout: 20_000 })
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

  test('smooths the late research-to-depths transition without trapping project rows', async ({
    page,
  }) => {
    await page.goto('/#research')
    await page.locator('canvas[data-progress]').waitFor({ timeout: 20_000 })
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
      .toBeLessThan(5)

    await quickScrollTo(researchTop + (frontiersTop - researchTop) * 0.5)
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - researchRest), {
        timeout: 12_000,
      })
      .toBeLessThan(5)
  })

  test('does not pull long-form community content back to the chapter start', async ({ page }) => {
    await page.goto('/#community')
    await page.locator('canvas[data-progress]').waitFor({ timeout: 20_000 })
    const communityTop = await page.locator('#community').evaluate((chapter) => chapter.offsetTop)
    const readingPosition = communityTop + 900

    if (test.info().project.name === 'desktop')
      await page.mouse.wheel(
        0,
        (readingPosition - (await page.evaluate(() => window.scrollY))) / 0.7,
      )
    else await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), readingPosition)
    await expect
      .poll(
        async () => Math.abs((await page.evaluate(() => window.scrollY)) - readingPosition),
        { timeout: 12_000 },
      )
      .toBeLessThan(test.info().project.name === 'desktop' ? 40 : 5)
  })

  test('keeps the project-list reading area freely scrollable', async ({ page }) => {
    await page.goto('/#research')
    await page.locator('canvas[data-progress]').waitFor({ timeout: 20_000 })
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
    else await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), readingPosition)
    await expect
      .poll(
        async () => Math.abs((await page.evaluate(() => window.scrollY)) - readingPosition),
        { timeout: 12_000 },
      )
      .toBeLessThan(test.info().project.name === 'desktop' ? 40 : 5)
  })
})
