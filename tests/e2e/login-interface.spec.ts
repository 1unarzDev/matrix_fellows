import { expect, test, type Page } from '@playwright/test'

async function mockAccess(
  page: Page,
  options: { configured?: boolean; providers?: boolean; failLogin?: boolean } = {},
) {
  const requests: { path: string; body: any }[] = []
  await page.route('**/api/workspace/auth/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/session'))
      return route.fulfill({
        json: { configured: options.configured !== false, authenticated: false },
      })
    if (path.endsWith('/providers'))
      return route.fulfill({
        json: { google: options.providers !== false, azure: options.providers !== false },
      })
    const body = route.request().postDataJSON()
    requests.push({ path, body })
    if (path.endsWith('/login'))
      return route.fulfill(
        options.failLogin
          ? { status: 429, json: { statusMessage: 'Please wait before requesting another code.' } }
          : { json: body.provider === 'email' ? { sent: true } : {} },
      )
    if (path.endsWith('/callback'))
      return route.fulfill({
        status: 400,
        json: { statusMessage: 'That code has expired. Request a new code.' },
      })
    return route.fulfill({ status: 404, json: {} })
  })
  return requests
}

test('unified member access supports keyboard email, code errors and changing address', async ({
  page,
}) => {
  const requests = await mockAccess(page)
  await page.goto('/login')
  const email = page.getByLabel('Account email', { exact: true })
  await expect(email).toBeVisible()
  if (await page.evaluate(() => matchMedia('(pointer: fine)').matches))
    await expect(email).toBeFocused()
  await expect(page.getByRole('button', { name: 'Continue with email', exact: true })).toBeVisible()
  await expect(page.getByText('Sign in or create your account.', { exact: true })).toBeVisible()
  await email.fill('researcher@example.org')
  await email.press('Enter')
  const code = page.getByLabel('Email verification code', { exact: true })
  await expect(code).toBeVisible()
  await expect(code).toBeFocused()
  await expect(email).toHaveCount(0)
  expect(requests[0]).toEqual({
    path: '/api/workspace/auth/login',
    body: { provider: 'email', email: 'researcher@example.org' },
  })
  await expect(page.getByRole('button', { name: 'Verify code', exact: true })).toBeDisabled()
  await code.fill('123456')
  await code.press('Enter')
  await expect(page.getByRole('alert')).toContainText('That code has expired.')
  expect(requests[1]).toEqual({
    path: '/api/workspace/auth/callback',
    body: { email: 'researcher@example.org', token: '123456' },
  })
  await page.getByRole('button', { name: 'Use another email', exact: true }).click()
  await expect(email).toBeVisible()
  await expect(email).toBeFocused()
  await expect(email).toHaveValue('researcher@example.org')
  await expect(code).toHaveCount(0)
})

test('configured provider buttons send the selected provider and failed email remains editable', async ({
  page,
}) => {
  const requests = await mockAccess(page, { failLogin: true })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Please wait')
  await page.getByRole('button', { name: 'Continue with Microsoft', exact: true }).click()
  const email = page.getByLabel('Account email', { exact: true })
  await email.fill('researcher@example.org')
  await email.press('Enter')
  await expect(page.getByRole('alert')).toContainText('Please wait')
  await expect(email).toBeEnabled()
  expect(requests.map((request) => request.body.provider)).toEqual(['google', 'azure', 'email'])
})

test('email-only access labels unavailable providers and fits narrow screens at both stages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await mockAccess(page, { providers: false })
  await page.goto('/login')
  const email = page.getByLabel('Account email', { exact: true })
  await expect(email).toBeVisible()
  for (const provider of ['Google', 'Microsoft']) {
    const button = page.getByRole('button', { name: `Continue with ${provider}`, exact: true })
    await expect(button).toBeDisabled()
    await expect(button).toContainText('Not configured')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
  await email.fill('researcher@example.org')
  await email.press('Enter')
  const code = page.getByLabel('Email verification code', { exact: true })
  await expect(code).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
  const bounds = await code.boundingBox()
  expect(bounds?.x).toBeGreaterThanOrEqual(0)
  expect((bounds?.x || 0) + (bounds?.width || 0)).toBeLessThanOrEqual(360)
})

test('password and passkey previews are honest and never submit credentials', async ({ page }) => {
  const requests = await mockAccess(page, { providers: false })
  await page.goto('/login')
  const email = page.getByLabel('Account email', { exact: true })
  await email.fill('researcher@example.org')
  await page.getByRole('button', { name: 'Password Soon', exact: true }).click()
  const password = page.getByLabel('Password', { exact: true })
  await expect(password).toBeVisible()
  await expect(password).toBeDisabled()
  await expect(page.getByRole('button', { name: /Sign in with password/ })).toBeDisabled()
  await expect(
    page.getByText('Coming soon. Use an email link instead.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /Sign in with a passkey/ })).toBeDisabled()
  await email.press('Enter')
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: 'Email link', exact: true }).click()
  await expect(password).toHaveCount(0)
  await expect(email).toHaveValue('researcher@example.org')
  await email.press('Enter')
  await expect(page.getByLabel('Email verification code', { exact: true })).toBeVisible()
  expect(requests).toEqual([
    {
      path: '/api/workspace/auth/login',
      body: { provider: 'email', email: 'researcher@example.org' },
    },
  ])
})

test('pending email request prevents duplicate submission and keeps controls coherent', async ({
  page,
}) => {
  await mockAccess(page)
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  let count = 0
  await page.route('**/api/workspace/auth/login', async (route) => {
    count++
    await pending
    await route.fulfill({ json: { sent: true } })
  })
  await page.goto('/login')
  const email = page.getByLabel('Account email', { exact: true })
  await email.fill('researcher@example.org')
  await email.press('Enter')
  await expect(email).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Continue with Google', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Continue with Microsoft', exact: true }),
  ).toBeDisabled()
  expect(count).toBe(1)
  release()
  await expect(page.getByLabel('Email verification code', { exact: true })).toBeVisible()
})

test('reduced motion preserves email and code state transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockAccess(page)
  await page.goto('/login')
  await page.getByLabel('Account email', { exact: true }).fill('researcher@example.org')
  await page.getByLabel('Account email', { exact: true }).press('Enter')
  await expect(page.getByLabel('Email verification code', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Use another email', exact: true }).click()
  await expect(page.getByLabel('Account email', { exact: true })).toBeVisible()
})

test('reduced-motion access stays functional without configured authentication', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockAccess(page, { configured: false })
  await page.goto('/login')
  await expect(page.getByText(/Sign-in is temporarily unavailable/)).toBeVisible()
  await expect(page.getByLabel('Account email', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Back to/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
})
