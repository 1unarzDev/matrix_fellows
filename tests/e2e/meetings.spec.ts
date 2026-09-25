import { expect, test } from '@playwright/test'

test('meetings route renders a crawlable confirmed and projected schedule', async ({ page }, testInfo) => {
  const response = await page.goto('/meetings')
  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', { name: 'Meetings are where questions become plans.' }),
  ).toBeVisible()
  await expect(
    page.locator('#first-exchange-2026-09-25').getByRole('heading', {
      name: /first exchange of ideas\./i,
    }),
  ).toBeVisible()
  await expect(
    page.getByText('From an ISEF interest to a regional-fair entry.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Projected · not confirmed', { exact: true })).toBeVisible()
  const feature = page.locator('.meetings-feature')
  await expect(feature).toHaveCSS('border-radius', '32px')
  const [calendarColumn, detailColumn] = await Promise.all([
    feature.locator('.meetings-feature__calendar').boundingBox(),
    feature.locator('.meetings-feature__detail').boundingBox(),
  ])
  expect(calendarColumn).not.toBeNull()
  expect(detailColumn).not.toBeNull()
  if (testInfo.project.name === 'mobile') {
    expect(detailColumn!.y).toBeGreaterThan(calendarColumn!.y + calendarColumn!.height)
  } else {
    expect(detailColumn!.y).toBeCloseTo(calendarColumn!.y, 0)
    expect(detailColumn!.height).toBeCloseTo(calendarColumn!.height, 0)
  }
  const datePanel = page.locator('.meeting-row__date').first()
  await expect(datePanel).toHaveCSS('padding-top', '12.8px')
  await expect(datePanel).toHaveCSS('padding-bottom', '12.8px')
})

test('calendar navigation and meeting dialogs preserve status and focus', async ({ page }) => {
  await page.goto('/meetings')
  await page.locator('[data-calendar-ready="true"]').waitFor()
  const calendar = page.getByRole('region', { name: 'Meeting calendar' })
  await expect(calendar.getByText('September 2026', { exact: true })).toBeVisible()

  await calendar.getByRole('button', { name: /Next month from September 2026/ }).click()
  await expect(calendar.getByText('October 2026', { exact: true })).toBeVisible()

  const projectedDate = calendar.getByRole('button', {
    name: /From an ISEF interest to a regional-fair entry.*tentative/,
  })
  await projectedDate.click()
  const dialog = page.getByRole('dialog', {
    name: 'From an ISEF interest to a regional-fair entry.',
  })
  await expect(dialog).toBeVisible()
  await expect(page.locator('#__nuxt')).toHaveAttribute('inert', '')
  await expect(dialog.getByText('Projected · not confirmed', { exact: true })).toBeVisible()
  await expect(
    dialog.getByRole('link', { name: /Fort Worth Regional Science and Engineering Fair/ }),
  ).toHaveAttribute('href', 'https://fwrsef.org/')

  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('#__nuxt')).not.toHaveAttribute('inert', '')
  await expect(projectedDate).toBeFocused()
})

test('meetings page and its shared navigation do not overflow narrow screens', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/meetings')
    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }))
    expect(overflow.body, `body overflow at ${width}px`).toBeLessThanOrEqual(1)
    expect(overflow.document, `document overflow at ${width}px`).toBeLessThanOrEqual(1)
    await expect(page.getByRole('navigation', { name: 'Resource library' })).toBeVisible()
  }
})

