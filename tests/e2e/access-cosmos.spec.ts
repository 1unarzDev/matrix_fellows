import { expect, test } from '@playwright/test'

test('accretion texture visibly evolves and reduced motion freezes the scene', async ({ page }) => {
  await page.route('**/api/workspace/auth/session', (r) =>
    r.fulfill({ json: { configured: true, authenticated: false } }),
  )
  await page.route('**/api/workspace/auth/providers', (r) =>
    r.fulfill({ json: { google: false, azure: false } }),
  )
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader|WebGL/i.test(message.text()))
      errors.push(message.text())
  })
  await page.goto('/login')
  await expect(page.locator('.access-cosmos')).toHaveClass(/is-rendering/)
  await page.waitForTimeout(1400)
  // Remove DOM for diagnostic captures only; the shipped scene always animates
  // behind the real form. Avoid mistaking a blinking input cursor for motion.
  await page
    .locator('.workspace-header, .workspace-main')
    .evaluateAll((elements) =>
      elements.forEach((e) => ((e as HTMLElement).style.visibility = 'hidden')),
    )
  const canvas = page.locator('.cosmos-renderer')
  const first = await canvas.screenshot()
  await page.waitForTimeout(900)
  const second = await canvas.screenshot()
  expect(first.equals(second)).toBe(false)
  expect(errors).toEqual([])
  const dimensions = await canvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: canvas.clientWidth,
      ratio: Math.min(devicePixelRatio, 2),
    }
  })
  expect(dimensions.width).toBe(Math.floor(dimensions.cssWidth * dimensions.ratio))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(600)
  const still = await canvas.screenshot()
  await page.waitForTimeout(500)
  expect(still.equals(await canvas.screenshot())).toBe(true)
})

test('context loss leaves an accessible form and vector recovery scene', async ({ page }) => {
  await page.route('**/api/workspace/auth/session', (r) =>
    r.fulfill({ json: { configured: true, authenticated: false } }),
  )
  await page.route('**/api/workspace/auth/providers', (r) =>
    r.fulfill({ json: { google: false, azure: false } }),
  )
  await page.goto('/login')
  await expect(page.locator('.access-cosmos')).toHaveClass(/is-rendering/)
  await page
    .locator('canvas')
    .evaluate((e) => e.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
  await expect(page.locator('.access-cosmos')).not.toHaveClass(/is-rendering/)
  await expect(page.getByRole('button', { name: 'Continue with email' })).toBeEnabled()
  await expect(page.locator('.gravity-field')).toBeVisible()
})
