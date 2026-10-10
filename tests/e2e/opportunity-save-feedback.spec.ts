import { expect, test } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'

test('save feedback is immediate while persistence is delayed, with rollback and retry', async ({
  page,
}) => {
  const state = await setup(page)
  let requests = 0
  await page.route('**/api/workspace/catalog-saves', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    requests++
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return route.fulfill({ json: { opportunityIds: [state.opportunity.id] } })
  })
  await page.route('**/api/workspace/catalog-saves/*', async (route) => {
    requests++
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return route.fulfill({ status: 503, json: { message: 'Synthetic unavailable storage' } })
  })
  await page.goto('/dashboard?section=opportunities')
  const card = page.locator('.opportunity-card').first()
  const save = card.locator('.save-control')
  await expect(save).toBeEnabled()
  await save.click()
  await expect(save).toHaveAttribute('aria-pressed', 'true', { timeout: 250 })
  await expect(save).toHaveClass(/save-control--springing/, { timeout: 250 })
  await expect(save).toHaveAttribute('aria-busy', 'true')
  await expect(save).toBeDisabled()
  await expect(save).toBeEnabled()
  expect(requests).toBe(1)
  await save.click()
  await expect(save).toHaveAttribute('aria-pressed', 'false', { timeout: 250 })
  await expect(card.getByRole('alert')).toContainText('try again')
  await expect(save).toHaveAttribute('aria-pressed', 'true')
  await card.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(save).toHaveAttribute('aria-pressed', 'false', { timeout: 250 })
  await expect(card.getByRole('alert')).toBeVisible()
  expect(requests).toBe(3)
})
