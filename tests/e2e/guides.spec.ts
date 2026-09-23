import { expect, test } from '@playwright/test'

test('guide library and guide content are crawlable, readable, and route correctly', async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  const response = await request.get('/guides/find-a-research-idea')
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('“Find your passion” is not a research method.')

  await page.goto('/guides')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Research becomes real')
  await expect(page.locator('main a[href^="/guides/"]')).toHaveCount(11)
  await page.getByRole('link', { name: /Find an idea worth pursuing/ }).click()
  await expect(page).toHaveURL(/\/guides\/find-a-research-idea$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find an idea worth pursuing')
  await expect(
    page.getByRole('heading', { name: 'Generate ideas through five doors' }),
  ).toBeVisible()
  await expect(page.getByText('A practical cutoff')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Go deeper' })).toBeVisible()
  const externalResources = page.locator('.guide-resources a[target="_blank"]')
  await expect(externalResources).toHaveCount(2)
  await expect(externalResources.first()).toHaveAttribute('rel', 'noopener noreferrer')
  expect(
    await page
      .locator('article ul')
      .first()
      .evaluate((list) => getComputedStyle(list).listStyleType),
  ).toBe('disc')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )

  await page.goto('/guides/read-a-research-paper')
  expect(
    await page
      .locator('article ol')
      .first()
      .evaluate((list) => getComputedStyle(list).listStyleType),
  ).toBe('decimal')
  expect(errors).toEqual([])
})

test('poster guide renders original instructional figures and keeps navigation usable', async ({
  page,
}, testInfo) => {
  await page.goto('/guides/build-a-science-fair-poster')
  await expect(page.locator('article figure')).toHaveCount(5)
  await expect(page.getByText('Annotated poster anatomy')).toBeVisible()
  await expect(page.getByRole('link', { name: 'All guides' })).toBeVisible()
  const onThisPage = page.getByRole('navigation', { name: 'On this page' })
  if (testInfo.project.name === 'mobile') await expect(onThisPage).toBeHidden()
  else await expect(onThisPage).toBeVisible()
})

test('guide section navigation is smooth, shareable, and synchronized with reading position', async ({
  page,
}, testInfo) => {
  await page.goto('/guides')
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'smooth',
  )
  const stages = page.getByRole('navigation', { name: 'Guide stages' })
  await expect(stages.getByRole('link', { name: /Start/ })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await stages.getByRole('link', { name: /Analyze/ }).click()
  await expect(page).toHaveURL(/#analyze$/)
  await expect(stages.getByRole('link', { name: /Analyze/ })).toHaveAttribute(
    'aria-current',
    'location',
  )
  await expect(page.getByRole('heading', { name: 'Analyze', exact: true })).toBeInViewport()

  if (testInfo.project.name === 'mobile') return
  await page.goto('/guides/find-a-research-idea')
  const contents = page.getByRole('navigation', { name: 'On this page' })
  await expect(contents.getByRole('link').first()).toHaveAttribute('aria-current', 'location')
  const target = contents.getByRole('link', { name: 'Score candidates before falling in love' })
  await target.click()
  await expect(page).toHaveURL(/#score-candidates-before-falling-in-love$/)
  await expect(target).toHaveAttribute('aria-current', 'location', { timeout: 3000 })
  await expect(
    page.getByRole('heading', { name: 'Score candidates before falling in love' }),
  ).toBeInViewport()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  )
})

test('unknown guide slugs return a real 404', async ({ request }) => {
  const response = await request.get('/guides/not-a-real-guide')
  expect(response.status()).toBe(404)
})
