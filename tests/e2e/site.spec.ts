import { test, expect } from '@playwright/test'

test('direct links and reverse navigation synchronize the scene', async ({ page }, testInfo) => {
  await page.goto('/#connection')
  await expect(page.locator('canvas')).toHaveAttribute('data-progress', /^4\.0/, { timeout: 15000 })
  await page.setViewportSize({ width: testInfo.project.name === 'mobile' ? 430 : 980, height: 844 })
  const glass = page.getByRole('navigation', { name: 'Mobile sections', exact: true })
  await expect(glass).toBeVisible()
  await glass.getByRole('link', { name: 'Connect', exact: true }).click()
  await expect
    .poll(async () => {
      const pill = await page.locator('[data-nav-pill]').boundingBox()
      const selected = await glass.locator('[aria-current="location"]').boundingBox()
      return pill && selected ? Math.abs(pill.x - selected.x) : Infinity
    })
    .toBeLessThan(2)
  const mobile = true
  const nav = page.getByRole('navigation', {
    name: mobile ? 'Mobile sections' : 'Journey sections',
    exact: true,
  })
  await nav.getByRole('link', { name: mobile ? 'Begin' : 'The question', exact: true }).click()
  await expect(page.locator('canvas')).toHaveAttribute('data-progress', '0.000', { timeout: 10000 })
  await expect(page.locator('canvas')).toHaveAttribute('data-water-height', '-1.00')
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
  await expect(page.locator('#beginning [data-depth-layer]').first()).toHaveCSS('opacity', '1')
})

test('content, navigation, project expansion, search, and editor work', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Beyond what')
  const mobile = testInfo.project.name === 'mobile'
  const nav = page.getByRole('navigation', {
    name: mobile ? 'Mobile sections' : 'Journey sections',
    exact: true,
  })
  await nav.getByRole('link', { name: mobile ? 'Research' : 'Our research', exact: true }).click()
  await expect(page).toHaveURL(/#research$/)
  await expect(nav.locator('[aria-current="location"]')).toHaveAttribute('href', '#research', {
    timeout: 8000,
  })
  await expect
    .poll(() =>
      page.locator('#research').evaluate((el) => Math.abs(el.getBoundingClientRect().top)),
    )
    .toBeLessThan(2)
  await page.getByRole('button', { name: /A question worth pursuing/ }).click()
  await expect(
    page.getByText(
      'Project title, research question, methods, contributors, and findings will be shared here.',
    ),
  ).toBeVisible()
  await nav.getByRole('link', { name: mobile ? 'Join us' : 'Your next step', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Come curious.' })).toBeInViewport()
  await page.getByRole('searchbox').fill('machine learning')
  await expect(page.getByRole('heading', { name: 'NeurIPS workshops' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Regeneron ISEF', exact: true })).toHaveCount(0)
  await page.getByRole('searchbox').fill('no matching item')
  await expect(
    page.getByText('No matching opportunities right now.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('heading', { name: 'Regeneron ISEF', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Member admin' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('A home for your updates.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(errors).toEqual([])
})

test('reduced motion keeps all content available without initializing WebGL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#connection')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: /One curious mind/ })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCSS('opacity', '0')
  await page.keyboard.press('Control+Shift+E')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
})

test('WebGL failure preserves the HTML and section navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null
      return original.apply(this, [type, ...args] as never)
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Find your people', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Come curious.' })).toBeInViewport()
  await expect(page.locator('canvas')).toHaveCSS('opacity', '0')
})
