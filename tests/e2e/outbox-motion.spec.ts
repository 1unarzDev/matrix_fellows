import { expect, test } from '@playwright/test'
import { setup } from '../fixtures/dashboard-browser'

test.use({ video: 'on' })

test('outbox disclosure animates, reverses smoothly, and supports keyboard and reduced motion', async ({ page }) => {
  const state = await setup(page)
  state.workspace.member.role = 'officer'
  await page.route('**/api/workspace/mailboxes/outbox', (route) => route.fulfill({ json: { items: [] } }))
  const loaded = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/workspace/mailboxes/outbox')
  await page.goto('/dashboard?section=queue')
  await loaded
  const toggle = page.getByRole('button', { name: 'Outbox & sending history', exact: true })
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.hover()
  await expect.poll(() => page.locator('.outbox-icon').evaluate((el) => getComputedStyle(el).transform)).not.toBe('none')
  const body = page.locator('#workspace-outbox-content')
  expect(await body.evaluate((el) => el.getBoundingClientRect().height)).toBe(0)
  const fullHeight = await page.locator('.outbox-content').evaluate((el) => el.getBoundingClientRect().height)
  // Sample inside the browser so transport/render delays cannot skip the animation.
  const hasIntermediateHeight = await page.evaluate(() => new Promise<boolean>((resolve) => {
    const content = document.querySelector<HTMLElement>('#workspace-outbox-content')!
    const target = document.querySelector<HTMLButtonElement>('.outbox-toggle')!
    const full = content.querySelector<HTMLElement>('.outbox-content')!.getBoundingClientRect().height
    const started = performance.now()
    function sample() {
      const height = content.getBoundingClientRect().height
      if (height > 0 && height < full - 1) return resolve(true)
      if (performance.now() - started > 900) return resolve(false)
      requestAnimationFrame(sample)
    }
    target.click()
    requestAnimationFrame(sample)
  }))
  expect(hasIntermediateHeight).toBe(true)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(body).toHaveAttribute('inert', '')
  await toggle.click()
  await expect.poll(() => body.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(fullHeight - 2)
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect.poll(() => body.evaluate((el) => el.getBoundingClientRect().height)).toBe(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await toggle.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(await body.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
  await page.locator('.outbox-panel').screenshot({ path: `/tmp/matrix-dashboard-evidence/outbox-${test.info().project.name}.png` })
})
