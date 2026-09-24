import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).startsWith('webgl')) return null
      return getContext.call(this, type, ...args)
    } as typeof HTMLCanvasElement.prototype.getContext
  })
})

test('discovery thought follows the pointer and reveals as one composition', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Hover interaction requires a fine pointer')
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/#discovery')
  await page.locator('[data-ready="true"]').waitFor()

  const reveal = page.locator('[data-discovery-reveal]')
  await reveal.scrollIntoViewIfNeeded()
  const bounds = await reveal.boundingBox()
  expect(bounds).not.toBeNull()

  await page.mouse.move(bounds!.x + bounds!.width * 0.68, bounds!.y + bounds!.height * 0.42)
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '1')
  await expect(reveal.locator('.discovery-reveal__lens')).toHaveCSS('opacity', '0.64')
  await expect(reveal.locator('.discovery-reveal__bloom')).toHaveCount(0)
  await expect(reveal.locator('.discovery-reveal__xray')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  )
  await expect(reveal.locator('.discovery-reveal__xray')).not.toHaveCSS('background-image', 'none')
  await expect(reveal.locator('.discovery-reveal__xray')).not.toHaveCSS('mask-image', 'none')
  await expect(reveal.locator('.discovery-reveal__lens > .discovery-reveal__particle')).toHaveCount(
    12,
  )

  const clipPath = await reveal
    .locator('.discovery-reveal__xray')
    .evaluate((element) => getComputedStyle(element).clipPath)
  expect(clipPath).not.toContain('ellipse(0px')

  const point = await reveal.evaluate((element) => ({
    x: Number.parseFloat(getComputedStyle(element).getPropertyValue('--reveal-x')),
    y: Number.parseFloat(getComputedStyle(element).getPropertyValue('--reveal-y')),
  }))
  expect(point.x).toBeCloseTo(bounds!.width * 0.68, 0)
  expect(point.y).toBeCloseTo(bounds!.height * 0.42, 0)

  await page.mouse.move(1300, 100)
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '1')
  await expect(reveal.locator('.discovery-reveal__lens')).toHaveCSS('opacity', '0')
})

test('discovery interactions are keyboard reachable and respect reduced motion', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Keyboard focus treatment is tested on desktop')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#discovery')
  await page.locator('[data-ready="true"]').waitFor()

  const reveal = page.locator('[data-discovery-reveal]')
  await reveal.scrollIntoViewIfNeeded()
  await reveal.focus()
  await expect(reveal).toBeFocused()
  await expect(reveal.locator('.discovery-reveal__lens')).toHaveCSS('opacity', '0.64')
  await expect(reveal.locator('.discovery-reveal__xray')).toHaveCSS('transition-duration', '0s')
  await expect(reveal.locator('.discovery-reveal__particle').first()).toHaveCSS('display', 'none')

  const compass = page.getByRole('link', { name: 'Find a research idea — explore the guide' })
  await expect(compass).toHaveAttribute('href', '/guides/find-a-research-idea')
  await expect(compass.locator('svg path').first()).toHaveCSS('transition-property', 'none')
})

test('touch layouts use an accessible tap toggle and preserve native scrolling', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'Tap toggle requires a coarse-pointer context')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#discovery')

  const reveal = page.locator('[data-discovery-reveal]')
  await reveal.scrollIntoViewIfNeeded()
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '1')
  await expect(page.getByText('Curiosity finds', { exact: false })).toBeVisible()

  const toggle = reveal.locator('.discovery-reveal__touch-target')
  await expect(toggle).toHaveAccessibleName('Reveal a field note beneath the discovery')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click({ position: { x: 180, y: 220 } })
  await expect(reveal).toHaveAttribute('data-touch-revealed', 'true')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(toggle).toHaveAccessibleName('Return to the original discovery note')
  await expect(reveal.locator('.discovery-reveal__lens')).toHaveCSS('opacity', '0.58')
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '0.08')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(reveal).not.toHaveAttribute('data-touch-revealed', 'true')

  const before = await page.evaluate(() => window.scrollY)
  await page.touchscreen.tap(20, 700)
  await page.evaluate(() => window.scrollBy({ top: 120, behavior: 'instant' }))
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
})

test('touch reveal prompt clears the discovery copy on narrow screens', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Tap prompt requires a coarse-pointer context')

  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/#discovery')

    const reveal = page.locator('[data-discovery-reveal]')
    await reveal.scrollIntoViewIfNeeded()
    const lastParagraph = reveal.locator('.discovery-reveal__original p').last()
    const prompt = reveal.locator('.discovery-reveal__touch-prompt')
    await expect(prompt).toBeVisible()
    const [paragraphBounds, promptBounds] = await Promise.all([
      lastParagraph.boundingBox(),
      prompt.boundingBox(),
    ])

    expect(paragraphBounds).not.toBeNull()
    expect(promptBounds).not.toBeNull()
    expect(promptBounds!.y - (paragraphBounds!.y + paragraphBounds!.height)).toBeGreaterThanOrEqual(
      12,
    )
  }
})

for (const width of [320, 360, 390, 430]) {
  test(`discovery reveal does not overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/#discovery')
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  })
}
