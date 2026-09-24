import { createClient } from '@supabase/supabase-js'
import { guideRoutes } from '#shared/data/guides'

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!,
  )

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig(event)
    const root = 'https://matrixfellows.com'
    let slugs: string[] = []
    if (config.public.supabaseUrl && config.public.supabaseAnonKey) {
      const client = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
        auth: { persistSession: false },
        global: {
          fetch: (value, init) => fetch(value, { ...init, signal: AbortSignal.timeout(6000) }),
        },
      })
      const result = await client
        .from('opportunities')
        .select('slug')
        .eq('published', true)
        .eq('suppressed', false)
        .order('slug')
      if (!result.error) slugs = (result.data || []).map((row) => row.slug).filter(Boolean)
    }
    const urls = [
      `${root}/`,
      `${root}/opportunities`,
      `${root}/guides`,
      `${root}/join`,
      ...guideRoutes.map((path) => `${root}${path}`),
      ...slugs.map((slug) => `${root}/opportunities/${slug}`),
    ]
    setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
    setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>`
  },
  { maxAge: 300, swr: true, name: 'public-sitemap' },
)
