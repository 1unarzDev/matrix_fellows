import { expect, test } from '@playwright/test'

test('roomier chips wrap without clipping on narrow screens', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/opportunities?kind=Internship&discipline=Environmental%20science&funding=aid&free=true', { waitUntil: 'networkidle' })
  const chips = page.getByLabel('Active opportunity filters')
  await expect(chips.getByRole('button')).toHaveCount(4)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  for (const chip of await chips.getByRole('button').all()) {
    expect(await chip.evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true)
  }
  await chips.screenshot({ path: `test-results/premium-filter-chips-${testInfo.project.name}.png` })
})

test('filter choices produce removable animated chips without duplicate category navigation', async ({ page, isMobile }) => {
  await page.goto('/opportunities', { waitUntil: 'networkidle' })
  const chips = page.getByLabel('Active opportunity filters')
  await expect(chips.getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Opportunity collections' })).toHaveCount(0)
  if (isMobile) await page.getByRole('button', { name: 'Filters', exact: true }).click()
  const controls = isMobile ? page.getByRole('dialog', { name: 'Filters' }) : page.getByRole('complementary', { name: 'Opportunity filters' })
  await controls.getByRole('button', { name: /^Type/ }).click()
  await controls.getByRole('checkbox', { name: /^Internship/ }).check()
  if (isMobile) await controls.getByRole('button', { name: /Show .*matches|Apply/ }).click()
  const chip = chips.getByRole('button', { name: 'Remove Internship filter' })
  await expect(chip).toBeVisible()
  await expect(page).toHaveURL(/kind=Internship/)
  await chip.click()
  await expect(chip).toHaveCount(0)
  await expect(page).not.toHaveURL(/kind=/)
  await expect(page.getByRole('searchbox', { name: 'Search opportunities' })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('removing one chip preserves other filters and the search and supports keyboard/reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/opportunities?kind=Internship&discipline=Biology&q=research&sort=actionable&page=2', { waitUntil: 'networkidle' })
  const chip = page.getByRole('button', { name: 'Remove Internship filter' })
  await chip.focus()
  await page.keyboard.press('Enter')
  await expect(chip).toHaveCount(0)
  const url = new URL(page.url())
  expect(url.searchParams.get('discipline')).toBe('Biology')
  expect(url.searchParams.get('q')).toBe('research')
  expect(url.searchParams.get('sort')).toBe('actionable')
  expect(url.searchParams.has('page')).toBe(false)
  await expect(page.getByRole('button', { name: 'Remove Biology filter' })).toBeFocused()
})
