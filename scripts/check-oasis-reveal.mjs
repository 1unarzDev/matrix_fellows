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
      canvas.height = 960
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, 1440, 960).data
      const luminance = (index) =>
        0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]
      const band = (x0, y0, x1, y1) => {
        let luminanceTotal = 0
        let chromaTotal = 0
        let samples = 0
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const index = (y * 1440 + x) * 4
            const red = pixels[index]
            const green = pixels[index + 1]
            const blue = pixels[index + 2]
            luminanceTotal += luminance(index)
            chromaTotal += Math.max(red, green, blue) - Math.min(red, green, blue)
            samples++
          }
        }
        return { luminance: luminanceTotal / samples, chroma: chromaTotal / samples }
      }
      let strong = 0
      let count = 0
      for (let y = 81; y < 329; y++) {
        for (let x = 1; x < 1439; x++) {
          const index = (y * 1440 + x) * 4
          const edge =
            Math.abs(luminance(index) - luminance(index + 4)) +
            Math.abs(luminance(index) - luminance(index + 1440 * 4))
          if (edge > 35) strong++
          count++
        }
      }
      return {
        edgeRatio: strong / count,
        dressingBand: band(100, 250, 1300, 500),
        duneBand: band(0, 500, 1440, 850),
      }
    }, { source: dataURL })
  }

  const early = await sample(0.35, 'early')
  const transition = await sample(0.45, 'transition')
  const clearing = await sample(0.55, 'clearing')
  const late = await sample(0.7, 'late')
  const settled = await sample(0.85, 'settled')
  assert.ok(
    transition.edgeRatio < 0.0035,
    `Ridge haze exposes high-contrast dressing during its fade (${transition.edgeRatio.toFixed(5)})`,
  )
  assert.ok(
    settled.edgeRatio > 0.006,
    `Ridge haze does not clear enough for the settled oasis (${settled.edgeRatio.toFixed(5)})`,
  )
  const transitionBandGap = transition.dressingBand.luminance - transition.duneBand.luminance
  assert.ok(
    transitionBandGap < 34,
    `Reveal haze is concentrated around the dressing instead of spanning the dunes (${transitionBandGap.toFixed(2)} luminance gap)`,
  )
  console.log({ early, transition, clearing, late, settled, transitionBandGap })
} finally {
  await browser.close()
}
