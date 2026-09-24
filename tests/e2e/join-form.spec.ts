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
    expect(body.interests).toEqual(['Robotics & engineering', 'Other science or research area'])
    expect(body.interestOther).toBe('Neuroscience')
    expect(body.goals).toEqual([
      'Compete at ISEF or a science fair',
      'Apply to a summer research program',
    ])
    expect(body.studentId).toBe('123456')
    expect(body.parentName).toBe('Parent Fellow')
    expect(body.parentEmail).toBe('parent@example.org')
    expect(body.parentPermission).toBe(true)
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
  await page.getByLabel('Student full name', { exact: true }).fill('Test Fellow')
  await page.getByLabel('Student email', { exact: true }).fill('fellow@example.org')
  await page.getByRole('button', { name: 'Grade level: Choose your grade' }).click()
  await page.getByRole('option', { name: '11th grade', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Robotics & engineering', exact: true }).click()
  await page.getByRole('button', { name: 'Other science or research area', exact: true }).click()
  await expect(page.getByLabel('Which other area?', { exact: true })).toBeVisible()
  await page.getByLabel('Which other area?', { exact: true }).fill('Temporary value')
  await page.getByRole('button', { name: 'Other science or research area', exact: true }).click()
  await expect(page.getByLabel('Which other area?', { exact: true })).toBeHidden()
  await page.getByRole('button', { name: 'Other science or research area', exact: true }).click()
  await expect(page.getByLabel('Which other area?', { exact: true })).toHaveValue('')
  await page.getByLabel('Which other area?', { exact: true }).fill('Neuroscience')
  await page.getByRole('button', { name: 'No experience yet', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Robotics & engineering', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByLabel('Student full name', { exact: true })).toHaveValue('Test Fellow')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Compete at ISEF or a science fair', exact: true }).click()
  await page
    .getByRole('button', { name: 'Apply to a summer research program', exact: true })
    .click()
  await page.getByLabel('Anything else? · optional').fill('More hands-on workshops!')
  await expect(page.getByLabel('Anything else? · optional')).toHaveAttribute('maxlength', '1000')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await form.getByRole('button', { name: 'Join Matrix Fellows', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('student ID')
  await page.getByLabel('Student ID', { exact: true }).fill('123456')
  await page.getByLabel('Parent or guardian full name', { exact: true }).fill('Parent Fellow')
  await page.getByLabel('Parent or guardian email', { exact: true }).fill('parent@example.org')
  await form.getByRole('button', { name: 'Join Matrix Fellows', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('permission')
  await page.getByRole('checkbox', { name: /given me permission/ }).check()
  await page.getByRole('checkbox', { name: /I agree to this use/ }).check()
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
  await page.getByLabel('Student full name', { exact: true }).fill('Returning Fellow')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Open join form' }).click()
  await expect(page.getByLabel('Student full name', { exact: true })).toHaveValue(
    'Returning Fellow',
  )
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement)),
    ).toBe(true)
  }
})

test('join form stays neutral while opportunity cards retain their atmospheric surface', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#frontiers')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  const card = page.locator('.opportunity-card').first()
  await expect(card).toBeVisible()
  await page
    .locator('[data-closing-cta]')
    .getByRole('button', { name: 'Join Matrix Fellows' })
    .click()
  const panel = page.locator('.join-panel')
  await expect(panel).toBeVisible()

  const colors = await page.evaluate(() => {
    const rgba = (element: Element) => {
      const context = document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true })!
      context.fillStyle = getComputedStyle(element).backgroundColor
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data]
    }
    return {
      card: rgba(document.querySelector('.opportunity-card')!),
      panel: rgba(document.querySelector('.join-panel')!),
      backdrop: rgba(document.querySelector('.join-backdrop')!),
    }
  })
  // The chapter cards deliberately allow the cinematic atmosphere to remain
  // visible. The modal needs a denser version of the same neutral family so
  // form controls remain legible over every chapter, without the old blue cast.
  expect(colors.card[3]).toBeLessThanOrEqual(5)
  expect(colors.panel[3]).toBeGreaterThanOrEqual(200)
  expect(Math.abs(colors.panel[1]! - colors.panel[2]!)).toBeLessThanOrEqual(3)
  expect(colors.backdrop[3]).toBeLessThanOrEqual(66)
})
