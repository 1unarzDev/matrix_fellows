import { test, expect } from '@playwright/test'

test('featured opportunity hover moves the glass surface as one composition', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  const card = page.locator('.opportunity-card').first()
  const checkpoint = card.getByText(/checkpoint/i).last()
  await card.hover()
  await expect(card).toHaveCSS('translate', '0px -2px')
  await expect(checkpoint).toHaveCSS('translate', 'none')
  await expect(checkpoint).toHaveCSS('scale', 'none')
})

test('hover gestures use slow easing without delaying interaction', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('/#community')
  const control = page.getByRole('button', { name: 'Next featured opportunity' })
  expect(
    await control.evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(', ')
        .every((duration) => duration === '0.42s'),
    ),
  ).toBe(true)
  expect(
    await control.evaluate((element) =>
      getComputedStyle(element)
        .transitionDelay.split(', ')
        .every((delay) => delay === '0s'),
    ),
  ).toBe(true)
  const orbit = page.locator('[data-hero-detail] ellipse')
  await expect(orbit).toHaveCSS('transition-duration', '2.4s')
  await expect(orbit).toHaveCSS('transition-timing-function', 'cubic-bezier(0.45, 0, 0.25, 1)')
})

test('unexplored marker draws an orbit on hover and returns cleanly', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const marker = page.locator('[data-hero-detail]').filter({ hasText: 'The unexplored' })
  await expect(marker).toBeVisible()
  const orbit = marker.locator('ellipse')
  await expect(orbit).toHaveCSS('stroke-dashoffset', '1px')
  await marker.hover()
  await expect(orbit).toHaveCSS('stroke-dashoffset', '0px')
  await page.mouse.move(5, 5)
  await expect(orbit).toHaveCSS('stroke-dashoffset', '1px')
})

test('unexplored marker keeps its label clear of the instrument', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.goto('/')
  const marker = page.getByRole('link', {
    name: 'The unexplored — find a research idea worth pursuing',
  })
  await expect(marker).toBeVisible()
  const label = marker.getByText('The unexplored', { exact: true })
  const [markerBox, labelBox] = await Promise.all([marker.boundingBox(), label.boundingBox()])
  expect(markerBox).not.toBeNull()
  expect(labelBox).not.toBeNull()
  expect(labelBox!.x).toBeGreaterThanOrEqual(markerBox!.x + markerBox!.width + 12)
})

test('unexplored marker label rests on its rule then lifts to reveal its action', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  const marker = page.getByRole('link', {
    name: 'The unexplored — find a research idea worth pursuing',
  })
  await expect(marker).toBeVisible()
  const label = marker.getByText('The unexplored', { exact: true })
  const rule = marker.locator('span[aria-hidden="true"].h-px')
  const centerY = async (element: typeof label) => {
    const box = await element.boundingBox()
    if (!box) throw new Error('Marker element has no layout box')
    return box.y + box.height / 2
  }

  const restingRuleY = await centerY(rule)
  const restingLabelY = await centerY(label)
  expect(Math.abs(restingLabelY - restingRuleY)).toBeLessThan(2)

  await marker.hover()
  await expect.poll(async () => restingLabelY - (await centerY(label))).toBeGreaterThanOrEqual(5)
  await expect(marker.getByText('Find your question')).toHaveCSS('opacity', '1')
})

test('unexplored marker action eases in behind the lifted label', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  const marker = page.getByRole('link', {
    name: 'The unexplored — find a research idea worth pursuing',
  })
  const action = marker.getByText('Find your question')
  await expect(marker).toBeVisible()
  await expect(action).toHaveCSS('transition-property', 'color, opacity, translate')
  const markerBox = await marker.boundingBox()
  expect(markerBox).not.toBeNull()
  await page.mouse.move(5, 5)
  await page.mouse.move(markerBox!.x + markerBox!.width / 2, markerBox!.y + markerBox!.height / 2)

  const sampleAt = (time: number) =>
    action.evaluate((element, currentTime) => {
      for (const animation of element.getAnimations()) {
        animation.pause()
        animation.currentTime = currentTime
      }
      const style = getComputedStyle(element)
      return { opacity: Number(style.opacity), translate: style.translate }
    }, time)

  const early = await sampleAt(250)
  expect(early.opacity).toBeGreaterThan(0.05)
  expect(early.opacity).toBeLessThan(0.25)

  const middle = await sampleAt(700)
  expect(middle.opacity).toBeGreaterThan(0.3)
  expect(middle.opacity).toBeLessThan(0.55)

  const settled = await sampleAt(1700)
  expect(settled.opacity).toBe(1)
  expect(settled.translate).toBe('4px')
})

test('unexplored marker turns curiosity into a guide action', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const link = page.getByRole('link', {
    name: 'The unexplored — find a research idea worth pursuing',
  })
  await expect(link).toHaveAttribute('href', '/guides/find-a-research-idea')
  await link.focus()
  await expect(link.locator('ellipse')).toHaveCSS('stroke-dashoffset', '0px')
  await expect(link.getByText('Find your question')).toBeVisible()
  await link.press('Enter')
  await expect(page).toHaveURL(/\/guides\/find-a-research-idea$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find an idea worth pursuing')
})

test('hero meeting panel gives a restrained lift on hover and keyboard focus', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const panel = page.locator('[data-hero-meeting]')
  const signal = panel.locator('[data-meeting-signal]')
  await expect(panel).toBeVisible()
  await expect(signal).toHaveCSS('transition-duration', '0.85s')
  await expect(signal).toHaveCSS('transition-timing-function', 'cubic-bezier(0.33, 0, 0.2, 1)')
  const resting = await panel.boundingBox()
  expect(resting).not.toBeNull()
  await expect(panel).toHaveCSS('transition-timing-function', 'cubic-bezier(0.22, 1, 0.36, 1)')

  await panel.hover()
  await expect.poll(async () => (await panel.boundingBox())!.y).toBeLessThan(resting!.y - 2)
  await expect
    .poll(() =>
      panel.evaluate((element) => {
        const color = getComputedStyle(element).borderTopColor
        return Number(color.match(/\/\s*([\d.]+)\)/)?.[1] || 1)
      }),
    )
    .toBeGreaterThan(0.59)

  await page.mouse.move(5, 5)
  await expect(panel).toHaveCSS('translate', 'none')
  await expect(panel).toHaveCSS('scale', 'none')
  await panel.getByRole('link', { name: 'Meeting details' }).focus()
  await expect(panel).toHaveCSS('translate', '0px -3px')
  await expect(panel).toHaveCSS('scale', '1.01')
})

test('featured opportunity controls retain the project touch target', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#community')
  const next = page.getByRole('button', { name: 'Next featured opportunity' })
  await expect(next).toBeVisible()
  await expect(next).toHaveCSS('width', '44px')
  await expect(next).toHaveCSS('height', '44px')
})
