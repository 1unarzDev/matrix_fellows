import { expect, test } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'

const key = 'matrix-fellows:saved-opportunities:v1'
const id = 'catalog:synthetic-chemistry-poster-2027'

test('browser saves transfer explicitly, account saves stay private, and failures preserve state', async ({
  page,
}, info) => {
  const state = await setup(page)
  let searchCount = 0
  async function findFixture() {
    // Do not submit the progressive-enhancement form before hydration.
    await expect(page.locator('.save-control').first()).toBeEnabled()
    await page
      .getByRole('searchbox', { name: 'Search opportunities', exact: true })
      .fill(`synthetic ${++searchCount}`)
    await page.getByRole('searchbox', { name: 'Search opportunities', exact: true }).press('Enter')
    await expect(
      page.getByRole('link', { name: 'Synthetic Chemistry Poster Call', exact: true }),
    ).toBeVisible()
  }
  let authenticated = false
  await page.route('**/api/workspace/auth/session', (route) =>
    route.fulfill({
      json: {
        configured: true,
        authenticated,
        officer: authenticated ? state.workspace.member : null,
      },
    }),
  )
  await page.goto('/opportunities')
  await findFixture()
  const guestSave = page.getByRole('button', {
    name: 'Save opportunity on this device',
    exact: true,
  })
  await guestSave.click()
  await expect(
    page.getByRole('button', { name: 'Remove saved opportunity', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key)).toEqual([id])
  await page.reload()
  await findFixture()
  await expect(
    page.getByRole('button', { name: 'Remove saved opportunity', exact: true }),
  ).toBeEnabled()
  authenticated = true
  await page.goto('/dashboard?section=opportunities')
  // Account collection takes precedence; no silent merge on this shared device.
  await expect(
    page.getByRole('button', { name: 'Save opportunity to your account', exact: true }),
  ).toBeVisible()
  expect(state.workspace.catalogSaves).toEqual([])
  await page.screenshot({
    path: `/tmp/matrix-dashboard-polish/transfer-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Add to account', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remove saved opportunity', exact: true }),
  ).toBeVisible()
  expect(state.workspace.catalogSaves).toEqual([id])
  expect(state.plan.tasks).toEqual([])
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull()
  await page.goto('/opportunities')
  await findFixture()
  await expect(
    page.getByRole('button', { name: 'Remove saved opportunity', exact: true }),
  ).toBeEnabled()
  await page.route('**/api/workspace/catalog-saves/*', (route) =>
    route.fulfill({ status: 503, json: { statusMessage: 'Synthetic save failure' } }),
  )
  await page.getByRole('button', { name: 'Remove saved opportunity', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remove saved opportunity', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(state.workspace.catalogSaves).toEqual([id])
  // Another account must not inherit the first account's private collection.
  state.workspace.member.userId = '99999999-9999-4999-8999-999999999999'
  state.workspace.catalogSaves = []
  await page.reload()
  await findFixture()
  await expect(
    page.getByRole('button', { name: 'Save opportunity to your account', exact: true }),
  ).toBeEnabled()
  authenticated = false
  await page.reload()
  await findFixture()
  await expect(
    page.getByRole('button', { name: 'Save opportunity on this device', exact: true }),
  ).toBeEnabled()
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull()
})

test('dashboard catalog shares featured panels, rounded navigation and responsive spacing', async ({
  page,
}, info) => {
  const state = await setup(page)
  state.workspace.member.role = 'officer'
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 960 })
    await page.goto('/dashboard?section=opportunities')
    await expect(page.locator('.opportunity-card--featured')).toBeVisible()
    await expect(page.getByText('Next useful checkpoint', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Details', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Jump to/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Legacy saved work', exact: true })).toHaveCount(
      0,
    )
    const draft = page
      .getByRole('navigation', { name: 'Dashboard sections' })
      .getByRole('button', { name: 'Draft review', exact: true })
    await draft.scrollIntoViewIfNeeded()
    expect(await draft.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('15px')
    await page
      .getByRole('navigation', { name: 'Dashboard sections' })
      .getByRole('button', { name: 'Opportunities', exact: true })
      .scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    await page.screenshot({
      path: `/tmp/matrix-dashboard-polish/catalog-${width}-${info.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await draft.click()
    await expect(page.getByRole('heading', { name: 'Draft review', exact: true })).toBeVisible()
    await expect(draft).toHaveAttribute('aria-current', 'page')
    await page.screenshot({
      path: `/tmp/matrix-dashboard-polish/drafts-${width}-${info.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
  await page.goto('/dashboard?section=saved')
  await expect(page.locator('.opportunity-card--featured')).toBeVisible()
})
