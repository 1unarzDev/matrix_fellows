import { test, expect } from '@playwright/test'

test('direct links and reverse navigation synchronize the scene', async ({ page }, testInfo) => {
  await page.goto('/#connection')
  await expect(page.locator('canvas[data-progress]')).toHaveAttribute('data-progress', /^4\.0/, {
    timeout: 15000,
  })
  await page.setViewportSize({ width: testInfo.project.name === 'mobile' ? 430 : 980, height: 844 })
  const glass = page.getByRole('navigation', { name: 'Mobile sections', exact: true })
  await expect(glass).toBeVisible()
  await glass.getByRole('link', { name: 'Connect', exact: true }).click()
  await expect
    .poll(async () => {
      const pill = await page.locator('[data-nav-pill]').boundingBox()
      const selected = await glass.locator('[aria-current="location"]').boundingBox()
      return pill && selected ? Math.abs(pill.x - selected.x) : Infinity
    })
    .toBeLessThan(2)
  const mobile = true
  const nav = page.getByRole('navigation', {
    name: mobile ? 'Mobile sections' : 'Journey sections',
    exact: true,
  })
  await nav.getByRole('link', { name: mobile ? 'Begin' : 'The question', exact: true }).click()
  await expect(page.locator('canvas[data-progress]')).toHaveAttribute('data-progress', '0.000', {
    timeout: 10000,
  })
  await expect(page.locator('canvas[data-progress]')).toHaveAttribute('data-water-height', '-1.00')
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
  await expect(page.locator('#beginning [data-depth-layer]').first()).toHaveCSS('opacity', '1')
})

test('content, navigation, project expansion, and search work', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  // Navigation choreography is installed with the lazy cinematic adapter.
  // Wait for that owner rather than accidentally testing the browser's plain
  // anchor fallback while the static scene preview is still active.
  await page.locator('canvas[data-progress]').waitFor({ timeout: 15000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Beyond what')
  const mobile = testInfo.project.name === 'mobile'
  const nav = page.getByRole('navigation', {
    name: mobile ? 'Mobile sections' : 'Journey sections',
    exact: true,
  })
  await nav.getByRole('link', { name: mobile ? 'Research' : 'Our research', exact: true }).click()
  await expect(page).toHaveURL(/#research$/)
  await expect(nav.locator('[aria-current="location"]')).toHaveAttribute('href', '#research', {
    // SwiftShader can make Lenis' ticker advance much more slowly than a real
    // GPU-backed browser; this still verifies the selector reaches its target.
    timeout: mobile ? 8000 : 20_000,
  })
  // The cinematic layout intentionally frames chapter copy below/through the
  // viewport rather than pinning every section shell to y=0.
  await expect(page.getByRole('heading', { name: /Every answer/ })).toBeInViewport()
  await page.getByRole('button', { name: /^01 Robotics/ }).click()
  await expect(
    page.getByText(/How much can we learn about a robot before putting it in the water/),
  ).toBeVisible()
  await nav.getByRole('link', { name: mobile ? 'Join us' : 'Your next step', exact: true }).click()
  await expect(page).toHaveURL(/#community$/)
  await page
    .getByRole('searchbox', { name: 'Search all research opportunities' })
    .fill('machine learning')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).toHaveURL(/\/opportunities\?q=machine\+learning/)
  await expect(page.getByRole('heading', { name: 'Opportunities', exact: true })).toBeVisible()
  // Admin dialog behavior and authorization have dedicated suites; keeping
  // them out of this long journey prevents duplicated animation waits.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(errors).toEqual([])
})

test('reduced motion keeps all content available without initializing WebGL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#connection')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: /One curious mind/ })).toBeVisible()
  await expect(page.locator('canvas.pointer-events-none.fixed')).toHaveCSS('opacity', '0')
  await page.keyboard.press('Control+Shift+E')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
})

