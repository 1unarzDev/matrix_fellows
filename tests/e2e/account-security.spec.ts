import { test, expect, type Page } from '@playwright/test'
// Keep account tests independent of the separate dashboard redesign fixtures.
async function setup(page: Page) {
  await page.route('**/api/workspace**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/workspace')
      return route.fulfill({
        json: {
          member: {
            userId: '11111111-1111-4111-8111-111111111111',
            email: 'synthetic-member@example.org',
            role: 'member',
          },
          profiles: [],
          society: {
            name: 'Matrix Fellows',
            description: '',
            capabilities: [],
            accomplishments: [],
            sponsor: '',
            updatedAt: '',
          },
          targets: [],
          proposals: [],
          mailboxes: [],
          saves: [],
          catalogSaves: [],
          plannerItems: [],
          jobs: [],
          settings: {
            paused: true,
            aiEnabled: false,
            termsConfirmed: false,
            weeklyLimit: 5,
            batchLimit: 3,
            queueLimit: 20,
            concurrency: 1,
          },
        },
      })
    if (path === '/api/workspace/plan')
      return route.fulfill({
        json: { pursuits: [], tasks: [], activities: [], events: [], capacityHours: null },
      })
    if (path === '/api/workspace/auth/providers')
      return route.fulfill({ json: { google: true, azure: true, passkey: true } })
    return route.fulfill({ json: { items: [], providers: { gmail: false, outlook: false } } })
  })
}
test.use({ video: 'on' })
test('fixture: native registration, rename, removal and password management', async ({
  page,
  context,
  browserName,
}, info) => {
  test.skip(browserName !== 'chromium', 'Virtual authenticator')
  await setup(page)
  let keys: any[] = []
  let registration: any
  await page.route('**/api/workspace/auth/security', (route) =>
    route.fulfill({ json: { email: 'synthetic-member@example.org', passkeys: keys, passkeyAvailable: true, fresh: true } }),
  )
  await page.route('**/api/workspace/auth/passkey', async (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'register-options')
      return route.fulfill({
        json: {
          options: {
            challenge: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            rp: { id: 'localhost', name: 'Matrix Fellows fixture' },
            user: {
              id: 'AQID',
              name: 'synthetic-member@example.org',
              displayName: 'Synthetic member',
            },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            attestation: 'none',
            timeout: 10000,
          },
        },
      })
    if (body.action === 'register-verify') {
      registration = body
      keys = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          friendly_name: 'Test passkey',
          created_at: '2026-10-09T12:00:00Z',
        },
      ]
    }
    if (body.action === 'rename') keys[0].friendly_name = body.name
    if (body.action === 'delete') keys = []
    return route.fulfill({ json: { ok: true } })
  })
  const session = await context.newCDPSession(page)
  await session.send('WebAuthn.enable')
  await session.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })
  await page.goto('/dashboard?section=settings')
  await expect(page.getByRole('button', { name: 'Set up a passkey', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Passkey', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Set up a passkey', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Set up a passkey', exact: true }).click()
  await expect(page.getByText('Passkey added.', { exact: true })).toBeVisible()
  expect(registration.credential.response.attestationObject).toBeTruthy()
  expect(registration.credential.response.clientDataJSON).toBeTruthy()
  await page.getByLabel('Passkey name', { exact: true }).fill('Personal device')
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  await expect(page.getByText('Passkey renamed.', { exact: true })).toBeVisible()
  await page.screenshot({
    path: `/tmp/matrix-account-auth-${info.project.name}.png`,
    fullPage: true,
  })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByRole('button', { name: 'Passkey', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Set up a passkey', exact: true })).toBeVisible()
  await page.getByLabel('New password', { exact: true }).fill('a-new-long-password')
  await page.getByLabel('Confirm password', { exact: true }).fill('another-long-password')
  await page.getByRole('button', { name: 'Update password', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('do not match')
})
test('fixture: stale sessions require a fresh sign-in and provider failure preserves recovery', async ({
  page,
}) => {
  await setup(page)
  await page.route('**/api/workspace/auth/security', (route) =>
    route.fulfill({ json: { email: 'synthetic-member@example.org', passkeys: [], passkeyAvailable: false, fresh: false } }),
  )
  await page.goto('/dashboard?section=settings')
  await expect(page.getByRole('button', { name: 'Set up a passkey', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Passkey', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Set up a passkey', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Update password', exact: true })).toBeDisabled()
  await expect(page.getByText('Needed', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Email link/ })).toBeEnabled()
  await expect(page.getByText(/Works when passkeys are enabled/)).toBeVisible()
})
