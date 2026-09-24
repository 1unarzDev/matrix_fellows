import { expect, test } from '@playwright/test'

test('meeting PIN unlock and meeting editing remain fluid and focused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const meeting = {
    id: 'isef-pathway-2026-10-09',
    title: 'From an ISEF interest to a regional-fair entry.',
    summary: 'A working session on teams and the ISEF pathway.',
    date: '2026-10-09',
    time: 'During lunch · projected',
    timezone: 'America/Chicago',
    location: 'Martin HS · room to be confirmed',
    state: 'tentative',
    topics: ['How ISEF works', 'Regional fair registration'],
    resources: [],
    url: '',
    published: true,
  }
  let unlocked = false
  let saved = structuredClone(meeting)
  await page.route('**/api/meeting-admin/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path.endsWith('/unlock')) {
      unlocked = request.postDataJSON().pin === '13572468'
      await route.fulfill(
        unlocked
          ? { json: { ok: true } }
          : { status: 401, json: { statusMessage: 'That PIN is not correct.' } },
      )
      return
    }
    if (path.endsWith('/meetings') && request.method() === 'GET') {
      await route.fulfill(
        unlocked
          ? { json: { meetings: [saved] } }
          : { status: 401, json: { statusMessage: 'Unlock meeting editing again.' } },
      )
      return
    }
    if (path.endsWith('/logout')) unlocked = false
    if (request.method() === 'PATCH') {
      saved = request.postDataJSON()
      await route.fulfill({ json: { meeting: saved } })
      return
    }
    await route.fulfill({ json: { ok: true } })
  })
  await page.route('**/api/admin', async (route) => {
    await route.fulfill({
      json: {
        site: null,
        opportunities: [],
        sources: [],
        candidates: [],
        monitors: [],
        discoveryCount: 0,
        queueHealth: [],
      },
    })
  })

  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Member admin' }).click()
  const dialog = page.getByRole('dialog', { name: 'The editing room.' })
  const pin = dialog.getByLabel('Eight-digit meeting organizer PIN')
  await expect(pin).toBeFocused()
  await pin.pressSequentially('13572468', { delay: 35 })
  await expect(dialog.getByText('Editor section')).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'The gathering schedule.' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Full editor' })).toHaveCount(0)

  await dialog.getByRole('button', { name: /From an ISEF interest/ }).click()
  await dialog.getByLabel('Date').fill('2026-10-16')
  await dialog.getByLabel('Location').fill('Martin HS · Room 186C')
  await dialog.getByRole('button', { name: /Meeting status:/ }).click()
  await dialog.getByRole('option', { name: 'Confirmed', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByText('Meeting updated.')).toBeVisible()
  expect(saved).toMatchObject({
    date: '2026-10-16',
    location: 'Martin HS · Room 186C',
    state: 'confirmed',
  })

  await expect(dialog.getByLabel('Owner email')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Lock editor' }).click()
  await expect(page.locator('[data-admin-pin]')).toBeFocused()
})

test('successful PIN entry bursts into a spring transition', async ({ page }) => {
  let unlocked = false
  await page.route('**/api/meeting-admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/unlock')) {
      unlocked = true
      await route.fulfill({ json: { ok: true } })
      return
    }
    if (path.endsWith('/meetings')) {
      await route.fulfill(
        unlocked
          ? { json: { meetings: [] } }
          : { status: 401, json: { statusMessage: 'Unlock meeting editing again.' } },
      )
      return
    }
    if (path.endsWith('/logout')) unlocked = false
    await route.fulfill({ json: { ok: true } })
  })
  await page.route('**/api/admin', async (route) => {
    await route.fulfill({
      json: {
        site: null,
        opportunities: [],
        sources: [],
        candidates: [],
        monitors: [],
        discoveryCount: 0,
        queueHealth: [],
      },
    })
  })

  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Member admin' }).click()
  const dialog = page.getByRole('dialog', { name: 'The editing room.' })
  const pin = dialog.getByLabel('Eight-digit meeting organizer PIN')
  await expect(pin).toBeFocused()
  await pin.pressSequentially('13572468', { delay: 20 })

  const success = dialog.locator('.pin-gate--success')
  await expect(success).toBeVisible()
  await expect(success.locator('.pin-particle')).toHaveCount(26)
  await expect
    .poll(() =>
      success
        .locator('.pin-particle')
        .first()
        .evaluate((element) => getComputedStyle(element).animationName),
    )
    .toContain('pin-particle-burst')
  await expect(dialog.getByText('Editor section')).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'The gathering schedule.' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Full editor' })).toHaveCount(0)

  const lock = dialog.getByRole('button', { name: 'Lock editor' })
  await lock.evaluate((element) => {
    const panel = element.closest('.admin-panel')
    if (!panel) return
    const observer = new MutationObserver(() => {
      if (!panel.classList.contains('admin-panel--locking')) return
      const shackle = element.querySelector('path')
      panel.setAttribute('data-lock-animation-observed', 'true')
      panel.setAttribute(
        'data-lock-shackle-animation',
        shackle ? getComputedStyle(shackle).animationName : '',
      )
      observer.disconnect()
    })
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] })
  })
  await lock.click()
  await expect(dialog).toHaveAttribute('data-lock-animation-observed', 'true')
  await expect(dialog).toHaveAttribute('data-lock-shackle-animation', /admin-lock-shackle/)
  await expect(page.locator('[data-admin-pin]')).toBeFocused()
})
