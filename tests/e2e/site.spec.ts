import { test, expect } from '@playwright/test'

test('direct links and reverse navigation synchronize the scene', async ({ page }, testInfo) => {
  await page.goto('/#connection')
  await expect(page.locator('canvas[data-progress]')).toHaveAttribute('data-progress', /^4\.0/, {
    timeout: 15000,
  })
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
  await expect(page.locator('canvas[data-progress]')).toHaveAttribute('data-progress', '0.000', {
    timeout: 10000,
  })
  await expect(page.locator('canvas[data-progress]')).toHaveAttribute('data-water-height', '-1.00')
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
  await expect(page.locator('#beginning [data-depth-layer]').first()).toHaveCSS('opacity', '1')
})

test('content, navigation, project expansion, and search work', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  // Navigation choreography is installed with the lazy cinematic adapter.
  // Wait for that owner rather than accidentally testing the browser's plain
  // anchor fallback while the static scene preview is still active.
  await page.locator('canvas[data-progress]').waitFor({ timeout: 15000 })
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
  // The cinematic layout intentionally frames chapter copy below/through the
  // viewport rather than pinning every section shell to y=0.
  await expect(page.getByRole('heading', { name: /Every answer/ })).toBeInViewport()
  await page.getByRole('button', { name: /^01 Robotics/ }).click()
  await expect(
    page.getByText(/How much can we learn about a robot before putting it in the water/),
  ).toBeVisible()
  await nav.getByRole('link', { name: mobile ? 'Join us' : 'Your next step', exact: true }).click()
  await expect(page).toHaveURL(/#community$/)
  await page
    .getByRole('searchbox', { name: 'Search all research opportunities' })
    .fill('machine learning')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).toHaveURL(/\/opportunities\?q=machine\+learning/)
  await expect(page.getByRole('heading', { name: 'Opportunities', exact: true })).toBeVisible()
  // Admin dialog behavior and authorization have dedicated suites; keeping
  // them out of this long journey prevents duplicated animation waits.
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
  await expect(page.locator('canvas.pointer-events-none.fixed')).toHaveCSS('opacity', '0')
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
  await expect(page.locator('canvas.pointer-events-none.fixed')).toHaveCSS('opacity', '0')
})

test('meeting summary is prominent before the journey and links to full details', async ({
  page,
}) => {
  await page.goto('/')
  const hero = page.locator('#beginning')
  await expect(hero.getByText('Meetings', { exact: true })).toBeVisible()
  await expect(hero.getByText('During lunch', { exact: false })).toBeVisible()
  await expect(hero.getByText('Martin HS · Room 186C', { exact: true })).toBeVisible()
  await hero.getByRole('link', { name: 'Meeting details' }).click()
  await expect(page).toHaveURL(/#meeting-details$/)
  await expect(page.locator('#meeting-details')).toBeInViewport({ timeout: 10000 })
})

test('explains the Matrix Fellows and Martin Research Society relationship', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#beginning')
  await expect(
    page.getByText(
      /Matrix Fellows is the student-research initiative behind the Martin High School Research Society/,
    ),
  ).toBeVisible()
})

test('footer links to the official Instagram profile', async ({ page }) => {
  await page.goto('/')
  const instagram = page.getByRole('link', {
    name: 'Matrix Fellows on Instagram, @mhs_research_society (opens in a new tab)',
  })
  await expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/mhs_research_society/')
  await expect(instagram).toHaveAttribute('target', '_blank')
  await expect(instagram).toHaveAttribute('rel', 'noopener noreferrer')
})
