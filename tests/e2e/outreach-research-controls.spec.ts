import { expect, test, type Page } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'

test.use({ video: 'on' })

async function researchFixture(page: Page, role = 'admin') {
  const state = await setup(page)
  state.workspace.member.role = role
  const writes: any[] = []
  const reads: URL[] = []
  const settings = { paused: false, weekly_limit: 15, batch_limit: 5, queue_limit: 45, concurrency: 2, ai_enabled: true, terms_confirmed: true }
  const source = { id: 'uta-lab', url: 'https://www.uta.edu/research/laboratory', enabled: true, ai_reviewed: false, ai_excerpt: 'Public technical research excerpt.', snapshot: { hash: 'snapshot-fixture-hash' } }
  await page.route('**/api/workspace/research**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/api/workspace/research/sources/uta-lab') return route.fulfill({ json: { source } })
    if (url.pathname !== '/api/workspace/research') return route.fallback()
    if (request.method() === 'POST') {
      const body = request.postDataJSON(); writes.push(body)
      if (body.action === 'settings') Object.assign(settings, body.settings)
      if (body.action === 'pause' || body.action === 'resume') settings.paused = body.action === 'pause'
      return route.fulfill({ json: { ok: true } })
    }
    reads.push(url)
    return route.fulfill({ json: {
      settings, sources: [source], jobs: [{ id: 'job-fixture', kind: 'acquire', status: 'failed', error: 'Source temporarily unavailable.', created_at: '2026-10-11T12:00:00Z' }],
      pagination: { sourceTotal: 45, jobTotal: 45 },
      health: { note: 'The outreach worker gathers reviewed public evidence.', stages: [], coverage: [source] },
    } })
  })
  return { writes, reads }
}

const toggle = (page: Page) => page.getByRole('button', { name: /Research runs Schedule, sources & activity/ })

