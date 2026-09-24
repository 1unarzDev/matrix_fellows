import { test, expect } from '@playwright/test'

test('dedicated join page SSR-renders the shared form and page metadata', async ({
  page,
  request,
}) => {
  const response = await request.get('/join')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('Bring your question.')
  expect(html).toContain('Student full name')
  expect(html).toContain('https://matrixfellows.com/join')
  expect(html).toContain('/og/join.png?v=join-1')

  await page.goto('/join')
  await expect(page.locator('[data-join-form-ready="true"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Bring your question/ })).toBeVisible()
  await expect(page.getByLabel('Student full name', { exact: true })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Join', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await page.getByRole('button', { name: 'Grade level: Choose your grade' }).click()
  await expect(page.getByRole('listbox', { name: 'Grade level' })).toBeVisible()
  await page.getByRole('option', { name: '10th grade', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Grade level: 10th grade' })).toBeVisible()
})

test('dedicated join page stays fluid and contained on narrow and reduced-motion layouts', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/join')
  await expect(page.locator('[data-join-form-ready="true"]')).toBeVisible()

  await expect(page.locator('.join-atmosphere__stars')).toHaveCSS('animation-name', 'none')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)

  await page.getByLabel('Student full name', { exact: true }).fill('Narrow Screen Fellow')
  await page.getByLabel('Student email', { exact: true }).fill('student@example.org')
  await page.getByRole('button', { name: 'Grade level: Choose your grade' }).click()
  await page.getByRole('option', { name: '11th grade', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What draws you in?' })).toBeVisible()

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true)
})

test('dedicated join grade options remain clickable beyond the form body', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/join')
  await expect(page.locator('[data-join-form-ready="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Grade level: Choose your grade' }).click()

  await expect(page.getByRole('listbox', { name: 'Grade level' })).toHaveClass(
    /themed-select__menu--up/,
  )
  const lastOption = page.getByRole('option', { name: 'Other / not in high school' })
  await expect(lastOption).toBeVisible()
  await expect
    .poll(() =>
      lastOption.evaluate((option) => {
        const bounds = option.getBoundingClientRect()
        const target = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        )
        return target === option || option.contains(target)
      }),
    )
    .toBe(true)

  await lastOption.click()
  await expect(
    page.getByRole('button', { name: 'Grade level: Other / not in high school' }),
  ).toBeVisible()
})
