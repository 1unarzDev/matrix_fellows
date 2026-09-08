import { test, expect } from '@playwright/test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`editor opens and closes cleanly with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto('/#community')
    await expect(page.locator('[data-ready="true"]')).toBeVisible()
    const trigger = page.getByRole('button', { name: 'Member admin' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'The editing room.' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toBeFocused()
    await expect(dialog.locator('..')).toHaveCSS('opacity', '1')
    expect(await dialog.evaluate(el => el.getBoundingClientRect().width <= innerWidth)).toBe(true)
    await expect(page.locator('body')).toHaveClass(/overflow-hidden/)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(page.locator('body')).not.toHaveClass(/overflow-hidden/)
    await trigger.click()
    await expect(dialog).toBeVisible()
    await page.getByRole('button', { name: 'Close editor' }).click()
    await expect(dialog).toHaveCount(0)
  })
}
