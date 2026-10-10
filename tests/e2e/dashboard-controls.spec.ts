import { expect, test } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'
test.use({ video: 'on' })

test('shared filters preserve workspace mode and use clear animated checks', async ({
  page,
}, info) => {
  await setup(page)
  const queries: URL[] = []
  await page.route('**/api/opportunities**', async (route) => {
    queries.push(new URL(route.request().url()))
    await route.fallback()
  })
  await page.goto('/dashboard?section=opportunities')
  const card = page.locator('.opportunity-card').first()
  const toolbarCheck = page.getByRole('checkbox', { name: 'Saved only', exact: true })
  expect(await toolbarCheck.evaluate((el) => getComputedStyle(el).height)).toBe('22px')
  await expect(card.getByRole('button', { name: 'Details', exact: true })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Pass', exact: true })).toHaveCount(0)
  const geometry = await card.evaluate((el) => {
    const details = el.querySelector('.wb-inspect')!.getBoundingClientRect()
    const save = el.querySelector('.save-control')!.getBoundingClientRect()
    return {
      aligned: Math.abs(details.y - save.y) < 2,
      distinct: details.right < save.left,
      height: details.height,
    }
  })
  expect(geometry).toEqual({ aligned: true, distinct: true, height: 44 })
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Opportunity filters' })
  await panel.getByRole('button', { name: 'Discipline', exact: true }).click()
  const chemistry = panel.getByRole('checkbox', { name: 'Chemistry', exact: true })
  await chemistry.check()
  await expect(page).toHaveURL(/discipline=Chemistry/)
  const appearance = await chemistry.evaluate((el) => {
    const style = getComputedStyle(el)
    return {
      width: style.width,
      height: style.height,
      background: style.backgroundColor,
      transition: style.transitionDuration,
    }
  })
  expect(appearance.width).toBe('22px')
  expect(appearance.height).toBe('22px')
  expect(appearance.background).toBe('rgba(0, 0, 0, 0)')
  expect(appearance.transition).not.toBe('0s')
  await panel.getByRole('button', { name: 'Participation', exact: true }).click()
  await panel.getByRole('checkbox', { name: 'Remote program / internship', exact: true }).check()
  await expect
    .poll(() =>
      queries.some(
        (url) =>
          url.searchParams.get('mode') === 'remote-participation' &&
          url.searchParams.get('discipline') === 'Chemistry',
      ),
    )
    .toBe(true)
  await page.screenshot({
    path: `/tmp/matrix-dashboard-controls/selected-${info.project.name}.png`,
    animations: 'disabled',
  })
  await panel.getByRole('button', { name: 'Show results', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Discover', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.screenshot({
    path: `/tmp/matrix-dashboard-controls/filters-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Remove Chemistry filter' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove Chemistry filter' }).click()
  await expect(page.getByRole('button', { name: 'Remove Chemistry filter' })).toHaveCount(0)
  await page.getByRole('button', { name: /Filters/ }).click()
  await panel.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await panel.getByRole('button', { name: 'Discipline', exact: true }).click()
  await expect(chemistry).not.toBeChecked()
  await page.screenshot({
    path: `/tmp/matrix-dashboard-controls/panel-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await chemistry.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
  await page.keyboard.press('Escape')
  await page.getByRole('navigation', { name: 'Dashboard sections' }).getByRole('button', { name: 'Your profile', exact: true }).click()
  const consent = page.locator('.animated-check--outlined').first()
  await expect(consent).toBeVisible()
  await consent.locator('input').uncheck()
  await consent.locator('input').check()
  const frame = consent.locator('.animated-check__control')
  expect(await frame.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  expect(await frame.evaluate((el) => getComputedStyle(el).width)).toBe('24px')
  await page.screenshot({ path: `/tmp/matrix-dashboard-controls/profile-${info.project.name}.png`, animations: 'disabled', fullPage: true })
})
