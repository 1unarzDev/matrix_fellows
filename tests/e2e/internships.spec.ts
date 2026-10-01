import { expect, test } from '@playwright/test'
import { internshipAdditions } from '../../shared/data/internship-additions'

test('internship detail renders useful logistics, materials and sources without overflow', async ({
  page,
}, testInfo) => {
  await page.goto('/opportunities/stripe-high-school-software-2027', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Your internship plan' })).toBeVisible()
  await expect(page.getByText('Texas access has conditions')).toBeVisible()
  await expect(page.getByText(/One or two strongest work examples/)).toBeVisible()
  await expect(page.getByText(/\$60\/hour/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
  await page.locator('.internship-information').scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `test-results/internships-${testInfo.project.name}.png`,
    fullPage: true,
  })
  const disclosure = page.getByRole('button', { name: 'Application materials' })
  await disclosure.click()
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false')
  await disclosure.click()
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('link', { name: 'Opportunities', exact: true }).first().click()
  await page.goto('/opportunities?kind=Internship', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/kind=Internship/)
  await expect(page.getByRole('button', { name: 'Remove Internship filter' })).toBeVisible()
})

test('internship useful text is server rendered without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/opportunities/utsw-stars-summer-research-2027')
  await expect(page.getByRole('heading', { name: 'Your internship plan' })).toBeVisible()
  await expect(
    page.getByText(/Students with prior research experience are not eligible/),
  ).toBeVisible()
  await context.close()
})

test('PIN-protected editor preserves internship fields and typed checkpoints on save', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let item = structuredClone(internshipAdditions[2]!)
  let posted: any
  let unlocked = false
  await page.route('**/api/meeting-admin/**', (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/unlock')) unlocked = true
    return route.fulfill(
      unlocked
        ? { json: { ok: true, meetings: [], selections: [], opportunities: [] } }
        : { status: 401, json: { statusMessage: 'Unlock editing.' } },
    )
  })
  await page.route('**/api/admin', async (route) => {
    if (route.request().method() === 'POST') {
      posted = route.request().postDataJSON()
      item = posted.item
      await route.fulfill({ json: { ok: true } })
    } else
      await route.fulfill(
        unlocked
          ? {
              json: {
                site: null,
                opportunities: [{ id: item.id, data: item, published: true, suppressed: false }],
                sources: [],
                candidates: [],
                monitors: [],
                discoveryCount: 0,
                queueHealth: [],
              },
            }
          : { status: 401, json: { statusMessage: 'Unlock editing.' } },
      )
  })
  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Member admin' }).click()
  const dialog = page.getByRole('dialog', { name: 'The editing room.' })
  await dialog.getByLabel('Eight-digit meeting organizer PIN').fill('13572468')
  await dialog.getByRole('button', { name: /Editor section/ }).click()
  await dialog.getByRole('option', { name: 'Listings', exact: true }).click()
  await dialog.getByRole('button', { name: /Houston Methodist High School/ }).click()
  await dialog
    .getByLabel('Duration', { exact: true })
    .fill('Twelve continuous weeks; confirmed with employer.')
  await dialog.getByRole('button', { name: 'Save listing' }).click()
  await expect(dialog.getByText('Listing saved.')).toBeVisible()
  expect(posted.item.internship.duration).toBe('Twelve continuous weeks; confirmed with employer.')
  expect(posted.item.internship.applicationMaterials).toEqual(
    internshipAdditions[2]!.internship!.applicationMaterials,
  )
  expect(posted.item.milestones).toEqual(internshipAdditions[2]!.milestones)
  expect(
    posted.item.fieldEvidence.some((entry: any) => entry.field === 'internship.duration'),
  ).toBe(false)
})
