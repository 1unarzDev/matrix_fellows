import { test, expect } from '@playwright/test'

test('timeline hover keeps dates and checkpoint markers stationary', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  const tab = page.getByRole('tablist').first().getByRole('tab').first()
  await tab.hover()
  for (const selector of ['[data-timeline-date]', '[data-timeline-dot]']) {
    const element = tab.locator(selector)
    await expect(element).toHaveCSS('translate', 'none')
    await expect(element).toHaveCSS('transform', 'none')
    await expect(element).toHaveCSS('scale', 'none')
  }
  await tab.focus()
  await expect(tab.locator('[data-timeline-date]')).toHaveCSS('translate', 'none')
})

test('hover gestures use slow easing without delaying interaction', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#community')
  const dot = page.locator('[data-timeline-dot]').first()
  await expect(dot).toHaveCSS('transition-duration', '2s')
  await expect(dot).toHaveCSS('transition-timing-function', 'cubic-bezier(0.45, 0, 0.25, 1)')
  await expect(dot).toHaveCSS('transition-delay', '0s')
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
  await expect
    .poll(async () => restingLabelY - (await centerY(label)))
    .toBeGreaterThanOrEqual(5)
  await expect(marker.getByText('Find your question')).toHaveCSS('opacity', '1')
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

test('timeline dots have room for their hover halo within the scrollport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#community')
  const rail = page.getByRole('tablist').first()
  await expect(rail).toBeVisible()
  const clearance = await rail.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const dot = element.querySelector('[data-timeline-dot]')!.getBoundingClientRect()
    return dot.top - box.top
  })
  expect(clearance).toBeGreaterThanOrEqual(20)
})
