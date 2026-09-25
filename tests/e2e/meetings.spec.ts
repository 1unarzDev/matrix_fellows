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
    opportunityTitle: 'Saved Summer Institute', milestoneTitle: 'Program start',
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
            id: 'weekend-period', opportunityId: 'calendar:weekend', saved: false,
            opportunityTitle: 'Weekend research program', milestoneTitle: 'Program session', date: '2026-10-09',
            period: { id: 'weekend-period', startDate: '2026-10-09', endDate: '2026-10-12', display: 'span' },
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

  const periodStart = calendar.getByRole('button', {
    name: /Saved Summer Institute, Program starts.*2026-10-12/,
  })
  const periodMiddle = calendar.getByRole('button', {
    name: /Saved Summer Institute, Program continues.*2026-10-14/,
  })
  const periodEnd = calendar.getByRole('button', {
    name: /Saved Summer Institute, Program ends.*2026-10-16/,
  })
  await expect(periodStart).toBeVisible()
  await expect(periodMiddle).toBeVisible()
  await expect(periodEnd).toBeVisible()

  const middle = calendar.getByRole('button', { name: /Saved Summer Institute.*Saved Research Competition.*2026-10-14/ })
  await expect(middle.locator('.meeting-day__saved-signal')).toHaveCount(0)
  await expect(middle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(middle).toHaveCSS('box-shadow', 'none')
  const instituteSlider = calendar.locator('[data-period-id="institute-period"]')
  const competitionSlider = calendar.locator('[data-period-id="competition-period"]')
  await expect(instituteSlider).toHaveCount(1)
  await expect(competitionSlider).toHaveCount(1)
  await expect(instituteSlider).toHaveCSS('border-radius', /999px/)
  await expect(instituteSlider).toHaveCSS('background-image', /linear-gradient/)
  const rangeStart = periodStart
  const rangeEnd = periodEnd
  const [startBounds, endBounds, sliderBounds, competitionBounds] = await Promise.all([
    rangeStart.boundingBox(),
    rangeEnd.boundingBox(),
    instituteSlider.boundingBox(),
    competitionSlider.boundingBox(),
  ])
  expect(startBounds).not.toBeNull()
  expect(endBounds).not.toBeNull()
  expect(sliderBounds).not.toBeNull()
  expect(competitionBounds).not.toBeNull()
  expect(sliderBounds!.height / startBounds!.height).toBeGreaterThan(0.7)
  expect(sliderBounds!.x).toBeLessThan(startBounds!.x + startBounds!.width * 0.15)
  expect(sliderBounds!.x + sliderBounds!.width).toBeGreaterThan(
    endBounds!.x + endBounds!.width * 0.85,
  )
  expect(Math.abs(sliderBounds!.height - competitionBounds!.height)).toBeGreaterThanOrEqual(3)
  await expect(middle.locator('.meeting-day__number')).toHaveCSS('z-index', '3')

  const weekendSliders = calendar.locator('[data-period-id="weekend-period"]')
  await expect(weekendSliders).toHaveCount(2)
  await expect(weekendSliders.nth(0)).toHaveCSS('border-radius', /999px/)
  await expect(weekendSliders.nth(1)).toHaveCSS('border-radius', /999px/)
  await middle.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Saved on this device')
  await expect(dialog.getByRole('heading', { name: 'Program continues' })).toBeVisible()
  await expect(dialog).toContainText('Official milestone: Program start')
  const panel = dialog.locator('[data-meeting-dialog-panel]')
  const toolbar = dialog.locator('.meeting-dialog__toolbar')
  const switcher = dialog.locator('.meeting-dialog__switcher')
  const detail = dialog.locator('.calendar-detail')
  await expect(panel).toHaveCSS('border-top-width', '1px')
  await expect(panel).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(detail).toHaveCSS('border-top-width', '0px')
  await expect(detail).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(toolbar).toHaveCSS('border-bottom-width', '0px')
  await expect(toolbar.locator('.meeting-dialog__close')).toHaveCount(1)
  const officialSource = dialog.getByRole('link', { name: 'Open official source' })
  await expect(officialSource).toHaveCSS('background-image', /linear-gradient/)
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
  await panel.evaluate((element) => {
    const observer = new MutationObserver((records) => {
      if (records.some((record) =>
        (record.target as HTMLElement).classList.contains('meeting-detail-forward-leave-active'),
      )) {
        element.setAttribute('data-detail-transition-observed', 'forward')
        observer.disconnect()
      }
    })
    observer.observe(element, { subtree: true, attributes: true, attributeFilter: ['class'] })
  })
  await switcher.getByRole('button', { name: /Saved Research Competition/ }).click()
  await expect(panel).toHaveAttribute('data-detail-transition-observed', 'forward')
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
  const singleDatePanel = singleDateDialog.locator('[data-meeting-dialog-panel]')
  await singleDatePanel.evaluate((element) => {
    const observer = new MutationObserver((records) => {
      if (records.some((record) =>
        (record.target as HTMLElement).classList.contains('meeting-detail-backward-leave-active'),
      )) {
        element.setAttribute('data-detail-transition-observed', 'backward')
        observer.disconnect()
      }
    })
    observer.observe(element, { subtree: true, attributes: true, attributeFilter: ['class'] })
  })
  await singleDateSwitcher.getByRole('button', { name: 'Single-day deadline' }).click()
  await expect(singleDatePanel).toHaveAttribute('data-detail-transition-observed', 'backward')
  await expect(singleDateDialog.getByRole('heading', { name: 'Application due' })).toBeVisible()
})
