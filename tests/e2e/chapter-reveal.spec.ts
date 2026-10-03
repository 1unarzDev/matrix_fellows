import { expect, test } from '@playwright/test'

test('first forward scroll reveals discovery and research without hiding them again', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.locator('[data-ready="true"]').waitFor()
  await page.locator('canvas.opacity-100').waitFor()
  await page.mouse.move(0, 0)
  await expect(page.locator('#discovery > div:not([aria-hidden])')).toHaveCSS('opacity', '0')
  await expect(page.locator('[data-ocean-intro]')).toHaveCSS('opacity', '0')
  const samples = await page.evaluate(async () => {
    const chapters = ['discovery', 'research'].map((id) => {
      const chapter = document.getElementById(id)!
      return {
        id,
        top: chapter.offsetTop,
        el: chapter.querySelector<HTMLElement>(':scope > div:not([aria-hidden])')!,
      }
    })
    const end = chapters[1]!.top + innerHeight * 0.5
    const result: Record<string, { y: number; opacity: number; top: number }[]> = {}
    for (let pass = 0; pass < 2; pass++) {
      scrollTo({ top: 0, behavior: 'instant' })
      if (pass) {
        // A refresh and reverse visit must not restore the original SSR styles.
        dispatchEvent(new Event('resize'))
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
      for (const chapter of chapters) result[`${chapter.id}-${pass}`] = []
      for (let y = 0; y < end; y += 35) {
        scrollTo({ top: y, behavior: 'instant' })
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        for (const chapter of chapters) {
          const bounds = chapter.el.getBoundingClientRect()
          if (bounds.top < innerHeight && bounds.bottom > innerHeight * 0.4)
            result[`${chapter.id}-${pass}`]!.push({
              y: scrollY,
              opacity: Number(getComputedStyle(chapter.el).opacity),
              top: bounds.top,
            })
        }
      }
    }
    return result
  })
  for (const [id, frames] of Object.entries(samples)) {
    expect(frames.length, id).toBeGreaterThan(5)
    expect(Math.max(...frames.map((frame) => frame.opacity)), id).toBeGreaterThan(0.9)
    for (let i = 1; i < frames.length; i++)
      expect(
        frames[i]!.opacity,
        `${id}: ${JSON.stringify(frames.slice(Math.max(0, i - 2), i + 2))}`,
      ).toBeGreaterThanOrEqual(frames[i - 1]!.opacity - 0.03)
  }
})

test('reduced motion keeps chapter text readable without reveal transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('[data-ready="true"]').waitFor()
  for (const id of ['discovery', 'research']) {
    const layer = page.locator(`#${id} > div:not([aria-hidden])`).first()
    await expect(layer).toHaveCSS('opacity', '1')
    await expect(layer).toHaveCSS('transform', 'none')
  }
})
