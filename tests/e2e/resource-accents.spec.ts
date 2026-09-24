import { expect, test } from '@playwright/test'

const routes = [
  { path: '/guides', theme: 'astronomy' },
  { path: '/meetings', theme: 'biology' },
  { path: '/join', theme: 'mechanics' },
] as const

for (const route of routes) {
  test(`${route.path} uses its restrained ${route.theme} science accent`, async ({ page }) => {
    await page.goto(route.path)

    const accent = page.locator(`.science-accent--${route.theme}`)
    await expect(accent).toBeAttached()
    await expect(accent.locator('svg')).toHaveCount(1)
    await expect(accent).toHaveCSS('pointer-events', 'none')

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }))
    expect(layout.document).toBeLessThanOrEqual(layout.viewport)
  })
}

test('guide detail pages retain the astronomy accent', async ({ page }) => {
  await page.goto('/guides/find-a-research-idea')
  await expect(page.locator('.science-accent--astronomy')).toBeAttached()
})
