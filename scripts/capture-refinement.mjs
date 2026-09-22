import { mkdir, rename } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const label = process.argv[2] || 'current'
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const root = `artifacts/refinement/${label}`
await mkdir(root, { recursive: true })

const browser = await chromium.launch({
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})

async function captureLayout(name, width, height) {
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  await page.goto(`${baseURL}/#community`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-ready="true"]').waitFor()
  await page.locator('#community').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200)
  await page.locator('section[aria-labelledby="opportunities-title"]').screenshot({
    path: `${root}/${name}-opportunities.png`,
  })
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-ready="true"]').waitFor()
  await page.screenshot({ path: `${root}/${name}-hero.png` })
  await context.close()
}

async function record(name, hash, stationaryMs, transition = false) {
  const videoDir = `${root}/video-${name}`
  await mkdir(videoDir, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  })
  const page = await context.newPage()
  const video = page.video()
  await page.goto(`${baseURL}/${hash}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-ready="true"]').waitFor()
  await page.waitForFunction(
    () =>
      document.querySelector('[data-horizon-preview]')?.getAttribute('data-scene-state') ===
      'ready',
    undefined,
    { timeout: 20000 },
  )
  if (transition) {
    await page.locator('#frontiers').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    await page.evaluate(() =>
      window.scrollTo({ top: document.querySelector('#community').offsetTop, behavior: 'smooth' }),
    )
    await page.waitForTimeout(5000)
    await page.evaluate(() =>
      window.scrollTo({ top: document.querySelector('#frontiers').offsetTop, behavior: 'smooth' }),
    )
    await page.waitForTimeout(5000)
  } else {
    await page.locator('#connection').scrollIntoViewIfNeeded()
    await page.waitForTimeout(stationaryMs)
  }
  const source = await video.path()
  await page.close()
  await context.close()
  await rename(source, `${root}/${name}.webm`)
}

async function recordColdLoad() {
  const videoDir = `${root}/video-cold-load`
  await mkdir(videoDir, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
  })
  const page = await context.newPage()
  const video = page.video()
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
  const source = await video.path()
  await page.close()
  await context.close()
  await rename(source, `${root}/cold-load.webm`)
}

try {
  await Promise.all([
    captureLayout('mobile-320', 320, 760),
    captureLayout('mobile-360', 360, 800),
    captureLayout('mobile-390', 390, 844),
    captureLayout('mobile-430', 430, 932),
    captureLayout('mobile-landscape', 844, 390),
  ])
  await record('nebula-stationary-30s', '#connection', 32000)
  await record('nebula-transitions', '#frontiers', 0, true)
  await recordColdLoad()
} finally {
  await browser.close()
}
