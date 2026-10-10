import { expect, test } from '@playwright/test'
import { setup, dueDate } from '../fixtures/dashboard-browser'
test.use({ video: 'on' })

test('fixture: saved discovery does not depend on the current public page', async ({ page }) => {
  const state = await setup(page)
  state.workspace.catalogSaves.push('catalog:synthetic-chemistry-poster-2027')
  await page.route('**/api/opportunities**', (route) =>
    route.fulfill({ json: { items: [], page: 1, pageCount: 1, total: 0 } }),
  )
  await page.goto('/dashboard?section=opportunities')
  await expect(page.getByRole('button', { name: /Inspect sources/ })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Saved only', exact: true }).check()
  await expect(page.getByRole('button', { name: /Inspect sources/ })).toBeVisible()
  expect(state.plan.tasks).toHaveLength(0)
})

test('fixture: first-run profile edits receive navigation protection', async ({ page }) => {
  const state = await setup(page)
  state.workspace.profiles = []
  await page.goto('/dashboard?section=profiles')
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic first profile')
  const confirmation = page.waitForEvent('dialog')
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('link', { name: 'Matrix Fellows home', exact: true }).click()
  const dialog = await confirmation
  expect(dialog.message()).toContain('unsaved workspace edits')
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Synthetic first profile')
})

test('fixture: society edits survive unrelated refresh and newer typing during save', async ({
  page,
}) => {
  const state = await setup(page)
  state.workspace.member.role = 'officer'
  await page.goto('/dashboard?section=society')
  const description = page.getByLabel('Concise introduction', { exact: true })
  await description.fill('Synthetic unsaved society description')
  const navigation = page.getByRole('navigation', { name: 'Dashboard sections' })
  await navigation.getByRole('button', { name: 'Your profile', exact: true }).click()
  await page.getByRole('button', { name: 'Save my profile', exact: true }).click()
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible()
  await navigation.getByRole('button', { name: 'Society', exact: true }).click()
  await expect(description).toHaveValue('Synthetic unsaved society description')
  await page.getByRole('button', { name: 'Save reviewed profile', exact: true }).click()
  await expect.poll(() => state.writes.some((w) => w.path === '/api/workspace/society')).toBe(true)
  await description.fill('Synthetic newer society description')
  await expect(
    page.getByText('Submitted society profile saved. Your newer edits still need saving.'),
  ).toBeVisible()
  await expect(description).toHaveValue('Synthetic newer society description')
  expect(state.workspace.society.description).toBe('Synthetic unsaved society description')
})

test('fixture: newer profile typing stays unsaved until its own submission', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/dashboard?section=profiles')
  const name = page.getByLabel('Full name', { exact: true })
  await name.fill('Synthetic submitted name')
  await page.getByRole('button', { name: 'Save my profile', exact: true }).click()
  await expect.poll(() => state.writes.some((w) => w.path.includes('/profiles/'))).toBe(true)
  await name.fill('Synthetic newer name')
  await expect(
    page.getByText('Submitted profile saved. Your newer edits still need saving.'),
  ).toBeVisible()
  await expect(name).toHaveValue('Synthetic newer name')
  expect(state.workspace.profiles[0]?.fullName).toBe('Synthetic submitted name')
  await page.getByRole('button', { name: 'Save my profile', exact: true }).click()
  await expect.poll(() => state.workspace.profiles[0]?.fullName).toBe('Synthetic newer name')
  await page.reload()
  await expect(name).toHaveValue('Synthetic newer name')
})

