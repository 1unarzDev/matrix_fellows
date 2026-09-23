import { test, expect } from '@playwright/test'

test('catalog uses custom sorting and an accessible animated mobile filter sheet', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/opportunities')
  await page.locator('[data-catalog-ready="true"]').waitFor()
  const sort = page.getByRole('button', { name: 'Sort opportunities: Relevance' })
  await sort.click()
  await expect(page.getByRole('listbox', { name: 'Sort opportunities' })).toBeVisible()
  await page.getByRole('option', { name: /Recently verified/ }).click()
  await expect(page).toHaveURL(/sort=verified/)
  await expect(
    page.getByRole('button', { name: 'Sort opportunities: Recently verified' }),
  ).toBeFocused()
  await page.getByRole('button', { name: /^Filters/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Filters' })
  await expect(dialog).toBeVisible()
  const type = dialog.getByRole('button', { name: 'Type' })
  await expect(type).toHaveAttribute('aria-expanded', 'false')
  await type.click()
  await expect(type).toHaveAttribute('aria-expanded', 'true')
  await expect(dialog.getByText('Workshop', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
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
