import { chromium } from '@playwright/test'
import { setup } from '../tests/fixtures/dashboard-browser'

// Explicit browser-only fixture harness. No production demo flag, auth bypass,
// provider credentials, or application route is created by this script.
const base = process.env.TEST_BASE_URL || 'http://localhost:3012'
const url = new URL(base)
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  throw new Error('The synthetic preview only runs against a local server.')
const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const page = await context.newPage()
await setup(page)
await page.goto(`${base}/dashboard?section=today`)
console.log(
  'Synthetic preview open. Saves last for this preview session only; no live discovery, mailbox, or database is used. Close the browser to exit.',
)
await new Promise<void>((resolve) => browser.once('disconnected', resolve))
await browser.close().catch(() => {})
