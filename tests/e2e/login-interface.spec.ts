import { expect, test, type Page } from '@playwright/test'

async function settlePanel(page: Page) {
  await expect(
    page.locator(
      '.auth-state-enter-active, .auth-state-leave-active, .auth-method-enter-active, .auth-method-leave-active',
    ),
  ).toHaveCount(0)
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target
          return (
            target instanceof Element &&
            target.closest('.login-panel') &&
            animation.effect?.getTiming().iterations !== Infinity
          )
        })
        .map((animation) => animation.finished.catch(() => undefined)),
    )
  })
}

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

test('account creation unfolds continuously, reverses cleanly, and keeps hidden fields out of sign-in', async ({
  page,
}, info) => {
  const requests = await mockAccess(page)
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Password', exact: true }).click()
  await settlePanel(page)
  const email = page.getByLabel('Account email', { exact: true })
  await email.fill('researcher@example.org')
  const confirmation = page.locator('.login-confirmation')
  await expect(confirmation).toHaveAttribute('inert', '')
  const heights = await page
    .getByRole('button', { name: 'Create an account', exact: true })
    .evaluate(async (button) => {
      // Start sampling in the same browser task as the click, not after a
      // round-trip that can miss the beginning of the mobile transition.
      ;(button as HTMLButtonElement).click()
      const element = document.querySelector('.login-confirmation')!
      const samples: number[] = []
      for (let i = 0; i < 28; i++)
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => {
            samples.push(element.getBoundingClientRect().height)
            resolve()
          }),
        )
      return samples
    })
  expect(
    heights.filter((height) => height > 2 && height < heights.at(-1)! - 2).length,
  ).toBeGreaterThan(2)
  await expect(page.getByLabel('Confirm password', { exact: true })).toBeEnabled()
  await expect(email).toHaveValue('researcher@example.org')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
  await page.screenshot({
    path: `/tmp/matrix-account-motion/signup-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Create an account', exact: true })).toBeVisible()
  await expect(page.getByLabel('Confirm password', { exact: true })).toBeDisabled()
  // Reversing while the layout is still collapsing must remain interactive.
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click()
  await settlePanel(page)
  await expect(confirmation).toHaveAttribute('aria-hidden', 'true')
  expect(
    await confirmation.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThan(1)
  await page.screenshot({
    path: `/tmp/matrix-account-motion/signin-${info.project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
  expect(requests).toEqual([])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
  await expect(page.getByLabel('Confirm password', { exact: true })).toBeEnabled()
  await expect(email).toHaveValue('researcher@example.org')
})

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

test('password sign-in, signup and recovery preserve email and show accurate outcomes', async ({
  page,
}, info) => {
  const requests = await mockAccess(page, { providers: false })
  await page.route('**/api/workspace/auth/password', async (route) => {
    const body = route.request().postDataJSON()
    requests.push({ path: '/api/workspace/auth/password', body })
    await route.fulfill(
      body.action === 'signin'
        ? { status: 400, json: { statusMessage: 'Check your sign-in details.' } }
        : { json: { sent: true } },
    )
  })
  await page.goto('/login')
  const email = page.getByLabel('Account email', { exact: true })
  await email.fill('researcher@example.org')
  await page.getByRole('button', { name: 'Password', exact: true }).click()
  const password = page.getByLabel('Password', { exact: true })
  await expect(password).toBeVisible()
  await settlePanel(page)
  await page.screenshot({
    path: `/tmp/matrix-password-login-${info.project.name}.png`,
    fullPage: true,
  })
  await expect(password).toBeEnabled()
  await password.fill('my-current-password')
  await password.press('Enter')
  await expect(page.getByRole('alert')).toContainText('Check your sign-in details.')
  await expect(page.getByRole('button', { name: /Sign in with a passkey/ })).toBeDisabled()
  expect(requests[0]?.body).toEqual({
    action: 'signin',
    email: 'researcher@example.org',
    password: 'my-current-password',
  })
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
  await password.fill('new-strong-password')
  await page.getByLabel('Confirm password', { exact: true }).fill('not-the-same-password')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('do not match')
  expect(requests).toHaveLength(1)
  await page.getByLabel('Confirm password', { exact: true }).fill('new-strong-password')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('confirm your account')
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click()
  await page.getByRole('button', { name: 'Forgot password?', exact: true }).click()
  await page.getByRole('button', { name: 'Send reset link', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('If this email has an account')
  await page.getByRole('button', { name: 'Email link', exact: true }).click()
  await expect(password).toHaveCount(0)
  await expect(email).toHaveValue('researcher@example.org')
  await email.press('Enter')
  await expect(page.getByLabel('Email verification code', { exact: true })).toBeVisible()
  expect(requests.at(-1)).toEqual({
    path: '/api/workspace/auth/login',
    body: { provider: 'email', email: 'researcher@example.org' },
  })
})

test('recovery opens a focused reset form and returns to password sign-in', async ({
  page,
}, info) => {
  await mockAccess(page)
  await page.route('**/api/workspace/auth/security?recovery=1', (route) =>
    route.fulfill({ json: { recovery: true } }),
  )
  await page.route('**/api/workspace/auth/password', (route) =>
    route.fulfill({ json: { ok: true, signInRequired: true } }),
  )
  await page.goto('/login?recovery=1')
  await expect(page.getByLabel('Account email', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0)
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible()
  await settlePanel(page)
  await page.screenshot({
    path: `/tmp/matrix-password-reset-${info.project.name}.png`,
    fullPage: true,
  })
  await page.getByLabel('New password', { exact: true }).fill('my-new-password')
  await page.getByLabel('Confirm password', { exact: true }).fill('my-new-password')
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Password updated')
  await expect(
    page.getByRole('button', { name: 'Sign in with password', exact: true }),
  ).toBeVisible()
})

test('native passkey prompt produces a real assertion without exposing session tokens', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Chromium virtual authenticator')
  await mockAccess(page)
  await page.route('**/api/workspace/auth/providers', (route) =>
    route.fulfill({ json: { google: false, azure: false, passkey: true } }),
  )
  const session = await context.newCDPSession(page)
  await session.send('WebAuthn.enable')
  const { authenticatorId } = await session.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })
  await page.goto('/login')
  // Seed this authenticator using the native creation ceremony; provider transport
  // is fixture-only here. This is not evidence of live provider crypto verification.
  await page.evaluate(async () => {
    await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: { id: 'localhost', name: 'Matrix Fellows test' },
        user: {
          id: new Uint8Array([1, 2, 3]),
          name: 'test@example.org',
          displayName: 'Synthetic member',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      },
    })
  })
  let assertion: any
  await page.route('**/api/workspace/auth/passkey', async (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'signin-options')
      return route.fulfill({
        json: {
          options: {
            challenge: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            rpId: 'localhost',
            timeout: 10000,
          },
        },
      })
    assertion = body
    await route.fulfill({
      status: 400,
      json: { statusMessage: 'Fixture assertion received; no live sign-in.' },
    })
  })
  await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Fixture assertion received')
  expect(assertion.action).toBe('signin-verify')
  expect(assertion.credential.response.signature).toBeTruthy()
  expect(assertion.credential.response.authenticatorData).toBeTruthy()
  expect(await page.evaluate(() => Object.keys(localStorage))).not.toContain('supabase.auth.token')
  await session.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId })
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

test('canceled passkey prompts can be retried without submitting an assertion', async ({
  page,
}) => {
  await mockAccess(page)
  await page.route('**/api/workspace/auth/providers', (route) =>
    route.fulfill({ json: { google: false, azure: false, passkey: true } }),
  )
  await page.addInitScript(() => {
    navigator.credentials.get = async () => {
      throw new DOMException('Canceled', 'NotAllowedError')
    }
  })
  let count = 0
  await page.route('**/api/workspace/auth/passkey', async (route) => {
    expect(route.request().postDataJSON().action).toBe('signin-options')
    count++
    await route.fulfill({
      json: {
        options: { challenge: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', rpId: 'localhost' },
      },
    })
  })
  await page.goto('/login')
  const button = page.getByRole('button', { name: 'Sign in with a passkey', exact: true })
  await button.click()
  await expect(page.getByRole('alert')).toContainText('canceled or timed out')
  await expect(button).toBeEnabled()
  await button.click()
  await expect.poll(() => count).toBe(2)
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