test('admin manages schedule, settings, reviewed sources and retries inside Outreach', async ({ page }, info) => {
  const { writes, reads } = await researchFixture(page)
  await page.goto('/dashboard?section=queue')
  await expect(page.getByRole('heading', { name: 'Outreach', exact: true })).toBeVisible()
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false')
  expect(reads).toHaveLength(0)
  await toggle(page).click()
  await expect(page.getByRole('button', { name: 'Queue a research run' })).toBeVisible()
  await page.getByRole('button', { name: 'Queue a research run' }).click()
  await expect.poll(() => writes.some(w => w.action === 'run')).toBe(true)
  await page.getByRole('button', { name: 'Pause scheduling' }).click()
  await expect(page.getByRole('button', { name: 'Resume scheduling' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Queue a research run' })).toBeDisabled()
  await page.getByRole('button', { name: 'Resume scheduling' }).click()
  await page.getByText('Limits & Gemini settings', { exact: true }).click()
  await page.getByLabel('Maximum new leads / week').fill('18')
  await page.getByRole('button', { name: 'Save research limits' }).click()
  await expect.poll(() => writes.find(w => w.action === 'settings')?.settings.weekly_limit).toBe(18)
  await page.locator('.research-runs-panel').screenshot({ path: `/tmp/matrix-dashboard-evidence/research-controls-${info.project.name}.png` })
  await page.getByText('Limits & Gemini settings', { exact: true }).click()
  await page.getByText('Vetted discovery sources', { exact: true }).click()
  await page.getByRole('button', { name: 'Next sources' }).click()
  await expect.poll(() => reads.some(url => url.searchParams.get('sourceOffset') === '40')).toBe(true)
  await page.getByRole('button', { name: 'Review source' }).click()
  await page.getByRole('button', { name: 'Save source review' }).click()
  await expect.poll(() => writes.find(w => w.action === 'source')?.snapshotHash).toBe('snapshot-fixture-hash')
  await page.getByText('Vetted discovery sources', { exact: true }).click()
  await page.getByText('Recent jobs', { exact: true }).click()
  await page.getByRole('button', { name: 'Retry stage' }).click()
  await expect.poll(() => writes.find(w => w.action === 'retry')?.jobId).toBe('job-fixture')
  await page.screenshot({ path: `/tmp/matrix-dashboard-evidence/research-outreach-${info.project.name}.png`, fullPage: true })
  await toggle(page).click()
  await expect.poll(() => page.locator('#workspace-research-runs').evaluate(el => el.getBoundingClientRect().height)).toBe(0)
  await page.locator('.section-top').first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: `/tmp/matrix-dashboard-evidence/research-collapsed-${info.project.name}.png` })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('legacy Research runs link opens Outreach and loads controls for officers', async ({ page }) => {
  const { reads } = await researchFixture(page, 'officer')
  await page.goto('/dashboard?section=research')
  await expect(page.getByRole('heading', { name: 'Outreach', exact: true })).toBeVisible()
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Queue a research run' })).toBeVisible()
  expect(reads.length).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Pause scheduling' })).toHaveCount(0)
  await expect(page.getByText('Limits & Gemini settings', { exact: true })).toHaveCount(0)
  await page.getByText('Vetted discovery sources', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Review source' })).toHaveCount(0)
  await page.getByText('Recent jobs', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retry stage' })).toHaveCount(0)
})

test('member deep links expose neither research controls nor research requests', async ({ page }) => {
  const { reads } = await researchFixture(page, 'member')
  await page.goto('/dashboard?section=research')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await page.goto('/dashboard?section=queue')
  await expect(page.getByRole('heading', { name: 'Outreach', exact: true })).toBeVisible()
  await expect(toggle(page)).toHaveCount(0)
  expect(reads).toHaveLength(0)
})

test('research disclosure supports keyboard, smooth closing and reduced motion', async ({ page }) => {
  await researchFixture(page)
  await page.goto('/dashboard?section=queue')
  const button = toggle(page)
  const body = page.locator('#workspace-research-runs')
  await button.focus()
  await button.press('Enter')
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Queue a research run' })).toBeVisible()
  await expect.poll(() => body.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(100)
  await button.press('Space')
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(body).toHaveAttribute('inert', '')
  await expect.poll(() => body.evaluate(el => el.getBoundingClientRect().height)).toBe(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await button.press('Enter')
  expect(await body.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s')
  await expect(page.getByRole('button', { name: 'Queue a research run' })).toBeVisible()
})

test('a late pagination response cannot replace a newer source page', async ({ page }) => {
  await researchFixture(page)
  await page.goto('/dashboard?section=research')
  await expect(page.getByRole('button', { name: 'Queue a research run' })).toBeVisible()
  await page.getByText('Vetted discovery sources', { exact: true }).click()
  let delayed: import('@playwright/test').Route | undefined
  const result = (offset: number) => ({
    settings: { paused: false }, sources: [{ id: `page-${offset}`, url: `https://example.edu/page-${offset}`, enabled: true }], jobs: [],
    pagination: { sourceTotal: 200, jobTotal: 0 }, health: { stages: [], coverage: [] },
  })
  await page.route('**/api/workspace/research?**', async route => {
    const offset = Number(new URL(route.request().url()).searchParams.get('sourceOffset'))
    if (offset === 40) { delayed = route; return }
    return route.fulfill({ json: result(offset) })
  })
  await page.getByRole('button', { name: 'Next sources' }).click()
  await expect.poll(() => Boolean(delayed)).toBe(true)
  await page.getByRole('button', { name: 'Next sources' }).click()
  await expect(page.getByRole('link', { name: 'https://example.edu/page-80', exact: true })).toBeVisible()
  const lateResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('sourceOffset') === '40')
  await delayed!.fulfill({ json: result(40) })
  await lateResponse
  await expect(page.getByRole('link', { name: 'https://example.edu/page-80', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'https://example.edu/page-40', exact: true })).toHaveCount(0)
})
