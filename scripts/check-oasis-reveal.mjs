import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const output = 'test-results/oasis-reveal'
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'
await mkdir(output, { recursive: true })

const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  await page.goto(baseURL)
  await page.locator('[data-ready="true"]').waitFor({ timeout: 60_000 })

  async function sample(progress, name) {
    await page.evaluate((value) => {
      const sections = [...document.querySelectorAll('[data-chapter]')]
      window.scrollTo({
        behavior: 'instant',
        top: sections[0].offsetTop + (sections[1].offsetTop - sections[0].offsetTop) * value,
      })
    }, progress)
    await page.waitForTimeout(1_500)
    const image = await page.screenshot({ path: `${output}/${name}.png` })
    const dataURL = `data:image/png;base64,${image.toString('base64')}`
    return page.evaluate(async ({ source }) => {
      const image = new Image()
      image.src = source
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 1440
      canvas.height = 250
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 80, 1440, 250, 0, 0, 1440, 250)
      const pixels = context.getImageData(0, 0, 1440, 250).data
      const luminance = (index) =>
        0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]
      let strong = 0
      let count = 0
      for (let y = 1; y < 249; y++) {
        for (let x = 1; x < 1439; x++) {
          const index = (y * 1440 + x) * 4
          const edge =
            Math.abs(luminance(index) - luminance(index + 4)) +
            Math.abs(luminance(index) - luminance(index + 1440 * 4))
          if (edge > 35) strong++
          count++
        }
      }
      return strong / count
    }, { source: dataURL })
  }

  const transition = await sample(0.45, 'transition')
  const settled = await sample(0.85, 'settled')
  assert.ok(
    transition < 0.0035,
    `Ridge haze exposes high-contrast dressing during its fade (${transition.toFixed(5)})`,
  )
  assert.ok(
    settled > 0.006,
    `Ridge haze does not clear enough for the settled oasis (${settled.toFixed(5)})`,
  )
  console.log({ transitionEdgeRatio: transition, settledEdgeRatio: settled })
} finally {
  await browser.close()
}
