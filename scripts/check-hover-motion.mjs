import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const browser = await chromium.launch({ args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  // Isolate UI motion from the GPU scene; use the real page and compiled styles.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : original.call(this, type, ...args)
    }
  })
  await page.goto('http://localhost:3000')
  await page.locator('[data-ready="true"]').waitFor()
  for (const selector of ['header a.tactile', 'a.tactile.group.rounded-xl']) {
    const button = page.locator(selector).first()
    await button.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1100)
    await button.hover()
    const sample = await button.evaluate((element) => {
      const style = getComputedStyle(element)
      const animation = element.getAnimations().find((a) => a.transitionProperty === 'scale')
      if (!animation)
        return { property: style.transitionProperty, scale: style.scale, animated: false }
      animation.pause()
      const duration = Number(animation.effect.getTiming().duration)
      const scales = [0, 0.25, 0.5, 1].map((t) => {
        animation.currentTime = duration * t
        return parseFloat(getComputedStyle(element).scale)
      })
      animation.finish()
      return { animated: true, duration, scales }
    })
    console.log(JSON.stringify(sample))
    assert.ok(sample.animated, 'Hover scale jumps: no CSS scale transition exists')
    assert.ok(sample.duration >= 800, 'Hover growth is too fast')
    assert.ok(sample.scales[1] > sample.scales[0] && sample.scales[1] < sample.scales[2])
    assert.ok(sample.scales[2] < sample.scales[3], 'Growth finishes before the curve completes')
    await page.mouse.move(0, 0)
    const exit = await button.evaluate((element) => {
      getComputedStyle(element).scale
      const animation = element.getAnimations().find((a) => a.transitionProperty === 'scale')
      if (!animation) return null
      animation.pause()
      const duration = Number(animation.effect.getTiming().duration)
      animation.currentTime = duration * 0.5
      const middle = parseFloat(getComputedStyle(element).scale)
      animation.finish()
      return { duration, middle, end: parseFloat(getComputedStyle(element).scale) || 1 }
    })
    console.log(JSON.stringify({ selector, exit }))
    assert.ok(exit && exit.duration >= 800 && exit.middle > exit.end, 'Hover-out snaps back')
  }
} finally {
  await browser.close()
}
