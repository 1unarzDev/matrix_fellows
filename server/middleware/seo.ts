// Only the homepage and explicit catalog/guide routes are public pages. Unknown paths
// must not produce duplicate SSR documents.
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (
    ['matrixfellows.com', 'www.matrixfellows.com'].includes(url.hostname) &&
    (url.protocol !== 'https:' || url.hostname !== 'matrixfellows.com')
  ) {
    return sendRedirect(event, `https://matrixfellows.com${url.pathname}${url.search}`, 301)
  }
  const path = url.pathname
  if (path.startsWith('/api/')) {
    setHeader(event, 'X-Robots-Tag', 'noindex')
    return
  }
  if (
    /^\/(?:guides|opportunities)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?\/_payload\.json$/.test(path) ||
    /^(?:\/join|\/meetings)\/_payload\.json$/.test(path)
  ) {
    setHeader(event, 'X-Robots-Tag', 'noindex')
    return
  }
  if (
    path === '/' ||
    path === '/opportunities' ||
    /^\/opportunities\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) ||
    path === '/guides' ||
    path === '/meetings' ||
    path === '/join' ||
    /^\/guides\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) ||
    path === '/robots.txt' ||
    path === '/sitemap.xml' ||
    path.startsWith('/_nuxt/') ||
    path.startsWith('/__nuxt') ||
    path.startsWith('/models/') ||
    path.startsWith('/textures/') ||
    path.startsWith('/og/') ||
    ['/favicon.svg', '/social-card.png', '/social-card.svg', '/constellation-license.txt'].includes(
      path,
    )
  )
    return
  setHeader(event, 'X-Robots-Tag', 'noindex')
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
})
