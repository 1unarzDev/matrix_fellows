import { expect, test } from '@playwright/test'
const officer = '11111111-1111-4111-8111-111111111111'
const targetId = '22222222-2222-4222-8222-222222222222'
const mailboxId = '33333333-3333-4333-8333-333333333333'
const proposalId = '44444444-4444-4444-8444-444444444444'
function fixture() {
  return {
    member: { userId: officer, email: 'officer@example.org', role: 'admin' },
    profiles: [],
    society: {
      name: 'Matrix Fellows',
      description: 'Research society',
      capabilities: [],
      accomplishments: [],
      sponsor: '',
      updatedAt: '2026-10-03T00:00:00Z',
    },
    targets: [
      {
        id: targetId,
        name: 'Robotics Research Group',
        kind: 'lab',
        organization: 'University research group',
        disciplines: ['Robotics'],
        canonicalUrl: 'https://uta.edu/research',
        contactEmail: 'research@example.edu',
        location: 'Arlington, Texas',
        mode: 'unknown',
        status: 'ready',
        scope: 'both',
        description: 'Verified robotics research with public simulation work.',
        dossier: {
          evidence: [
            {
              url: 'https://uta.edu/research',
              claim: 'Research themes verified; mentoring availability unknown.',
              quote: 'Robotics research',
              confidence: 'verified',
              retrievedAt: '2026-10-03T00:00:00Z',
            },
          ],
          proposalAngles: ['A bounded simulation replication pilot'],
        },
        assessment: { confidence: 'low', rationale: 'Openness remains unknown.' },
        createdAt: '2026-10-03T00:00:00Z',
        updatedAt: '2026-10-03T00:00:00Z',
      },
    ],
    proposals: [
      {
        id: proposalId,
        targetId,
        profileId: null,
        kind: 'society',
        recipient: 'research@example.edu',
        subject: 'Robotics discussion with Matrix Fellows',
        body: 'Hello,\n\nWould you consider a short research discussion about your public simulation work? We would prepare students and coordinate scheduling.\n\nThank you.',
        mailboxId,
        revision: 1,
        status: 'draft',
        approvedRevision: null,
        approvedFingerprint: null,
        createdAt: '2026-10-03T00:00:00Z',
        updatedAt: '2026-10-03T00:00:00Z',
      },
    ],
    mailboxes: [
      {
        id: mailboxId,
        provider: 'gmail',
        email: 'officer@example.org',
        ownerId: officer,
        enabled: true,
      },
    ],
    saves: [],
    jobs: [],
    catalogSaves: [],
    plannerItems: [],
    outbox: [],
    settings: {
      paused: true,
      aiEnabled: false,
      termsConfirmed: false,
      weeklyLimit: 15,
      batchLimit: 5,
      queueLimit: 45,
      concurrency: 2,
    },
  }
}

test('workspace header blends into the scene and shares the catalog logo interaction', async ({
  page,
}, info) => {
  await page.goto('/login')
  const header = page.locator('.workspace-header')
  await expect(header).toBeVisible()
  await expect(header).not.toContainText('Partnership studio')
  expect(await header.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
    'rgba(0, 0, 0, 0)',
  )
  const brand = page.getByRole('link', { name: 'Matrix Fellows home', exact: true })
  const orbit = brand.locator('svg path').first()
  const initial = await orbit.evaluate((node) => getComputedStyle(node).strokeDashoffset)
  if (info.project.name === 'mobile') {
    // Touch devices do not advertise CSS hover. Verify the same mark through
    // its accessible keyboard interaction instead of inventing mouse support.
    await brand.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(brand).toBeFocused()
  } else await brand.hover()
  await expect
    .poll(() => orbit.evaluate((node) => getComputedStyle(node).strokeDashoffset))
    .not.toBe(initial)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)
  await page.screenshot({
    path: `/tmp/matrix-workspace-header-${info.project.name}.png`,
    fullPage: true,
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await brand
      .locator('.workspace-mark')
      .evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe('0s')
})

test('workspace and login are private-indexed and unconfigured auth fails closed', async ({
  request,
}) => {
  for (const path of ['/workspace', '/login']) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expect(response.headers()['x-robots-tag']).toContain('noindex')
    expect(response.headers()['cache-control']).toContain('no-store')
  }
  const response = await request.get('/api/workspace')
  expect([401, 503]).toContain(response.status())
  expect(await response.text()).not.toContain('access_token_encrypted')
  const rejected = await request.post('/api/workspace/targets', { data: {} })
  expect([401, 403, 503]).toContain(rejected.status())
})

