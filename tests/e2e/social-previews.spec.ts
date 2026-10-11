import { expect, test } from '@playwright/test'

test('key routes expose branded social previews', async ({ page }) => {
  const routes = [
    { path: '/', image: '/social-card.png?v=horizon-3' },
    { path: '/opportunities', image: '/og/opportunities.png?v=opportunities-1' },
    { path: '/login', image: '/og/login.png?v=login-1' },
    { path: '/dashboard', image: '/og/dashboard.png?v=dashboard-1' },
  ]

  for (const route of routes) {
    await page.goto(route.path)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      new RegExp(route.image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'),
    )
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630')
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    )
  }
})
