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

test('catalog pagination, search, and status/type filters retain past editions', async ({
  page,
}) => {
  await openBoard(page)
  const board = page.locator('section[aria-labelledby="opportunities-title"]')
  await expect(board.getByRole('article')).toHaveCount(6)
  await board.getByRole('button', { name: 'Opportunity page 2', exact: true }).click()
  await expect(
    board.getByRole('button', { name: 'Opportunity page 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(board.getByRole('article')).toHaveCount(6)
  await board.getByRole('button', { name: 'View all opportunities', exact: true }).click()
  await expect(board.getByRole('article')).toHaveCount(32)
  await board.getByRole('button', { name: 'Browse by page', exact: true }).click()
  await page.getByRole('searchbox').fill('Research opening 32')
  await expect(board.getByRole('article')).toHaveCount(1)
  await expect(card(page, 'Research opening 32')).toBeVisible()
  await page.getByRole('searchbox').fill('')
  await expect(board.getByRole('article')).toHaveCount(6)
  await page.getByRole('button', { name: 'Opportunity status: All statuses' }).click()
  await page.getByRole('option', { name: 'Completed', exact: true }).click()
  await expect(board.getByRole('article')).toHaveCount(1)
  await expect(card(page, 'Archived research edition')).toBeVisible()
  await page.getByRole('button', { name: 'Opportunity status: Completed' }).click()
  await page.getByRole('option', { name: 'All statuses', exact: true }).click()
  await page.getByRole('button', { name: 'Opportunity type: All types' }).click()
  await page.getByRole('option', { name: 'Workshop', exact: true }).click()
  await expect(board.getByRole('article')).toHaveCount(6)
  await expect(board.getByText('28 opportunities', { exact: false })).toBeVisible()
})

test('timeline selects the next date, exposes evidence, and supports buttons and keyboard', async ({
  page,
}) => {
  await openBoard(page)
  const first = card(page)
  const selected = first.getByRole('tab', { selected: true })
  await expect(selected).toContainText('Checkpoint 4')
  await expect(selected).toContainText('Up next')
  const centers = await first.getByRole('tab').evaluateAll((tabs) =>
    tabs.map((tab) => {
      const dot = tab.querySelector('[data-timeline-dot]')!.getBoundingClientRect()
      const line = tab.querySelector('[data-timeline-line]')!.getBoundingClientRect()
      return Math.abs(dot.y + dot.height / 2 - line.y - line.height / 2)
    }),
  )
  expect(Math.max(...centers)).toBeLessThan(1)
  await expect(first.getByRole('tabpanel')).toContainText('Checkpoint 4')
  await first.getByRole('button', { name: 'Previous checkpoint' }).click()
  await expect(selected).toContainText('Checkpoint 3')
  await first.getByRole('button', { name: 'Next checkpoint' }).click()
  await expect(selected).toContainText('Checkpoint 4')
  await selected.focus()
  await page.keyboard.press('ArrowRight')
  await expect(selected).toContainText('Checkpoint 5')
  await expect(selected).toBeFocused()
  await page.keyboard.press('Home')
  await expect(selected).toContainText('Checkpoint 1')
  await expect(first.getByRole('button', { name: 'Previous checkpoint' })).toBeDisabled()
  await page.keyboard.press('End')
  await expect(selected).toContainText('Checkpoint 8')
  await expect(first.getByRole('button', { name: 'Next checkpoint' })).toBeDisabled()
  await expect(first.getByRole('tabpanel').getByText('Checkpoint 8', { exact: true })).toBeVisible()
  await first.getByText('Date evidence & source', { exact: true }).click()
  await expect(
    first.getByText('Official evidence for checkpoint 8.', { exact: true }),
  ).toBeVisible()
  await expect(first.getByRole('link', { name: 'View checkpoint source' })).toHaveAttribute(
    'href',
    'https://example.org/checkpoint-8',
  )
  await expect(first.getByRole('tabpanel')).toContainText('Date only')
})

test('paired cards align and filter changes have a deliberate transition', async ({
  page,
}, info) => {
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
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Opportunity type: All types' }).click()
  await page.getByRole('option', { name: 'Workshop', exact: true }).click()
  await expect(board.locator('.opacity-0').first()).toBeAttached()
  await expect(board.getByRole('article').first()).toContainText('Research opening 05')
  await expect(board.getByRole('article').first().locator('..')).toHaveCSS('opacity', '1')
})

test('past-only and unannounced timelines remain readable', async ({ page }) => {
  await openBoard(page)
  const archived = card(page, 'Archived research edition')
  await expect(archived.getByRole('tab', { selected: true })).toContainText('Past checkpoint 3')
  await expect(archived.getByText('Up next', { exact: true })).toHaveCount(0)
  await archived.getByRole('button', { name: 'Previous checkpoint' }).click()
  await expect(archived.getByRole('tabpanel')).toContainText('Past checkpoint 2')
  const awaiting = card(page, 'Awaiting next announcement')
  await expect(awaiting.getByRole('tab')).toHaveCount(0)
  await expect(awaiting.getByRole('tabpanel')).toContainText('Awaiting announcement')
})

test('narrow viewport confines horizontal scrolling and honors reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openBoard(page)
  const first = card(page)
  const typeBox = await page
    .getByRole('button', { name: 'Opportunity type: All types' })
    .boundingBox()
  const statusBox = await page
    .getByRole('button', { name: 'Opportunity status: All statuses' })
    .boundingBox()
  expect(Math.abs(typeBox!.y - statusBox!.y)).toBeLessThan(1)
  expect(statusBox!.x).toBeGreaterThan(typeBox!.x)
  const rail = first.getByRole('tablist')
  expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  expect(await rail.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  expect(
    await first.getByRole('tab', { selected: true }).evaluate((el) => {
      const tab = el.getBoundingClientRect()
      const rail = el.parentElement!.getBoundingClientRect()
      return tab.left >= rail.left - 1 && tab.right <= rail.right + 1
    }),
  ).toBe(true)
  await rail.evaluate((el) => {
    el.scrollLeft = 0
  })
  await first.getByRole('tab').first().click()
  await expect(first.getByRole('tabpanel')).toContainText('Checkpoint 1')
  await expect(first).toHaveCSS('transition-property', 'none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
