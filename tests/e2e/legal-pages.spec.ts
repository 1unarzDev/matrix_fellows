import { expect, test, type Locator } from '@playwright/test'

for (const [path, title] of [
  ['/privacy', 'Privacy policy'],
  ['/terms', 'Terms of service'],
]) {
  test(`${title} is public, readable, linked and accessible`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const response = await page.goto(path!)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['x-robots-tag'] || '').not.toContain('noindex')
    await expect(page.getByRole('heading', { name: title!, exact: true, level: 1 })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://matrixfellows.com${path}`,
    )
    await expect(page.locator('.access-cosmos')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Skip to policy', exact: true })).toHaveAttribute(
      'href',
      '#workspace-main',
    )
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to policy', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#workspace-main')).toBeFocused()
    await page.evaluate(() => window.scrollTo(0, 0))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    await page.screenshot({
      path: `/tmp/matrix-legal-evidence/${path!.slice(1)}-${info.project.name}-top.png`,
    })
    const narrow = await page.evaluate(() => innerWidth <= 760)
    if (narrow) await page.locator('.legal-mobile-index summary').click()
    const lastLink = page
      .getByRole('navigation', { name: narrow ? 'Policy sections' : 'On this page' })
      .getByRole('link')
      .last()
    await lastLink.click()
    await expect(page.locator('.legal-section').last()).toBeInViewport()
    await page.screenshot({
      path: `/tmp/matrix-legal-evidence/${path!.slice(1)}-${info.project.name}-end.png`,
    })
    const ownLink = page
      .getByRole('navigation', { name: 'Account policies' })
      .getByRole('link', { name: path === '/privacy' ? 'Privacy' : 'Terms', exact: true })
    await expect(ownLink).toHaveAttribute('aria-current', 'page')
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2'
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
  })
}

test('legal section links preserve the hash and use smooth scrolling', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (options) {
      document.documentElement.dataset.legalScrollBehavior =
        typeof options === 'object' && options ? options.behavior || '' : ''
      return original.call(this, options)
    }
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/terms')

  const desktopIndex = page.locator('.legal-desktop-index')
  let firstSectionLink: Locator
  if (await desktopIndex.isVisible()) {
    firstSectionLink = desktopIndex.getByRole('link').first()
  } else {
    await page.locator('.legal-mobile-index summary').click()
    firstSectionLink = page
      .getByRole('navigation', { name: 'Policy sections' })
      .getByRole('link')
      .first()
  }
  const href = await firstSectionLink.getAttribute('href')
  await firstSectionLink.click()

  await expect(page).toHaveURL(new RegExp(`/terms/?${href?.replace('#', '\\#')}$`))
  await expect(page.locator('html')).toHaveAttribute('data-legal-scroll-behavior', 'smooth')
  await expect(page.locator('.legal-document')).toHaveCSS('backdrop-filter', /blur/)
})

test('login exposes both policies and sitemap includes them without private dashboard', async ({
  page,
  request,
}) => {
  await page.route('**/api/workspace/auth/session', (route) =>
    route.fulfill({ json: { configured: false, authenticated: false } }),
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/login')
  await expect(page.getByRole('link', { name: 'Privacy policy', exact: true })).toHaveAttribute(
    'href',
    '/privacy',
  )
  await expect(page.getByRole('link', { name: 'Terms of service', exact: true })).toHaveAttribute(
    'href',
    '/terms',
  )
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  const xml = await sitemap.text()
  expect(xml).toContain('<loc>https://matrixfellows.com/privacy</loc>')
  expect(xml).toContain('<loc>https://matrixfellows.com/terms</loc>')
  expect(xml).not.toContain('<loc>https://matrixfellows.com/dashboard</loc>')
  await page.goto('/')
  const footer = page.locator('footer')
  await expect(
    footer.getByRole('link', { name: 'Dashboard', exact: true }).locator('svg'),
  ).toHaveAttribute('aria-hidden', 'true')
  await expect(footer.getByRole('link', { name: /Privacy|Terms/ })).toHaveCount(0)
})
