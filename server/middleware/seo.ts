// This is a one-page site, not a catch-all SPA. Unknown paths must not produce
// hundreds of duplicate homepages. Assets/API keep their own handlers/statuses.
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (['matrixfellows.com', 'www.matrixfellows.com'].includes(url.hostname) &&
      (url.protocol !== 'https:' || url.hostname !== 'matrixfellows.com')) {
    return sendRedirect(event, `https://matrixfellows.com${url.pathname}${url.search}`, 301)
  }
  const path = url.pathname
  if (path.startsWith('/api/')) {
    setHeader(event, 'X-Robots-Tag', 'noindex')
    return
  }
  if (path === '/' || path === '/robots.txt' || path === '/sitemap.xml' ||
      path.startsWith('/_nuxt/') || path.startsWith('/__nuxt') ||
      path.startsWith('/models/') || path.startsWith('/textures/') ||
      ['/favicon.svg', '/social-card.png', '/social-card.svg', '/constellation-license.txt'].includes(path)) return
  setHeader(event, 'X-Robots-Tag', 'noindex')
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
})