test('Connect introduces all four officers with responsive portraits and restrained color motion', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  await page.goto('/#connection')
  await page.locator('[data-ready="true"]').waitFor()

  const preview = page.getByRole('region', { name: 'Meet the officers.' })
  const cards = preview.locator('.officer-card')
  await expect(preview).not.toBeInViewport()
  const initialPreviewBounds = await preview.boundingBox()
  expect(initialPreviewBounds).not.toBeNull()
  expect(initialPreviewBounds!.y).toBeGreaterThanOrEqual(
    await page.evaluate(() => window.innerHeight),
  )
  await expect(cards.first()).toHaveCSS('opacity', '0')
  await preview.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await expect(cards.first()).toHaveCSS('opacity', '1')
  for (const [name, role] of [
    ['Liam Bray', 'Founder'],
    ['Nicholas Cheng', 'Co-Founder / VP'],
    ['Alysia Bui', 'Secretary'],
    ['Nu Nu', 'Treasurer'],
  ]) {
    await expect(preview.getByRole('heading', { name, exact: true })).toBeVisible()
    await expect(preview.getByText(role, { exact: true })).toBeVisible()
    await expect(preview.getByRole('img', { name: `Portrait of ${name}` })).toHaveAttribute(
      'src',
      /\/officers\/.+\.webp$/,
    )
  }

  await expect(cards).toHaveCount(4)
  if (testInfo.project.name === 'mobile') {
    const carousel = preview.getByRole('region', { name: 'Officer carousel' })
    const cta = page.getByRole('link', { name: /There’s a place for you here/ })
    const [ctaBounds, previewBounds] = await Promise.all([cta.boundingBox(), preview.boundingBox()])
    expect(ctaBounds).not.toBeNull()
    expect(previewBounds).not.toBeNull()
    expect(previewBounds!.y - (ctaBounds!.y + ctaBounds!.height)).toBeGreaterThanOrEqual(120)
    await expect(carousel).toHaveCSS('scroll-snap-type', /x mandatory/)
    await expect(cards.first()).toHaveClass(/officer-card--active/)
    await expect(cards.first().locator('img')).toHaveJSProperty('complete', true)
    const firstFilter = await cards.first().locator('img').evaluate((element) =>
      getComputedStyle(element).filter,
    )
    const secondRestingFilter = await cards.nth(1).locator('img').evaluate((element) =>
      getComputedStyle(element).filter,
    )
    expect(firstFilter).not.toBe(secondRestingFilter)
    const controls = preview.getByRole('button', { name: /^Show / })
    const controlWidths = await controls.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).offsetWidth),
    )
    expect(Math.max(...controlWidths) - Math.min(...controlWidths)).toBeLessThan(0.5)
    await preview.evaluate((root) => {
      const officerCards = [...root.querySelectorAll('.officer-card')]
      const readActive = () =>
        officerCards.findIndex((card) => card.classList.contains('officer-card--active'))
      root.setAttribute('data-active-sequence', String(readActive()))
      const observer = new MutationObserver(() => {
        const active = readActive()
        if (active < 0) return
        const sequence = root.getAttribute('data-active-sequence')?.split(',').map(Number) ?? []
        if (sequence.at(-1) !== active) {
          root.setAttribute('data-active-sequence', [...sequence, active].join(','))
        }
      })
      officerCards.forEach((card) =>
        observer.observe(card, { attributes: true, attributeFilter: ['class'] }),
      )
    })
    await preview.getByRole('button', { name: 'Next officer' }).click()
    await expect(cards.nth(1)).toHaveClass(/officer-card--active/)
    await expect(cards.nth(1).locator('img')).toHaveJSProperty('complete', true)
    await expect.poll(() => cards.nth(1).locator('img').evaluate((element) =>
      getComputedStyle(element).filter,
    )).not.toBe(secondRestingFilter)
    await expect(preview.locator('.officer-carousel__count span')).toHaveText('02')
    await page.waitForTimeout(900)
    await expect(preview).toHaveAttribute('data-active-sequence', '0,1')
  } else {
    const portrait = cards.first().locator('.officer-card__portrait')
    const image = portrait.locator('img')
    await portrait.scrollIntoViewIfNeeded()
    const restingFilter = await image.evaluate((element) => getComputedStyle(element).filter)
    await cards.first().hover()
    await expect.poll(() => image.evaluate((element) => getComputedStyle(element).filter)).not.toBe(
      restingFilter,
    )
  }
})

test('WebGL failure preserves the HTML and section navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null
      return original.apply(this, [type, ...args] as never)
    } as typeof original
  })
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Find your people', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Come curious.' })).toBeInViewport()
  await expect(page.locator('canvas.pointer-events-none.fixed')).toHaveCSS('opacity', '0')
})

test('meeting summary is prominent before the journey and links to full details', async ({
  page,
}) => {
  await page.goto('/')
  const hero = page.locator('#beginning')
  await expect(hero.getByText('Meetings', { exact: true })).toBeVisible()
  await expect(hero.getByText('During lunch', { exact: false })).toBeVisible()
  await expect(hero.getByText('Martin HS · Room 186C', { exact: true })).toBeVisible()
  await hero.getByRole('link', { name: 'Meeting details' }).click()
  await expect(page).toHaveURL(/#meeting-details$/)
  const meetingDetails = page.locator('#meeting-details')
  await expect(meetingDetails).toBeInViewport({ timeout: 10000 })
  const meetingTop = await meetingDetails.evaluate((element) => element.getBoundingClientRect().top)
  expect(meetingTop).toBeGreaterThanOrEqual(150)
  expect(meetingTop).toBeLessThanOrEqual(260)
})

test('explains the Matrix Fellows and Martin Research Society relationship', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#beginning')
  await expect(
    page.getByText(
      /Matrix Fellows is the broader student-research initiative.*Martin High School Research Society is its community at Martin/,
    ),
  ).toBeVisible()
})

