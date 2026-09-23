import { test, expect } from '@playwright/test'

test('catalog uses custom sorting and an accessible animated mobile filter sheet', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/opportunities')
  await page.locator('[data-catalog-ready="true"]').waitFor()
  await expect(page.getByText('High-school policy', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'High-school routes' })).toHaveCount(0)
  await expect(page.getByLabel('Discovery shortcuts')).toHaveCount(0)
  const sort = page.getByRole('button', { name: 'Sort opportunities: Relevance' })
  await sort.click()
  await expect(page.getByRole('listbox', { name: 'Sort opportunities' })).toBeVisible()
  await expect(page.getByRole('option', { name: /Recently verified/ })).toHaveCount(0)
  await page.getByRole('option', { name: /Open & actionable/ }).click()
  await expect(page).toHaveURL(/sort=actionable/)
  await expect(
    page.getByRole('button', { name: 'Sort opportunities: Open & actionable' }),
  ).toBeFocused()
  await page.getByRole('button', { name: /^Filters/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Filters' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveClass(/filter-dialog--visible/)
  const discipline = dialog.getByRole('button', { name: 'Discipline' })
  await expect(discipline).toHaveAttribute('aria-expanded', 'false')
  await discipline.click()
  await expect(dialog.getByText('Robotics', { exact: true })).toBeVisible()
  const type = dialog.getByRole('button', { name: 'Type' })
  await expect(type).toHaveAttribute('aria-expanded', 'false')
  await type.click()
  await expect(type).toHaveAttribute('aria-expanded', 'true')
  await expect(dialog.getByText('Workshop', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('guides and opportunities share the resource library header', async ({ page }) => {
  await page.goto('/guides')
  const navigation = page.getByRole('navigation', { name: 'Resource library' })
  await expect(navigation.getByRole('link', { name: 'Guides' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await navigation.getByRole('link', { name: 'Opportunities' }).click()
  await expect(page).toHaveURL('/opportunities')
  await expect(navigation.getByRole('link', { name: 'Opportunities' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('catalog replaces legacy hidden filters and obsolete sorting', async ({ page }) => {
  await page.goto('/opportunities?highSchool=supported&sort=verified')
  await page.locator('[data-catalog-ready="true"]').waitFor()
  await expect(page).toHaveURL(/sort=actionable/)
  await expect(page).not.toHaveURL(/highSchool/)
})

test('project panels animate and closed content cannot receive focus', async ({ page }) => {
  await page.goto('/#research')
  await page.locator('[data-ready="true"]').waitFor()
  const toggle = page.locator('#research button[aria-controls]').first()
  const panel = page.locator(`#${await toggle.getAttribute('aria-controls')}`)
  await expect(panel).toHaveAttribute('inert', '')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(panel).not.toHaveAttribute('inert', '')
  await expect(panel).toHaveCSS('opacity', '1')
  await toggle.click()
  await expect(panel).toHaveAttribute('inert', '')
  await expect(panel).toHaveCSS('opacity', '0')
})
