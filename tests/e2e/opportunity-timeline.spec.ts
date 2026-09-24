import { test, expect, type Page } from '@playwright/test'
import { defaultContent } from '../../shared/data/defaults'
import type { Opportunity } from '../../shared/types/content'

const day = 86400000
const now = Date.now()
const date = (offset: number) => new Date(now + offset * day).toISOString().slice(0, 10)
function opportunity(index: number, overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: `fixture-${index}`,
    sourceId: 'fixture',
    externalId: `${index}`,
    title: `Research opening ${String(index).padStart(2, '0')}`,
    kind: 'Competition',
    discipline: 'Research',
    description: 'A student research opportunity.',
    eventDate: null,
    deadline: null,
    timezone: null,
    location: 'Online',
    eligibility: 'High school students',
    url: 'https://example.org/official',
    verifiedAt: new Date(now).toISOString(),
    priority: 100 - index,
    published: true,
    milestones: [-15, -10, -5, 5, 10, 15, 20, 25].map((offset, point) => ({
      label: `Checkpoint ${point + 1}`,
      date: date(offset),
      kind: 'deadline',
      timezone: null,
      evidence: `Official evidence for checkpoint ${point + 1}.`,
      url: `https://example.org/checkpoint-${point + 1}`,
    })),
    ...overrides,
  }
}
const fixtures = [
  opportunity(1),
  opportunity(2, {
    title: 'Archived research edition',
    milestones: [-20, -10, -5].map((offset, index) => ({
      label: `Past checkpoint ${index + 1}`,
      date: date(offset),
      kind: 'event',
      timezone: null,
      evidence: 'Past official date.',
      url: 'https://example.org/archive',
    })),
  }),
  opportunity(3, {
    title: 'Awaiting next announcement',
    lifecycle: 'awaiting-announcement',
    milestones: [],
  }),
  opportunity(4, { title: 'Discontinued fellowship', lifecycle: 'discontinued', milestones: [] }),
  ...Array.from({ length: 28 }, (_, index) => opportunity(index + 5, { kind: 'Workshop' })),
]

async function openBoard(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Start a client render with an empty Nuxt payload so useFetch requests our API fixture.
  // Browser routing cannot intercept the server's own fetch during SSR.
  await page.route('**/', async (route) => {
    const response = await route.fetch()
    const html = (await response.text())
      .replace(
        /(<script[^>]*id="__NUXT_DATA__"[^>]*>)[\s\S]*?(<\/script>)/,
        '$1[{"serverRendered":1},false]$2',
      )
      .replace('data-ssr="true"', 'data-ssr="false"')
    await route.fulfill({ response, body: html })
  })
  await page.route('**/api/content', (route) =>
    route.fulfill({
      json: { content: defaultContent, opportunities: fixtures, configured: false },
    }),
  )
  await page.goto('/#community')
  await page.locator('[data-ready="true"]').waitFor()
  await expect(
    page.getByRole('heading', { name: 'Research opening 01', exact: true }),
  ).toBeVisible()
}
const card = (page: Page, title = 'Research opening 01') =>
  page.getByRole('article', { name: title, exact: true })

test('homepage keeps a bounded preview and hands search to the SSR catalog', async ({ page }) => {
  await openBoard(page)
  const board = page.locator('section[aria-labelledby="opportunities-title"]')
  await expect(board.getByRole('article')).toHaveCount(6)
  await board
    .getByRole('searchbox', { name: 'Search all research opportunities' })
    .fill('NeurIPS workshops')
  await board.getByRole('button', { name: 'Search' }).click()
  await expect(page).toHaveURL(/\/opportunities\?q=NeurIPS\+workshops/)
  await expect(page.getByRole('heading', { name: 'Opportunities', exact: true })).toBeVisible()
  await expect(page.getByRole('article').first()).toContainText('NeurIPS')
})

test('homepage cards surface one actionable checkpoint and keep full timelines out of the preview', async ({
  page,
}) => {
  await openBoard(page)
  const first = card(page)
  await expect(first.getByText('Next useful checkpoint', { exact: true })).toBeVisible()
  await expect(first.getByText('Checkpoint 4', { exact: true })).toBeVisible()
  await expect(first.getByRole('tablist')).toHaveCount(0)
  await expect(first.getByRole('link', { name: 'Official website' })).toBeVisible()
})

test('paired homepage preview cards remain aligned', async ({ page }, info) => {
  await openBoard(page)
  const board = page.locator('section[aria-labelledby="opportunities-title"]')
  if (info.project.name === 'desktop') {
    const boxes = await board.getByRole('article').evaluateAll((items) =>
      items.slice(0, 2).map((item) => {
        const box = item.getBoundingClientRect()
        return { top: box.top, bottom: box.bottom }
      }),
    )
    expect(Math.abs(boxes[0]!.top - boxes[1]!.top)).toBeLessThan(1)
    expect(Math.abs(boxes[0]!.bottom - boxes[1]!.bottom)).toBeLessThan(1)
  }
  await expect(board.getByRole('link', { name: 'Browse the full catalog' })).toBeVisible()
})

test('past-only and unannounced routes have honest compact status summaries', async ({ page }) => {
  await openBoard(page)
  const archived = card(page, 'Archived research edition')
  await expect(archived.getByText('Latest confirmed checkpoint', { exact: true })).toBeVisible()
  await expect(archived.getByText('Past checkpoint 3', { exact: true })).toBeVisible()
  const awaiting = card(page, 'Awaiting next announcement')
  await expect(awaiting.getByText('Current status', { exact: true })).toBeVisible()
  await expect(awaiting).toContainText('Awaiting announcement')
  await expect(awaiting.getByRole('tablist')).toHaveCount(0)
})

test('narrow viewport confines carousel scrolling and honors reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openBoard(page)
  const rail = page.locator('[data-home-opportunity-rail]')
  expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  await page.getByRole('button', { name: 'Next featured opportunity' }).click()
  await expect.poll(() => rail.evaluate((el) => el.scrollLeft)).toBeGreaterThan(200)
  await rail.focus()
  await page.keyboard.press('End')
  await expect(page.getByText('Featured route', { exact: false })).toContainText('6 / 6')
  await expect(card(page)).toHaveCSS('transition-property', 'none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('narrow catalog pagination remains a single accessible row', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.goto('/opportunities')
  const pager = page.getByRole('navigation', { name: 'Catalog pages' })
  await expect(pager).toHaveAttribute('data-mobile-pagination', 'compact')
  await expect(pager.getByText(/Page 1 of \d+/)).toBeVisible()
  await expect(pager.getByRole('button', { name: 'Previous catalog page' })).toHaveCSS(
    'height',
    '44px',
  )
  const rowHeight = await pager.evaluate((element) => {
    const children = [...element.children].filter(
      (child) => getComputedStyle(child).display !== 'none',
    )
    const top = Math.min(...children.map((child) => child.getBoundingClientRect().top))
    const bottom = Math.max(...children.map((child) => child.getBoundingClientRect().bottom))
    return bottom - top
  })
  expect(rowHeight).toBeLessThanOrEqual(44)
})
