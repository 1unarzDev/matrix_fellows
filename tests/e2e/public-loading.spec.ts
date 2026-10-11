import { expect, test } from '@playwright/test'

test('homepage keeps its complete information hierarchy with JavaScript disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Beyond what we know/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Come curious.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Research guides', exact: true })).toBeVisible()
  await context.close()
})

test('public content is a bounded projection with shared-cache validation', async ({ request }) => {
  const response = await request.get('/api/content')
  expect(response.ok()).toBeTruthy()
  expect(
    Number(response.headers()['content-length'] || Buffer.byteLength(await response.body())),
  ).toBeLessThan(45_000)
  expect(response.headers()['cache-control']).toContain('stale-while-revalidate')
  expect(response.headers()['cdn-cache-control']).toContain('public')
  expect(response.headers()['age']).toBeDefined()
  expect(['HIT', 'MISS', 'STALE', 'LOCAL', 'BYPASS']).toContain(
    response.headers()['x-matrix-cache'],
  )
  const etag = response.headers().etag
  expect(etag).toMatch(/^"homepage-v5-/)
  const body = await response.json()
  expect(body.calendarEntries).toEqual([])
  expect(body.opportunities.length).toBeLessThanOrEqual(6)

  const revalidated = await request.get('/api/content', { headers: { 'if-none-match': etag } })
  expect(revalidated.status()).toBe(304)
})

test('calendar detail is fetched as a separate selected-record projection', async ({ request }) => {
  const response = await request.get('/api/content-calendar')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(Array.isArray(body.entries)).toBeTruthy()
})
