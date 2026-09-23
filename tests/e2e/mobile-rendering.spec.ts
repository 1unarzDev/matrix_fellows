import { test, expect } from '@playwright/test'

test('public icons never depend on emoji arrow glyphs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('[data-ready="true"]')).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/[↗⬅➡⬇]/u)
})

test('browser chrome has a dark first-paint surface', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark')
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  )
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(16, 20, 19)')
})

test('mobile toolbar resizing does not reallocate the WebGL surface', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile')
  await page.goto('/#discovery')
  const canvas = page.locator('canvas[data-engine]')
  await expect(canvas).toHaveAttribute('data-progress', /^1\./, { timeout: 20000 })
  const before = await canvas.getAttribute('height')
  await page.setViewportSize({ width: 390, height: 780 })
  await page.waitForTimeout(500)
  expect(await canvas.getAttribute('height')).toBe(before)
})

test('landscape phones retain the efficient render path and sharp foreground', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile')
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/#research')
  const canvas = page.locator('canvas[data-engine]')
  await expect(canvas).toHaveCSS('opacity', '1', { timeout: 20_000 })
  await expect(canvas).toHaveAttribute('data-render-profile', 'efficient')
  await expect(canvas).toHaveAttribute('data-pixel-ratio', '1.25')
  await expect(canvas).toHaveAttribute('data-atmosphere-ratio', '0.32')
  await expect(canvas).toHaveAttribute('data-progress', /^2\./)
})

test('mobile camera settles after a touch-sized scroll step and keeps foreground sharp', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/#research')
  const canvas = page.locator('canvas[data-progress]')
  await expect(canvas).toHaveAttribute('data-progress', /^2\./, { timeout: 20000 })
  await expect(canvas).toHaveCSS('opacity', '1', { timeout: 20000 })
  await expect(canvas).toHaveAttribute('data-pixel-ratio', '1.25')
  const before = Number(await canvas.getAttribute('data-progress'))
  await page.evaluate(() => window.scrollBy(0, 160))
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-progress')))
    .toBeGreaterThan(before)
  await page.waitForTimeout(1000)
  const settled = Number(await canvas.getAttribute('data-progress'))
  await page.waitForTimeout(300)
  expect(Math.abs(Number(await canvas.getAttribute('data-progress')) - settled)).toBeLessThan(0.003)
  expect(Number(await canvas.getAttribute('data-atmosphere-ratio'))).toBeLessThan(1)
  expect(errors).toEqual([])
})

test('WebGL context loss releases the live scene and restores the static fallback', async ({
  page,
}) => {
  await page.goto('/?matrixProfile=1#research')
  const canvas = page.locator('canvas[data-engine]')
  await expect(canvas).toHaveCSS('opacity', '1', { timeout: 20_000 })
  const lossMethod = await canvas.evaluate((element) => {
    const gl =
      element.getContext('webgl2') ||
      element.getContext('webgl') ||
      element.getContext('experimental-webgl')
    const extension = gl?.getExtension('WEBGL_lose_context')
    if (extension) {
      extension.loseContext()
      return 'extension'
    }
    element.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    return 'event'
  })
  expect(['extension', 'event']).toContain(lossMethod)
  await expect(page.locator('[data-horizon-preview]')).toHaveAttribute(
    'data-scene-state',
    'fallback',
  )
  await expect(canvas).toHaveCSS('opacity', '0')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('leaving the homepage disposes the world and stops rendered-frame submissions', async ({
  page,
}) => {
  await page.goto('/?matrixProfile=1')
  await expect(page.locator('canvas[data-engine]')).toHaveCSS('opacity', '1', { timeout: 20_000 })
  await expect
    .poll(() => page.evaluate(() => window.__matrixWorldProfile?.frames.length || 0))
    .toBeGreaterThan(3)
  await page.evaluate(() => {
    const link = document.querySelector<HTMLAnchorElement>('a[href="/opportunities"]')
    if (!link) throw new Error('Opportunity catalog route link not found')
    link.click()
  })
  // Parallel SwiftShader projects can delay the dev server's first route
  // compilation; the assertion remains about SPA teardown after navigation.
  await expect(page).toHaveURL(/\/opportunities/, { timeout: 15_000 })
  await expect(page.locator('canvas')).toHaveCount(0)
  const afterNavigation = await page.evaluate(() => window.__matrixWorldProfile?.frames.length || 0)
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => window.__matrixWorldProfile?.frames.length || 0)).toBe(
    afterNavigation,
  )
})
