import { expect, test } from '@playwright/test'

test('mobile section buttons frame discovery, depths, and connection above their raw chapter starts', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'The raised framing is specific to compact screens')
  test.setTimeout(45_000)
  await page.goto('/')
  await page.locator('canvas[data-progress]').waitFor({ timeout: 15_000 })
  const navigation = page.getByRole('navigation', { name: 'Mobile sections', exact: true })

  for (const [label, id] of [
    ['Discover', 'discovery'],
    ['Depths', 'frontiers'],
    ['Connect', 'connection'],
  ] as const) {
    await navigation.getByRole('link', { name: label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`#${id}$`))
    await expect
      .poll(
        () => page.locator(`#${id}`).evaluate((section) => section.getBoundingClientRect().top),
        {
          timeout: 10_000,
        },
      )
      .toBeLessThan(-40)
    expect(
      await page.locator(`#${id}`).evaluate((section) => section.getBoundingClientRect().top),
    ).toBeGreaterThan(-130)
  }
})
