import { test, expect } from '@playwright/test'

test.describe('cinematic timeline settling', () => {
  test('settles partial chapter transitions in both directions', async ({ page }) => {
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

    // A forward scroll released past the midpoint completes the transition.
    await settleAt(positions.beginning! + (positions.discovery! - positions.beginning!) * 0.62, positions.discovery!)

    // Releasing before the midpoint on the way back restores the earlier frame.
    await settleAt(positions.discovery! + (positions.research! - positions.discovery!) * 0.38, positions.discovery!)
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
