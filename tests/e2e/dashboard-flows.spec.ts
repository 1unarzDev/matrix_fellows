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
  await expect(page.getByRole('button', { name: 'Details', exact: true })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Saved only', exact: true }).check()
  await expect(page.getByRole('button', { name: 'Details', exact: true })).toBeVisible()
  expect(state.plan.tasks).toHaveLength(0)
})

test('fixture: first-run profile edits receive navigation protection', async ({ page }) => {
  const state = await setup(page)
  state.workspace.profiles = []
  await page.goto('/dashboard?section=profiles')
  await page.locator('summary').filter({hasText:'Advanced profile editing'}).click()
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic first profile')
  const confirmation = page.waitForEvent('dialog')
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('link', { name: 'Matrix Fellows home', exact: true }).click()
  const dialog = await confirmation
  expect(dialog.message()).toContain('unsaved workspace edits')
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Synthetic first profile')
})

test('fixture: society context queues immediately and grows the connection cloud', async ({ page }) => {
  const state = await setup(page)
  state.workspace.member.role = 'officer'
  await page.goto('/dashboard?section=society')
  await expect(page.getByRole('heading', { name: /expanding constellation/i })).toBeVisible()
  await page.getByRole('button', { name: 'Add context', exact: true }).click()
  await page.getByLabel('A short title').fill('UTA introduction')
  await page.getByLabel('Email chain, notes, or context').fill('From: Dr. Ada Lovelace <ada@uta.edu>')
  await page.getByRole('button', { name: 'Add to constellation', exact: true }).click()
  await expect(page.getByText(/queued without blocking this page/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'New memory' })).toBeHidden()
  await expect(page.getByRole('heading', { name: 'UTA introduction', exact: true })).toBeVisible()
})

test('fixture: newer profile typing stays unsaved until its own submission', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/dashboard?section=profiles')
  await page.locator('summary').filter({hasText:'Advanced profile editing'}).click()
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
  await page.locator('summary').filter({hasText:'Advanced profile editing'}).click()
  await expect(name).toHaveValue('Synthetic newer name')
})

test('fixture: inspector Back, simplified actions and personal URL capture', async ({
  page,
}) => {
  const state = await setup(page)
  await page.goto('/dashboard?section=opportunities')
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Pass', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Details', exact: true })).toBeVisible()
  expect(state.plan.tasks).toHaveLength(0)
  await page.getByRole('button', { name: '+ Add opportunity URL', exact: true }).click()
  await page.getByLabel('Official opportunity URL').fill('https://example.edu/synthetic-program')
  await page.getByRole('button', { name: 'Inspect link', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Personal opportunity')
  await page.getByRole('button', { name: 'Save to my opportunities', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Synthetic source reference')
  expect(state.references).toHaveLength(0)
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
  await page.getByRole('button', { name: 'Details', exact: true }).click()
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

test('fixture: officer research evidence, autosave preserves in-flight typing and reload', async ({
  page,
}, info) => {
  const state = await setup(page)
  state.workspace.member.role = 'officer'
  await page.goto('/dashboard?section=queue')
  await page.getByRole('button', { name: /Synthetic Arlington Chemistry Lab/ }).click()
  await expect(
    page.getByText('Spectroscopy methods; student availability unconfirmed.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Next step', { exact: true })).toBeVisible()
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
  state.workspace.member.role = 'officer'
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

test('fixture: Today command center makes planning a magnetic, low-friction flow', async ({ page }) => {
  const state = await setup(page)
  state.plan.activities.push({
    id: 'activity-orbit',
    title: 'Spectroscopy notebook',
    goal: 'Compare baseline spectra',
    role: '',
    milestone: 'Compare baseline spectra',
    status: 'active',
    contributions: [],
    version: 1,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  })
  await page.goto('/dashboard?section=today')

  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByText(/weekly capacity/i)).toHaveCount(0)
  await expect(page.locator('.day-rail')).toBeVisible()
  await expect(page.locator('.day-panel__date')).toHaveText('Today')

  const targetDate = new Date(`${dueDate}T12:00:00Z`)
  targetDate.setUTCDate(targetDate.getUTCDate() + 2)
  const targetDateKey = targetDate.toISOString().slice(0, 10)
  const targetDay = targetDate.getUTCDate()
  const selectedDay = page.locator(`.day-orbit[data-day="${targetDateKey}"]`)
  await selectedDay.click()
  await expect(page.locator('.day-panel__date')).toContainText(
    targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }),
  )

  await page.getByRole('button', { name: /Add a task/ }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Task name').fill('Map an experiment')
  await dialog.locator('.quick-calendar__day').filter({ hasText: String(targetDay) }).click()
  await dialog.locator('button.quick-task-form__save').click()
  await expect(dialog).toHaveCount(0)
  const taskWrite = state.writes.find((write) => write.path === '/api/workspace/plan/tasks')
  expect(taskWrite?.body.task).toMatchObject({ title: 'Map an experiment', dueDate: targetDateKey })
  expect(taskWrite?.body.task.scheduledStart).toBeTruthy()
  expect(taskWrite?.body.task.scheduledEnd).toBeTruthy()

  await page.getByRole('button', { name: /Active · pause/ }).click()
  await expect.poll(() => state.writes.filter((write) => write.path === '/api/workspace/plan/activities/activity-orbit').length).toBe(1)
})
