import assert from 'node:assert/strict'
import { parse } from 'node-html-parser'
import { XMLParser } from 'fast-xml-parser'

const base = process.env.TEST_BASE_URL || 'https://matrixfellows.com'
const canonical = 'https://matrixfellows.com/'
const response = await fetch(base)
assert.equal(response.status, 200)
const html = parse(await response.text())
assert.match(html.querySelector('title').text, /Matrix Fellows.*Research.*Martin/)
assert.equal(html.querySelectorAll('link[rel="canonical"]').length, 1)
assert.equal(html.querySelector('link[rel="canonical"]').getAttribute('href'), canonical)
assert.ok(!html.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex'))
assert.equal(html.querySelectorAll('h1').length, 1)
assert.match(html.querySelector('main').text, /Martin High School/)
assert.match(html.querySelector('main').text, /CRANE/)
assert.match(html.querySelector('main').text, /science fair/i)
const schema = JSON.parse(html.querySelector('script[type="application/ld+json"]').text)
assert.ok(schema['@graph'].some(item => item['@type'] === 'Organization' && item.url === canonical))
const image = html.querySelector('meta[property="og:image"]').getAttribute('content')
assert.equal(new URL(image).origin, new URL(canonical).origin)
assert.match((await fetch(image)).headers.get('content-type'), /^image\//)
const robotsResponse = await fetch(`${base}/robots.txt`)
assert.match(robotsResponse.headers.get('content-type'), /text\/plain/)
const robots = await robotsResponse.text()
assert.match(robots, /Sitemap: https:\/\/matrixfellows.com\/sitemap.xml/)
const sitemapResponse = await fetch(`${base}/sitemap.xml`)
assert.match(sitemapResponse.headers.get('content-type'), /xml/)
const sitemap = new XMLParser().parse(await sitemapResponse.text())
assert.equal(sitemap.urlset.url.loc, canonical)
for (const path of ['/not-a-real-matrix-page', '/not-a-real-page.html']) {
  const missing = await fetch(`${base}${path}`)
  assert.equal(missing.status, 404, path)
  assert.match(missing.headers.get('x-robots-tag'), /noindex/)
}
const api = await fetch(`${base}/api/content`)
assert.equal(api.status, 200)
assert.match(api.headers.get('x-robots-tag'), /noindex/)
if (base === 'https://matrixfellows.com') {
  const insecure = await fetch('http://matrixfellows.com/', { redirect: 'manual' })
  assert.equal(insecure.status, 301)
  assert.equal(insecure.headers.get('location'), canonical)
}
console.log('PASS: server-rendered content, metadata, schema, social image, robots, sitemap, 404s and API indexing rules')
