// Original vector source rasterized for social crawlers that do not support SVG.
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
const browser = await chromium.launch({ args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@550;750&display=swap">${await readFile(new URL('../public/social-card.svg', import.meta.url), 'utf8')}`)
  await page.evaluate(async () => {
    await document.fonts.load('550 78px Manrope')
    await document.fonts.load('750 19px Manrope')
    await document.fonts.ready
  })
  await page.locator('svg').screenshot({ path: new URL('../public/social-card.png', import.meta.url).pathname })
} finally { await browser.close() }
