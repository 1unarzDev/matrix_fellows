// Full-renderer check: includes HDR bloom, camera, GSAP scrub, and compositor.
import { chromium } from '@playwright/test'
const browser = await chromium.launch({
  args: [
    '--no-sandbox',
    '--enable-gpu',
    '--use-gl=angle',
    '--use-angle=gl-egl',
    '--ignore-gpu-blocklist',
  ],
})
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('http://localhost:3000')
  await page.locator('[data-ready="true"]').waitFor()
  const samples = []
  for (let frame = 0; frame <= 80; frame++) {
    const stage = 2.05 + frame * 0.01
    await page.evaluate((stage) => {
      const chapters = [...document.querySelectorAll('[data-chapter]')]
      window.scrollTo({
        top: chapters[2].offsetTop + (chapters[3].offsetTop - chapters[2].offsetTop) * (stage - 2),
        behavior: 'instant',
      })
    }, stage)
    await page.waitForTimeout(frame === 0 ? 1200 : 35)
    const png = await page.screenshot()
    const metrics = await page.evaluate(async (encoded) => {
      const image = new Image()
      image.src = `data:image/png;base64,${encoded}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let mean = 0,
        black = 0
      for (let i = 0; i < data.length; i += 4) {
        mean += (data[i] + data[i + 1] + data[i + 2]) / 3
        if (Math.max(data[i], data[i + 1], data[i + 2]) < 8) black++
      }
      const world = document.querySelector('canvas')
      return {
        mean: mean / (data.length / 4),
        black: black / (data.length / 4),
        progress: world.dataset.progress,
        pixelRatio: Number(world.dataset.pixelRatio),
      }
    }, png.toString('base64'))
    samples.push(metrics)
  }
  const failures = samples.filter(
    (sample, i) =>
      i > 0 &&
      (sample.mean < samples[i - 1].mean - 18 || sample.black > samples[i - 1].black + 0.2),
  )
  const adapted = samples.some((sample) => sample.pixelRatio < samples[0].pixelRatio)
  console.log(
    JSON.stringify(
      { samples: samples.length, adapted, failures, errors, range: [samples[0], samples.at(-1)] },
      null,
      2,
    ),
  )
  if (failures.length || errors.length) process.exitCode = 1
} finally {
  await browser.close()
}