test('saved opportunity periods glow, overlap in separate lanes, and keep middle days actionable', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'matrix-fellows:saved-opportunities:v1',
      JSON.stringify(['saved:institute', 'saved:competition']),
    ),
  )
  const entry = (overrides: Record<string, unknown>) => ({
    id: 'saved-institute-period', opportunityId: 'saved:institute',
    opportunityTitle: 'Saved Summer Institute', milestoneTitle: 'Research institute',
    summary: 'A saved multi-day research experience.', date: '2026-10-12', timezone: null,
    precision: 'date-only', location: 'Texas', kind: 'event', state: 'confirmed',
    requirements: [], officialUrl: 'https://example.edu/institute', evidence: 'Verified schedule.',
    verifiedAt: '2026-09-24', priority: 90, saved: true,
    period: { id: 'institute-period', startDate: '2026-10-12', endDate: '2026-10-16', display: 'span' },
    ...overrides,
  })
  await page.route('**/api/opportunities/saved-calendar', async (route) => {
    await route.fulfill({
      json: {
        entries: [
          entry({}),
          entry({
            id: 'saved-competition-period', opportunityId: 'saved:competition',
            opportunityTitle: 'Saved Research Competition', milestoneTitle: 'Competition showcase', date: '2026-10-13',
            period: { id: 'competition-period', startDate: '2026-10-13', endDate: '2026-10-15', display: 'span' },
          }),
          entry({
            id: 'saved-single-deadline', opportunityId: 'saved:deadline',
            opportunityTitle: 'Single-day deadline', milestoneTitle: 'Application due',
            date: '2026-10-20', kind: 'deadline', period: undefined,
          }),
          entry({
            id: 'saved-single-workshop', opportunityId: 'saved:workshop',
            opportunityTitle: 'Single-day workshop', milestoneTitle: 'Workshop presentation',
            date: '2026-10-20', kind: 'event', period: undefined,
          }),
        ],
      },
    })
  })
  const savedResponse = page.waitForResponse((response) =>
    response.url().includes('/api/opportunities/saved-calendar'),
  )
  await page.goto('/meetings')
  await savedResponse
  await page.locator('[data-calendar-ready="true"]').waitFor()
  const calendar = page.getByRole('region', { name: 'Meeting calendar' })
  await calendar.getByRole('button', { name: /Next month from September 2026/ }).click()
  await expect(calendar.getByText('October 2026', { exact: true })).toBeVisible()

  const middle = calendar.getByRole('button', { name: /Saved Summer Institute.*Saved Research Competition.*2026-10-14/ })
  await expect(middle.locator('.meeting-day__saved-signal')).toHaveCount(0)
  const segments = middle.locator('.meeting-day__period')
  await expect(segments).toHaveCount(2)
  await expect(segments.first()).toHaveCSS('box-shadow', /rgb/)
  await expect(middle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(middle).toHaveCSS('box-shadow', 'none')
  const laneTops = await segments.evaluateAll((items) =>
    items.map((item) => Number.parseFloat(getComputedStyle(item).top)),
  )
  expect(Math.abs(laneTops[0]! - laneTops[1]!)).toBeGreaterThanOrEqual(3.5)
  const capsuleHeight = await segments.first().evaluate((item) =>
    Number.parseFloat(getComputedStyle(item).height),
  )
  expect(capsuleHeight).toBeGreaterThanOrEqual(6)
  await expect(segments.first()).toHaveCSS('border-radius', '0px')
  const [middleBounds, capsuleBounds] = await Promise.all([
    middle.boundingBox(),
    segments.first().boundingBox(),
  ])
  expect(middleBounds).not.toBeNull()
  expect(capsuleBounds).not.toBeNull()
  expect(capsuleBounds!.x).toBeLessThan(middleBounds!.x)
  expect(capsuleBounds!.x + capsuleBounds!.width).toBeGreaterThan(
    middleBounds!.x + middleBounds!.width,
  )
  await expect(middle.locator('.meeting-day__number')).toHaveCSS('z-index', '3')

  const rangeStart = calendar.locator('button[aria-label$=", 2026-10-12"]')
  const startCapsule = rangeStart.locator('[data-period-id="institute-period"]')
  await expect(startCapsule).toHaveAttribute('data-period-position', 'start')
  await expect(startCapsule).not.toHaveCSS('border-radius', '0px')
  await middle.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Saved on this device')
  const panel = dialog.locator('[data-meeting-dialog-panel]')
  const switcher = dialog.locator('.meeting-dialog__switcher')
  const detail = dialog.locator('.calendar-detail')
  await expect(panel).toHaveCSS('border-top-width', '1px')
  await expect(panel).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(detail).toHaveCSS('border-top-width', '0px')
  await expect(detail).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect.poll(async () => {
    const [outer, tabs] = await Promise.all([panel.boundingBox(), switcher.boundingBox()])
    return outer && tabs ? tabs.y - outer.y : -1
  }).toBeGreaterThan(0.5)
  const [panelBounds, switcherBounds] = await Promise.all([
    panel.boundingBox(),
    switcher.boundingBox(),
  ])
  expect(panelBounds).not.toBeNull()
  expect(switcherBounds).not.toBeNull()
  expect(switcherBounds!.x).toBeGreaterThan(panelBounds!.x)
  expect(switcherBounds!.x + switcherBounds!.width).toBeLessThan(
    panelBounds!.x + panelBounds!.width,
  )
  await expect(switcher.getByRole('button')).toHaveCount(2)
  await switcher.getByRole('button', { name: /Saved Research Competition/ }).click()
  await expect(dialog.getByRole('heading', { name: 'Competition showcase' })).toBeVisible()

  await dialog.locator('.meeting-dialog__close').click()
  const sharedSingleDate = calendar.getByRole('button', {
    name: /Single-day deadline.*Single-day workshop.*2026-10-20/,
  })
  await expect(sharedSingleDate).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await sharedSingleDate.click()
  const singleDateDialog = page.getByRole('dialog')
  const singleDateSwitcher = singleDateDialog.locator('.meeting-dialog__switcher')
  await expect(singleDateSwitcher.getByRole('button')).toHaveCount(2)
  await singleDateSwitcher.getByRole('button', { name: 'Single-day workshop' }).click()
  await expect(singleDateDialog.getByRole('heading', { name: 'Workshop presentation' })).toBeVisible()
  await singleDateSwitcher.getByRole('button', { name: 'Single-day deadline' }).click()
  await expect(singleDateDialog.getByRole('heading', { name: 'Application due' })).toBeVisible()
})
