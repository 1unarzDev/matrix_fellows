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
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '0')
  await expect(reveal.locator('.discovery-reveal__lens')).toHaveCSS('opacity', '0.64')
  await expect(reveal.locator('.discovery-reveal__bloom')).toHaveCount(0)
  await expect(reveal.locator('.discovery-reveal__xray')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  )
  await expect(reveal.locator('.discovery-reveal__xray')).not.toHaveCSS('background-image', 'none')
  await expect(reveal.locator('.discovery-reveal__xray')).not.toHaveCSS('mask-image', 'none')
  await expect(reveal.locator('.discovery-reveal__lens > .discovery-reveal__particle')).toHaveCount(
    16,
  )
  await expect(reveal.locator('.discovery-reveal__wave')).toHaveCount(2)
  await expect(reveal.locator('.discovery-reveal__wave--outer')).not.toHaveCSS('filter', 'none')

  const [originalHeading, alternateHeading] = await Promise.all([
    reveal.locator('.discovery-reveal__original h2').boundingBox(),
    reveal.locator('.discovery-reveal__alternate h3').boundingBox(),
  ])
  expect(originalHeading).not.toBeNull()
  expect(alternateHeading).not.toBeNull()
  expect(Math.abs(originalHeading!.y - alternateHeading!.y)).toBeLessThanOrEqual(1)

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
  await expect(reveal.locator('.discovery-reveal__lens')).toHaveCSS('opacity', '0')
  await expect(reveal.locator('.discovery-reveal__original')).toHaveCSS('opacity', '0')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(reveal).not.toHaveAttribute('data-touch-revealed', 'true')

  const before = await page.evaluate(() => window.scrollY)
  await page.touchscreen.tap(20, 700)
  await page.evaluate(() => window.scrollBy({ top: 120, behavior: 'instant' }))
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
})

test('touch reveal expands to the full composition on a lightweight mobile path', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'Mobile render path requires a coarse pointer')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#discovery')

  const reveal = page.locator('[data-discovery-reveal]')
  await reveal.scrollIntoViewIfNeeded()
  const toggle = reveal.locator('.discovery-reveal__touch-target')
  await toggle.click({ position: { x: 72, y: 190 } })

  await expect(reveal).toHaveAttribute('data-touch-revealed', 'true')
  await expect(reveal.locator('.discovery-reveal__xray')).toHaveCSS('clip-path', /circle\(.+ at/)
  const origin = await reveal.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      x: Number.parseFloat(style.getPropertyValue('--reveal-x')),
      y: Number.parseFloat(style.getPropertyValue('--reveal-y')),
    }
  })
  expect(origin.x).toBeCloseTo(72, 0)
  expect(origin.y).toBeCloseTo(190, 0)
  await expect(reveal.locator('.discovery-reveal__xray')).toHaveCSS('mask-image', 'none')
  await expect(reveal.locator('.discovery-reveal__xray')).toHaveCSS('backdrop-filter', 'none')
  await expect(reveal.locator('.discovery-reveal__particle').first()).toHaveCSS('display', 'none')
  await expect(reveal.locator('.discovery-reveal__wave').first()).toHaveCSS('display', 'none')
})

test('touch reveal eases through its text swap without a rectangular mobile surface', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'Tap transition requires a coarse pointer')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#discovery')

  const reveal = page.locator('[data-discovery-reveal]')
  await reveal.scrollIntoViewIfNeeded()
  const original = reveal.locator('.discovery-reveal__original')
  const xray = reveal.locator('.discovery-reveal__xray')
  const promptLabels = reveal.locator('.discovery-reveal__touch-copy span')
  const hiddenPhrase = reveal.getByText('don’t know.', { exact: true })

  await expect(hiddenPhrase).toHaveCSS('font-style', 'italic')
  await expect(promptLabels).toHaveCount(2)
  await expect(xray).toHaveCSS('overflow', 'visible')
  await expect(xray).toHaveCSS('background-image', 'none')

  await reveal.locator('.discovery-reveal__touch-target').click({ position: { x: 72, y: 190 } })
  await page.waitForTimeout(70)

  const transitionFrame = await reveal.evaluate((element) => {
    const originalOpacity = Number.parseFloat(
      getComputedStyle(element.querySelector('.discovery-reveal__original')!).opacity,
    )
    const labels = Array.from(
      element.querySelectorAll<HTMLElement>('.discovery-reveal__touch-copy span'),
    ).map((label) => Number.parseFloat(getComputedStyle(label).opacity))
    const clipPath = getComputedStyle(
      element.querySelector('.discovery-reveal__xray')!,
    ).clipPath
    return { originalOpacity, labels, revealRadius: Number.parseFloat(clipPath.slice(7)) }
  })
  expect(transitionFrame.originalOpacity).toBeGreaterThan(0.2)
  expect(transitionFrame.labels.every((opacity) => opacity > 0.05)).toBe(true)
  expect(transitionFrame.revealRadius).toBeGreaterThan(0)
  expect(transitionFrame.revealRadius).toBeLessThan(900)

  await expect(original).toHaveCSS('opacity', '0')
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
