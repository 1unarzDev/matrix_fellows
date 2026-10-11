import { expect, test } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'

test.use({ video: 'on' })

test('message planning explains representation, animates, and creates an editable draft', async ({ page }, info) => {
  const state = await setup(page)
  state.workspace.member.role = 'officer'
  const target = state.workspace.targets[0]
  const match = {
    id: 'match-fixture', targetId: target.id, targetName: target.name, profileId: null, projectId: null,
    topicOverlap: 'Reviewed public evidence supplies a specific research connection.',
    historyStatus: 'resolved', coordination: [],
    access: { access: 'unconfirmed', reasons: [], unresolved: ['Confirm supervision and participation.'] },
    plan: { schemaVersion: 'contribution-plan-v1', mode: 'question', connection: 'Spectroscopy', deliverable: '', question: 'Would you recommend one introductory resource for this work?', evidence: [{ url: target.canonicalUrl, quote: 'Spectroscopy methods' }], unknowns: ['Current openings are unconfirmed.'], provenance: 'local-evidence', dimensions: [] },
  }
  await page.route('**/api/workspace/matches', route => route.fulfill({ json: { items: [match] } }))
  await page.route('**/api/workspace/planner', route => { const proposal = { ...state.workspace.proposals[0], id: 'new-proposal', kind: 'society', subject: 'Research discussion — Chemistry', body: 'Hello, reviewed draft.', recipient: target.contactEmail }; state.workspace.proposals.push(proposal); return route.fulfill({ json: { proposal } }) })
  await page.goto('/dashboard?section=queue')
  await page.getByRole('button', { name: new RegExp(target.name) }).click()
  const plan = page.getByRole('region', { name: 'Message planning' })
  await expect(plan.getByRole('button', { name: /Plan the first message/ })).toHaveAttribute('aria-expanded', 'false')
  await plan.getByRole('button', { name: /Plan the first message/ }).click()
  await expect(plan.getByText('Who are you representing?', { exact: true })).toBeVisible()
  await expect(plan.getByText('Matrix Fellows', { exact: true })).toBeVisible()
  await expect(plan.getByText('A member', { exact: true })).toBeVisible()
  await plan.getByRole('button', { name: 'Build message plan' }).click()
  await expect(plan.getByRole('heading', { name: 'Suggested approach' })).toBeVisible()
  await expect(plan.getByText(/Reviewed public evidence supplies/)).toBeVisible()
  await plan.getByRole('button', { name: 'Create editable draft' }).click()
  await expect(page.getByRole('heading', { name: 'Messages to review' })).toBeVisible()
  await expect(page.locator('.email-body')).toBeVisible()
  await page.screenshot({ path: `/tmp/matrix-dashboard-evidence/message-plan-${info.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
