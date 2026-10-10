import { expect, test } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'

test.use({ video: 'on' })

test('featured discovery panels preserve selection, saving, motion and narrow layouts', async ({
  page,
}, info) => {
  const state = await setup(page)
  const items = [
    state.opportunity,
    {
      ...state.opportunity,
      id: 'synthetic-computational',
      title: 'Synthetic computational biology summer collaboration and reproducibility workshop',
      discipline: 'Biomedical · Computing',
      location: 'Remote',
      description:
        'Synthetic long-title layout scenario. Review the organizer’s requirements before choosing to pursue.',
      deadline: null,
      eventDate: null,
    },
    {
      ...state.opportunity,
      id: 'synthetic-environmental',
      title: 'Synthetic Environmental Field Study',
      discipline: 'Environmental research',
      location: 'Arlington, Texas',
      description:
        'Synthetic physical-research scenario with local access still requiring confirmation.',
    },
  ]
  await page.route('**/api/opportunities**', (route) =>
    route.fulfill({ json: { items, page: 1, pageCount: 1, total: items.length } }),
  )
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 960 })
    await page.goto('/dashboard?section=opportunities')
    const cards = page.locator('.opportunity-card--featured')
    await expect(cards).toHaveCount(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    const first = (await cards.nth(0).boundingBox())!
    const second = (await cards.nth(1).boundingBox())!
    expect(width > 1050 ? Math.abs(first.y - second.y) < 2 : second.y > first.y).toBe(true)
    await page.screenshot({
      path: `/tmp/matrix-featured-panels/populated-${width}-${info.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  const card = page.locator('.opportunity-card').first()
  await card.getByRole('button', { name: 'Save opportunity to your account', exact: true }).click()
  await expect(
    card.getByRole('button', { name: 'Remove saved opportunity', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(state.plan.tasks).toHaveLength(0)
  await card.getByRole('button', { name: state.opportunity.title, exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(state.opportunity.title)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await card.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
  await card.getByRole('button', { name: /Inspect sources/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
})
