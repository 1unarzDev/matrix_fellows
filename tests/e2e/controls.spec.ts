import { test, expect } from '@playwright/test'

test('catalog uses native sorting and an accessible dismissible mobile filter sheet', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/opportunities')
  await page.locator('[data-catalog-ready="true"]').waitFor()
  const sort = page.getByLabel('Sort opportunities')
  await sort.selectOption('verified')
  await expect(page).toHaveURL(/sort=verified/)
  await page.getByRole('button', { name: /^Filters/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Filters' })
  await expect(dialog).toBeVisible()
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
