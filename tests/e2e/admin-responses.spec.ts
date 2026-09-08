import { test, expect } from '@playwright/test'

test('authorized response dashboard shows analytics and exports only aggregate counts', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  // Test-only session; every editor database request is intercepted below.
  const project = 'xlnjzzbsxzadrvbrggau'
  await page.evaluate((project) => {
    const user = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'editor@example.org',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    }
    const encode = (data: unknown) =>
      btoa(JSON.stringify(data)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')
    const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`
    localStorage.setItem(
      `sb-${project}-auth-token`,
      JSON.stringify({
        access_token,
        refresh_token: 'test',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: 'bearer',
        user,
      }),
    )
  }, project)
  await page.route('**/rest/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path.endsWith('/is_editor')) data = true
    if (path.endsWith('/site_content')) data = null
    if (path.endsWith('/join_response_analytics'))
      data = {
        total: 1,
        recent: 1,
        interests: [{ label: 'AI & computing', count: 1 }],
        stages: [{ label: 'No experience yet', count: 1 }],
        grades: [{ label: '11th grade', count: 1 }],
        goals: [{ label: 'Learn research skills', count: 1 }],
      }
    if (path.endsWith('/join_responses'))
      data = [
        {
          id: 1,
          name: 'Private Test Name',
          email: 'private@example.org',
          grade: '11th grade',
          stage: 'No experience yet',
          interests: ['AI & computing'],
          goals: ['Learn research skills'],
          created_at: '2026-09-07T12:00:00Z',
        },
      ]
    await route.fulfill({ json: data })
  })
  await page.goto('/?admin=1#community')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/#community$/)
  await page.reload()
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Member admin' }).click()
  const picker = page.getByRole('button', { name: 'Editor section: Meeting' })
  await picker.click()
  await page.getByRole('option', { name: 'Responses', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editor section: Responses' })).toBeFocused()
  await expect(
    page.getByRole('heading', { name: 'The people behind the questions.' }),
  ).toBeVisible()
  await expect(page.getByText('Private Test Name', { exact: true })).toBeVisible()
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download sponsor summary', exact: false }).click()
  const download = await downloadEvent
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream!) chunks.push(chunk)
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('Total responses')
  expect(csv).toContain('<5')
  expect(csv).not.toContain('Private Test Name')
  expect(csv).not.toContain('private@example.org')
  await page.screenshot({ path: `test-results/admin-responses-${test.info().project.name}.png` })
})