test('private studio presents evidence, unknown priority and all sections without horizontal overflow', async ({
  page,
}, info) => {
  const data = fixture()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/workspace**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/workspace/auth/session')
      return route.fulfill({
        json: { configured: true, authenticated: true, officer: data.member },
      })
    if (path === '/api/workspace/research')
      return route.fulfill({
        json: {
          settings: { paused: true },
          sources: [],
          jobs: [],
          health: { note: 'Configured worker required before execution.' },
        },
      })
    if (path === '/api/workspace') return route.fulfill({ json: data })
    return route.fulfill({ status: 503, json: { statusMessage: 'Test route not configured' } })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/workspace')
  await expect(
    page.getByRole('heading', { name: 'Partnership discovery', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: /Robotics Research Group/ }).click()
  await expect(page.getByText('Evidence, not assumptions', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Research themes verified; mentoring availability unknown.', { exact: true }),
  ).toBeVisible()
  for (const label of [
    'Your profile',
    'Society',
    'Saved & planned',
    'Research runs',
    'Connections',
    'Proposals',
  ]) {
    await page
      .getByRole('navigation', { name: 'Partnership studio' })
      .getByRole('button', { name: label, exact: true })
      .click()
    await expect(page.locator('.studio-content')).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true)
  }
  await page.screenshot({ path: `/tmp/matrix-workspace-${info.project.name}.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('mail sending requires separate approval and final confirmation', async ({ page }) => {
  const data = fixture()
  const requests: { path: string; body: any }[] = []
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/workspace**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      requests.push({ path, body })
      if (path.endsWith('/approve')) {
        Object.assign(data.proposals[0]!, {
          status: 'approved',
          approvedRevision: 1,
          approvedFingerprint: 'a'.repeat(64),
        })
        return route.fulfill({ json: { ok: true, revision: 1, fingerprint: 'a'.repeat(64) } })
      }
      if (path === '/api/workspace/send')
        return route.fulfill({
          json: { ok: false, status: 'uncertain', message: 'Check Sent mail before retrying.' },
        })
    }
    if (path === '/api/workspace/auth/session')
      return route.fulfill({
        json: { configured: true, authenticated: true, officer: data.member },
      })
    if (path === '/api/workspace') return route.fulfill({ json: data })
    return route.fulfill({ status: 503, json: { statusMessage: 'Test route not configured' } })
  })
  await page.goto('/workspace')
  await page
    .getByRole('navigation', { name: 'Partnership studio' })
    .getByRole('button', { name: 'Proposals', exact: true })
    .click()
  await page.getByRole('button', { name: /Robotics discussion with Matrix Fellows/ }).click()
  await expect(page.getByRole('button', { name: 'Review & send' })).toBeDisabled()
  await page.getByRole('button', { name: 'Approve exact revision' }).click()
  expect(requests.filter((request) => request.path === '/api/workspace/send')).toHaveLength(0)
  await page.getByRole('button', { name: 'Review & send' }).click()
  await expect(page.getByRole('heading', { name: 'Send this exact email?' })).toBeVisible()
  expect(requests.filter((request) => request.path === '/api/workspace/send')).toHaveLength(0)
  await page.getByRole('button', { name: 'Confirm send' }).click()
  await expect
    .poll(() => requests.filter((request) => request.path === '/api/workspace/send').length)
    .toBe(1)
  expect(requests.find((request) => request.path === '/api/workspace/send')!.body).toMatchObject({
    proposalId,
    revision: 1,
    fingerprint: 'a'.repeat(64),
    mailboxId,
  })
  await expect(page.getByRole('alert')).toContainText(/uncertain|Sent mail|retry/i)
})
