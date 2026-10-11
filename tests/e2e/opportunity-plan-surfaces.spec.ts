import { expect, test } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'

test.use({ video: 'on' })

test('saved and pursued opportunity dates render once in the shared control and timeline surfaces', async ({ page }, info) => {
  await setup(page)
  await page.goto('/dashboard?section=opportunities')
  await expect(page.getByRole('button', { name: 'Details', exact: true })).toBeVisible()
  await page.screenshot({ path: `/tmp/matrix-dashboard-evidence/opportunities-discover-final-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Save opportunity to your account', exact: true }).click()
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await page.getByRole('button', { name: 'Pursue', exact: false }).click()
  const review = page.getByRole('dialog')
  await review.getByRole('checkbox').check()
  await review.getByRole('button', { name: 'Create reviewed plan', exact: true }).click()
  await page.getByRole('button', { name: 'timeline', exact: true }).click()
  await expect(page.locator('.wb-timeline')).toBeVisible()
  await expect(page.locator('.wb-timeline-card--milestone')).toHaveCount(2)
  await expect(page.locator('.wb-timeline-card--milestone').first()).toContainText('Submission deadline')
  await expect(page.locator('.wb-timeline-card--milestone').first()).not.toContainText('2027-02-15')
  // The spine and the dot must share their horizontal center at every viewport width.
  const alignment = await page.locator('.wb-timeline-marker').first().evaluate((marker) => {
    const spine = getComputedStyle(marker, '::after')
    const dot = marker.querySelector('span')!.getBoundingClientRect()
    const bounds = marker.getBoundingClientRect()
    return Math.abs(dot.x + dot.width / 2 - bounds.x - parseFloat(spine.left) - parseFloat(spine.width) / 2)
  })
  expect(alignment).toBeLessThanOrEqual(1)
  await expect(page.locator('.wb-plan-view-enter-active, .wb-plan-view-leave-active')).toHaveCount(0)
  await page.screenshot({ path: `/tmp/matrix-dashboard-evidence/opportunities-timeline-final-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'board', exact: true }).click()
  await expect(page.getByText('0 of 2 steps complete')).toBeVisible()
  await expect(page.locator('.wb-board__lane-header').getByText('Stage', { exact: true })).toHaveCount(0)
  await expect(page.locator('.wb-plan-view-enter-active, .wb-plan-view-leave-active')).toHaveCount(0)
  await page.screenshot({ path: `/tmp/matrix-dashboard-evidence/opportunities-board-final-${info.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})