test('fixture: inspector Back, reversible Pass and honest private URL capture', async ({
  page,
}) => {
  const state = await setup(page)
  await page.goto('/dashboard?section=opportunities')
  await page.getByRole('button', { name: /Inspect sources/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Pass', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByLabel('Reason', { exact: false })
    .fill('Synthetic travel constraint')
  await page.getByRole('button', { name: 'Pass for now', exact: true }).click()
  await expect(page.getByRole('button', { name: /Inspect sources/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo pass', exact: true }).click()
  await expect(page.getByRole('button', { name: /Inspect sources/ })).toBeVisible()
  expect(state.plan.tasks).toHaveLength(0)
  await page.getByRole('button', { name: '+ Add opportunity URL', exact: true }).click()
  await page.getByLabel('Official opportunity URL').fill('https://example.edu/synthetic-program')
  await page.getByRole('button', { name: 'Preview reference', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Private · unverified reference')
  await page.getByLabel('Reference name').fill('Synthetic program to verify')
  await page.getByRole('button', { name: 'Save private reference', exact: true }).click()
  await expect(
    page.getByRole('dialog').getByRole('link', { name: /Synthetic program to verify/ }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.reload()
  await page.getByRole('button', { name: '+ Add opportunity URL', exact: true }).click()
  await expect(
    page.getByRole('dialog').getByRole('link', { name: /Synthetic program to verify/ }),
  ).toBeVisible()
  expect(state.references).toHaveLength(1)
  expect(state.plan.tasks).toHaveLength(0)
})

test('fixture: save, reviewed pursuit, canonical views, reload, and contribution', async ({
  page,
}, info) => {
  const state = await setup(page)
  await page.goto('/dashboard?section=opportunities')
  await page.getByRole('button', { name: 'Save opportunity to your account', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Remove saved opportunity', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(state.plan.tasks).toHaveLength(0)
  await page.getByRole('button', { name: 'Inspect sources', exact: false }).click()
  await expect(page.getByRole('dialog')).toContainText('Feb 15, 2027')
  await page.getByRole('button', { name: 'Pursue', exact: false }).click()
  const review = page.getByRole('dialog')
  await review.getByLabel('Internal target', { exact: true }).first().fill(dueDate)
  expect((await review.getByRole('checkbox').boundingBox())?.width).toBeLessThanOrEqual(24)
  if (!process.env.DASHBOARD_RECORD_ONLY)
    await review.screenshot({
      path: `/tmp/matrix-dashboard-evidence/pursue-review-${info.project.name}.png`,
    })
  await review.getByRole('checkbox').check()
  await review.getByRole('button', { name: 'Create reviewed plan', exact: true }).click()
  await expect(review).toHaveCount(0)
  expect(state.plan.pursuits).toHaveLength(1)
  expect(state.plan.tasks).toHaveLength(2)
  const original = 'Verify eligibility and the current application cycle'
  await page.getByRole('button', { name: new RegExp(`^${original}`) }).click()
  await page
    .getByRole('dialog')
    .getByLabel('Task', { exact: true })
    .fill('Synthetic review of poster requirements')
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /^Synthetic review of poster requirements/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'calendar', exact: true }).click()
  await expect(
    page
      .locator('.wb-calendar')
      .getByRole('button', { name: /Synthetic review of poster requirements/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'timeline', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /^Synthetic review of poster requirements/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'board', exact: true }).click()
  await expect(page.getByText('0 of 2 steps complete')).toBeVisible()
  await page.getByRole('button', { name: 'agenda', exact: true }).click()
  await page
    .getByRole('button', { name: 'Complete Synthetic review of poster requirements', exact: true })
    .click()
  await page.getByRole('button', { name: 'board', exact: true }).click()
  await expect(page.getByText('1 of 2 steps complete')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'My plan', exact: true }).click()
  // The selected Board view is preserved; task rows belong to Agenda, not Board.
  await page.getByRole('button', { name: 'agenda', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /^Synthetic review of poster requirements/ }),
  ).toBeVisible()
  expect(state.writes.filter((w) => w.path === '/api/workspace/plan/pursuits')).toHaveLength(1)
  if (!process.env.DASHBOARD_RECORD_ONLY)
    await page.screenshot({
      path: `/tmp/matrix-dashboard-evidence/plan-${info.project.name}.png`,
      fullPage: true,
    })
  await page
    .getByRole('navigation', { name: 'Dashboard sections' })
    .getByRole('button', { name: 'Activities', exact: true })
    .click()
  await page.getByRole('button', { name: '+ Add activity', exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Synthetic spectroscopy notebook')
  await page.getByLabel('Your role', { exact: true }).fill('Analysis author')
  await page.getByRole('button', { name: 'Create activity', exact: true }).click()
  await page.getByRole('button', { name: /Synthetic spectroscopy notebook/ }).click()
  await page
    .getByLabel('What did you contribute?')
    .fill('Implemented and tested baseline normalization.')
  await page.getByLabel('What did you learn?').fill('The baseline depends on calibration.')
  await page.getByRole('button', { name: 'Save contribution', exact: true }).click()
  await expect(page.getByText('Implemented and tested baseline normalization.')).toBeVisible()
  if (!process.env.DASHBOARD_RECORD_ONLY)
    await page.screenshot({
      path: `/tmp/matrix-dashboard-evidence/activity-${info.project.name}.png`,
      fullPage: true,
    })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
  await page.close()
  await page.video()?.saveAs(`/tmp/matrix-dashboard-evidence/planning-${info.project.name}.webm`)
})

test('fixture: assigned research evidence, autosave preserves in-flight typing and reload', async ({
  page,
}, info) => {
  const state = await setup(page)
  await page.goto('/dashboard?section=queue')
  await page.getByRole('button', { name: /Synthetic Arlington Chemistry Lab/ }).click()
  await expect(
    page.getByText('Spectroscopy methods; student availability unconfirmed.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Assign connection', exact: true })).toHaveCount(0)
  await page
    .getByRole('navigation', { name: 'Dashboard sections' })
    .getByRole('button', { name: 'Draft review', exact: true })
    .click()
  await page.getByRole('button', { name: /Synthetic inquiry about spectroscopy/ }).click()
  const editor = page.getByLabel('Email', { exact: true })
  await editor.fill('Synthetic first manually edited paragraph.')
  await expect.poll(state.patches).toBe(1)
  await editor.fill('Synthetic final text typed during an in-flight save.')
  await expect
    .poll(() => state.workspace.proposals[0]?.body)
    .toBe('Synthetic final text typed during an in-flight save.')
  await expect(editor).toHaveValue('Synthetic final text typed during an in-flight save.')
  await expect(
    page.getByRole('button', { name: 'Approve exact revision', exact: true }),
  ).toBeDisabled()
  if (!process.env.DASHBOARD_RECORD_ONLY)
    await page.screenshot({
      path: `/tmp/matrix-dashboard-evidence/draft-${info.project.name}.png`,
      fullPage: true,
    })
  await page.reload()
  await page.getByRole('button', { name: /Synthetic inquiry about spectroscopy/ }).click()
  await expect(editor).toHaveValue('Synthetic final text typed during an in-flight save.')
  await page.close()
  await page.video()?.saveAs(`/tmp/matrix-dashboard-evidence/research-${info.project.name}.webm`)
})

test('fixture: revision conflict preserves manual buffer without retrying or sending', async ({
  page,
}) => {
  const state = await setup(page, true)
  await page.goto('/dashboard?section=drafts')
  await page.getByRole('button', { name: /Synthetic inquiry about spectroscopy/ }).click()
  const editor = page.getByLabel('Email', { exact: true })
  await editor.fill('Synthetic conflict buffer must survive.')
  await expect(
    page.getByText(/Another revision exists. Copy your text before reloading/),
  ).toBeVisible()
  await expect(editor).toHaveValue('Synthetic conflict buffer must survive.')
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
  expect(state.patches()).toBe(1)
  expect(state.writes.some((w) => w.path === '/api/workspace/send')).toBe(false)
})

test('fixture: keyboard, reduced motion, 1024 layout and CPU-throttled input', async ({
  page,
  browserName,
}, info) => {
  await setup(page)
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/dashboard?section=today')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  if (!process.env.DASHBOARD_RECORD_ONLY)
    await page.screenshot({
      path: `/tmp/matrix-dashboard-evidence/today-1024-${info.project.name}.png`,
      fullPage: true,
    })
  await page.getByRole('button', { name: '+ Add task', exact: true }).click()
  const panel = page.getByRole('dialog')
  await expect(panel).toBeVisible()
  await expect(panel.getByLabel('Task', { exact: true })).toBeFocused()
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await panel
      .getByLabel('Task', { exact: true })
      .pressSequentially('Synthetic constrained task', { delay: 8 })
    await expect(panel.getByLabel('Task', { exact: true })).toHaveValue(
      'Synthetic constrained task',
    )
    const cadence = await page.evaluate(async () => {
      const intervals: number[] = []
      let previous = performance.now()
      for (let index = 0; index < 45; index++)
        await new Promise<void>((resolve) =>
          requestAnimationFrame((now) => {
            intervals.push(now - previous)
            previous = now
            resolve()
          }),
        )
      intervals.sort((a, b) => a - b)
      return {
        environment:
          'Chromium local test build, CPU4x, reduced motion, synthetic data; raw RAF is not GPU presentation',
        count: intervals.length,
        p95: intervals[Math.floor(intervals.length * 0.95)],
        p99: intervals[Math.floor(intervals.length * 0.99)],
        max: intervals.at(-1),
      }
    })
    await info.attach('cpu4x-raw-raf-not-presentation', {
      body: JSON.stringify(cadence),
      contentType: 'application/json',
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  }
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+ Add task', exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
})
