import { expect, test } from '@playwright/test'
import { setup, dueDate } from '../fixtures/dashboard-browser'

test('populated canonical agenda stays usable at narrow widths and 200 percent CSS zoom', async ({
  page,
}, info) => {
  const state = await setup(page)
  state.plan.tasks = Array.from({ length: 60 }, (_, index) => ({
    id: `88888888-8888-4888-8888-${String(index).padStart(12, '0')}`,
    title: `Synthetic chemistry preparation ${index + 1}: review calibration, evidence, and a long collaborator name`,
    notes: 'Synthetic dense-data scenario; not a live commitment.',
    pursuitId: null,
    activityId: null,
    status: 'todo',
    dueDate,
    scheduledStart: null,
    scheduledEnd: null,
    estimatedHours: index % 4 ? 1 : null,
    dependsOn: [],
    version: 1,
    createdAt: '2026-10-07T12:00:00Z',
    updatedAt: '2026-10-07T12:00:00Z',
  }))
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/dashboard?section=opportunities')
  await page.getByRole('button', { name: 'My plan', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /^Synthetic chemistry preparation 60:/ }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
  await page.screenshot({
    path: `/tmp/matrix-dashboard-evidence/agenda-320-${info.project.name}.png`,
    fullPage: true,
  })
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  await page.getByRole('button', { name: /^Synthetic chemistry preparation 1:/ }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByLabel('Task name', { exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
  await info.attach('scenario', {
    body: '60 synthetic tasks; 320 CSS px, then CSS zoom 2 at 1440px. CSS zoom is not a physical browser/device measurement.',
    contentType: 'text/plain',
  })
})
