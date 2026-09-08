import { test, expect } from '@playwright/test'

test('join flow validates, preserves answers, retries safely and confirms receipt', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let calls = 0
  let firstId = ''
  await page.route('**/api/join', async (route) => {
    const body = route.request().postDataJSON()
    expect(body.consent).toBe(true)
    expect(body.note).toBe('More hands-on workshops!')
    expect(body.interests).toEqual(['Robotics & engineering'])
    expect(body.goals).toEqual(['Find research partners'])
    if (!firstId) firstId = body.requestId
    else expect(body.requestId).toBe(firstId)
    calls++
    await route.fulfill({
      status: calls === 1 ? 503 : 200,
      json: calls === 1 ? { statusMessage: 'Please try again.' } : { ok: true },
    })
  })
  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Open join form' }).click()
  const form = page.getByRole('dialog')
  await expect(form).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('name')
  await page.getByLabel('Your name', { exact: true }).fill('Test Fellow')
  await page.getByLabel('Email', { exact: true }).fill('fellow@example.org')
  await page.getByRole('button', { name: 'Grade level: Choose your grade' }).click()
  await page.getByRole('option', { name: '11th grade', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Robotics & engineering', exact: true }).click()
  await page.getByRole('button', { name: 'No experience yet', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Robotics & engineering', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Test Fellow')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Find research partners', exact: true }).click()
  await page.getByLabel('Anything else? · optional').fill('More hands-on workshops!')
  await expect(page.getByLabel('Anything else? · optional')).toHaveAttribute('maxlength', '1000')
  await form.getByRole('button', { name: 'Join Matrix Fellows', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('agree')
  await page.getByRole('checkbox').check()
  await form.getByRole('button', { name: 'Join Matrix Fellows', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('try again')
  await form.getByRole('button', { name: 'Join Matrix Fellows', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'You’re part of the possibility.' })).toBeVisible()
  expect(calls).toBe(2)
  expect(await form.evaluate((el) => el.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Back to exploring' }).click()
  await expect(form).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open join form' })).toBeFocused()
})

test('join form animates in, traps keyboard focus and retains an unfinished draft', async ({
  page,
}) => {
  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Open join form' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(':scope > div')).toHaveCSS('opacity', '1')
  await page.getByLabel('Your name', { exact: true }).fill('Returning Fellow')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Open join form' }).click()
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Returning Fellow')
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.screenshot({ path: `test-results/join-form-${test.info().project.name}.png` })
})
