import { expect, test } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'

test('capture streamlined research queue', async ({ page }, info) => {
  const state = await setup(page)
  state.workspace.member.role = 'officer'
  await page.goto('/dashboard?section=queue')
  await expect(page.getByRole('heading', { name: 'Outreach' })).toBeVisible()
  await expect(page.getByText('Assign a personal connection', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Candidate dossier', { exact: true })).toBeVisible()
  await page.screenshot({ path: `tmp/research-queue-${info.project.name}.png`, fullPage: true })
})
