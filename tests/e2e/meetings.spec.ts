import { expect, test } from '@playwright/test'

test('meetings route renders a crawlable confirmed and projected schedule', async ({ page }) => {
  const response = await page.goto('/meetings')
  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', { name: 'Meetings are where questions become plans.' }),
  ).toBeVisible()
  await expect(
    page.locator('#first-exchange-2026-09-25').getByRole('heading', {
      name: 'Our first exchange of ideas.',
    }),
  ).toBeVisible()
  await expect(
    page.getByText('From an ISEF interest to a regional-fair entry.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Projected · not confirmed', { exact: true })).toBeVisible()
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