test('hero priorities remain clear of the journey navigation on narrow screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/#beginning')
  const meeting = page.locator('[data-hero-meeting]')
  const navigation = page.getByRole('navigation', { name: 'Mobile sections', exact: true })
  await expect(meeting).toBeVisible()
  await expect(navigation).toBeVisible()
  const bounds = await Promise.all([meeting.boundingBox(), navigation.boundingBox()])
  expect(bounds[0]).not.toBeNull()
  expect(bounds[1]).not.toBeNull()
  expect(bounds[0]!.y + bounds[0]!.height).toBeLessThan(bounds[1]!.y)

  await page.setViewportSize({ width: 810, height: 1080 })
  const society = page.locator('[data-hero-society]')
  await expect(society).toBeVisible()
  const tabletBounds = await Promise.all([society.boundingBox(), navigation.boundingBox()])
  expect(tabletBounds[0]).not.toBeNull()
  expect(tabletBounds[1]).not.toBeNull()
  expect(tabletBounds[0]!.y + tabletBounds[0]!.height).toBeLessThan(tabletBounds[1]!.y)
})

test('meeting calendar stacks on mobile while featured opportunities traverse horizontally', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#beginning')
  await page.locator('[data-ready="true"]').waitFor()

  const meetingLayout = page.locator('[data-meeting-layout]')
  await expect(
    meetingLayout.getByRole('heading', { name: 'A place to turn curiosity into momentum.' }),
  ).toBeVisible()
  const [meetingIntro, meetingPanel] = await Promise.all([
    meetingLayout.locator('.meeting-layout__left').boundingBox(),
    meetingLayout.locator('.meeting-layout__detail').boundingBox(),
  ])
  expect(meetingIntro).not.toBeNull()
  expect(meetingPanel).not.toBeNull()
  expect(meetingPanel!.y).toBeGreaterThanOrEqual(meetingIntro!.y + meetingIntro!.height)
  expect(meetingPanel!.x).toBeCloseTo(meetingIntro!.x, 0)

  await page
    .locator('#community')
    .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }))
  const rail = page.locator('[data-home-opportunity-rail]')
  await expect(rail).toBeVisible()
  const dimensions = await rail.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    cards: element.children.length,
  }))
  expect(dimensions.cards).toBe(6)
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth * 3)
  await expect(rail.getByRole('tablist')).toHaveCount(0)

  await page.getByRole('button', { name: 'Next featured opportunity' }).click()
  await expect
    .poll(() => rail.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(dimensions.clientWidth * 0.6)
  await expect(page.getByText('Featured route', { exact: false })).toContainText('2 / 6')

  await page.setViewportSize({ width: 810, height: 1080 })
  const [tabletIntro, tabletPanel] = await Promise.all([
    meetingLayout.locator('.meeting-layout__left').boundingBox(),
    meetingLayout.locator('.meeting-layout__detail').boundingBox(),
  ])
  expect(tabletIntro).not.toBeNull()
  expect(tabletPanel).not.toBeNull()
  expect(tabletPanel!.x).toBeGreaterThanOrEqual(tabletIntro!.x + tabletIntro!.width)
  await expect(meetingLayout).toHaveCSS('border-radius', '24px')
  await expect(meetingLayout.locator('.meeting-calendar')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  )
  await expect(meetingLayout.locator('.meeting-layout__detail')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  )

  const [tabletLeft, tabletDetailWrap] = await Promise.all([
    meetingLayout.locator('.meeting-layout__left').boundingBox(),
    meetingLayout.locator('.meeting-layout__detail-wrap').boundingBox(),
  ])
  expect(tabletLeft).not.toBeNull()
  expect(tabletDetailWrap).not.toBeNull()
  expect(tabletDetailWrap!.y).toBeCloseTo(tabletLeft!.y, 0)
  expect(tabletDetailWrap!.height).toBeCloseTo(tabletLeft!.height, 0)
})

test('home meeting calendar remains stable while crossing the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await page.locator('[data-ready="true"]').waitFor()

  const meeting = page.locator('#meeting-details')
  await expect(meeting).toBeAttached()
  await expect.poll(() => page.locator('[data-depth-layer]').count()).toBeGreaterThan(0)

  await meeting.evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: Math.max(0, top - window.innerHeight * 0.88), behavior: 'instant' })
  })
  await page.waitForTimeout(180)

  await expect(meeting).toHaveCSS('opacity', '1')
  await expect(meeting).toHaveCSS('transform', 'none')
})

test('footer links to the official Instagram profile', async ({ page }) => {
  await page.goto('/')
  const instagram = page.getByRole('link', {
    name: 'Matrix Fellows on Instagram, @mhs_research_society (opens in a new tab)',
  })
  await expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/mhs_research_society/')
  await expect(instagram).toHaveAttribute('target', '_blank')
  await expect(instagram).toHaveAttribute('rel', 'noopener noreferrer')
})
