import { expect, test } from '@playwright/test'

test('calendar source actions keep a stable surface throughout hover', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Fine-pointer hover regression')
  await page.addInitScript(() =>
    localStorage.setItem(
      'matrix-fellows:saved-opportunities:v1',
      JSON.stringify(['hover-fixture']),
    ),
  )
  await page.route('**/api/opportunities/saved-calendar', (route) =>
    route.fulfill({
      json: {
        entries: [
          {
            id: 'hover-fixture',
            opportunityId: 'hover-fixture',
            opportunityTitle: 'Hover test opportunity',
            milestoneTitle: 'Application deadline',
            summary: 'Prepare your research application.',
            date: '2026-10-23',
            precision: 'date-only',
            timezone: null,
            location: 'Online',
            kind: 'deadline',
            state: 'confirmed',
            requirements: [],
            saved: true,
            priority: 100,
            officialUrl: 'https://example.edu/official',
            submissionUrl: 'https://example.edu/apply',
            evidence: 'Official application schedule.',
            verifiedAt: '2026-10-03',
          },
        ],
      },
    }),
  )
  await page.goto('/meetings')
  await page.locator('[data-calendar-ready="true"]').waitFor()
  const calendar = page.getByRole('region', { name: 'Meeting calendar' })
  await calendar.getByRole('button', { name: /Next month from September 2026/ }).click()
  await calendar.getByRole('button', { name: /Hover test opportunity/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const fixtureTab = dialog.getByRole('button', { name: 'Hover test opportunity', exact: true })
  if (await fixtureTab.count()) await fixtureTab.click()
  await page.waitForTimeout(600)
  for (const name of ['Submission portal', 'Open official source']) {
    const action = dialog.getByRole('link', { name })
    await action.scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(500)
    const before = await action.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        width: element.getBoundingClientRect().width,
        gap: style.gap,
        position: style.backgroundPosition,
      }
    })
    await action.hover()
    const frames = await action.evaluate(async (element) => {
      const samples: { width: number; gap: string; position: string; transform: string }[] = []
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const sample = () => {
          const style = getComputedStyle(element)
          samples.push({
            width: element.getBoundingClientRect().width,
            gap: style.gap,
            position: style.backgroundPosition,
            transform: style.transform,
          })
          if (performance.now() - start < 500) requestAnimationFrame(sample)
          else resolve()
        }
        sample()
      })
      return samples
    })
    expect(frames.length).toBeGreaterThan(3)
    for (const frame of frames) {
      expect(Math.abs(frame.width - before.width), name).toBeLessThan(0.2)
      expect(frame.gap, name).toBe(before.gap)
      expect(Math.abs(parseFloat(frame.position) - parseFloat(before.position)), name).toBeLessThan(
        0.01,
      )
      expect(frame.transform, name).toBe('none')
    }
    await expect(action.locator('svg')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 2, 0)')
    await action.screenshot({ path: info.outputPath(`${name.replaceAll(' ', '-')}-hover.png`) })
    await page.mouse.move(0, 0)
    await action.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(action).toBeFocused()
    await expect(action).not.toHaveCSS('outline-style', 'none')
  }
  await dialog.screenshot({ path: info.outputPath('calendar-actions-panel.png') })
})
