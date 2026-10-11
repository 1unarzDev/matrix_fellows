// Only explicit public routes produce indexable pages. Unknown paths
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
  if (
    path === '/login' ||
    path === '/workspace' ||
    path.startsWith('/workspace/') ||
    path === '/dashboard' ||
    path.startsWith('/dashboard/')
  ) {
    setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
    setHeader(event, 'Cache-Control', 'private, no-store')
    setHeader(event, 'Referrer-Policy', 'same-origin')
    return
  }
  if (path.startsWith('/api/')) {
    setHeader(event, 'X-Robots-Tag', 'noindex')
    if (path === '/api/workspace' || path.startsWith('/api/workspace/')) {
      setHeader(event, 'Cache-Control', 'private, no-store')
      setHeader(event, 'Referrer-Policy', 'same-origin')
    }
    return
  }
  if (
    /^\/(?:guides|opportunities)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?\/_payload\.json$/.test(path) ||
    /^(?:\/join|\/meetings|\/privacy|\/terms)\/_payload\.json$/.test(path)
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
    path === '/privacy' ||
    path === '/terms' ||
    /^\/guides\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) ||
    path === '/robots.txt' ||
    path === '/sitemap.xml' ||
    path === '/.well-known/microsoft-identity-association.json' ||
    path.startsWith('/_nuxt/') ||
    path.startsWith('/__nuxt') ||
    path.startsWith('/models/') ||
    path.startsWith('/textures/') ||
    path.startsWith('/og/') ||
    ['/favicon.svg', '/social-card.png', '/constellation-license.txt'].includes(
      path,
    )
  )
    return
  setHeader(event, 'X-Robots-Tag', 'noindex')
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
})
