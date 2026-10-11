import { setHeader, type H3Event } from 'h3'

// Bump when the public projection or cache contract changes. No request cookie,
// bearer token, account or workspace value participates in this public cache.
export const PUBLIC_CONTENT_CACHE_VERSION = 'homepage-v5'

export async function publicEtag(value: unknown): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))),
  )
  const hex = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `"${PUBLIC_CONTENT_CACHE_VERSION}-${hex.slice(0, 24)}"`
}

type CachedProjection<T> = { value: T; etag: string; generatedAt: number }

/** Shared per-Cloudflare-colo cache with explicit, bounded stale revalidation. */
export function definePublicProjection<T>(
  name: string,
  load: (event: H3Event) => Promise<T>,
  maxAge: number,
  staleMaxAge: number,
) {
  const scope = (event: H3Event) => useRuntimeConfig(event).public.supabaseUrl || 'local-defaults'
  // Nitro coalesces concurrent misses in one isolate. The Cache API below also
  // survives separate isolates; HTTP caching headers alone cannot do that.
  const local = defineCachedFunction(
    async (event: H3Event): Promise<CachedProjection<T>> => {
      const value = await load(event)
      return { value, etag: await publicEtag(value), generatedAt: Date.now() }
    },
    {
      name: `public-${name}`,
      getKey: (event: H3Event) => `${PUBLIC_CONTENT_CACHE_VERSION}:${scope(event)}`,
      maxAge,
      swr: false,
    },
  )
  return async (event: H3Event): Promise<T> => {
    const cache = (globalThis.caches as (CacheStorage & { default?: Cache }) | undefined)?.default
    const config = useRuntimeConfig(event)
    const key = new URL(
      `/__public-cache/${PUBLIC_CONTENT_CACHE_VERSION}/${name}`,
      config.public.siteUrl,
    )
    key.searchParams.set('source', scope(event))
    const request = new Request(key, { method: 'GET' })
    const stamp = (entry: CachedProjection<T>, state: string) => {
      setHeader(event, 'ETag', entry.etag)
      setHeader(event, 'Age', Math.max(0, Math.floor((Date.now() - entry.generatedAt) / 1000)))
      setHeader(event, 'X-Matrix-Cache', state)
      return entry.value
    }
    const refresh = async () => {
      const entry = await local(event)
      if (cache) {
        // Cloudflare's Cache API does not implement stale-while-revalidate.
        // Retain the envelope for the bounded stale window and enforce its
        // freshness ourselves. Failure defaults never enter this store.
        await cache
          .put(
            request,
            Response.json(entry, {
              headers: { 'Cache-Control': `public, max-age=${maxAge + staleMaxAge}` },
            }),
          )
          .catch(() => {})
      }
      return entry
    }
    const cached = await cache?.match(request).catch(() => undefined)
    if (cached) {
      try {
        const entry = (await cached.json()) as CachedProjection<T>
        if (!entry || typeof entry.generatedAt !== 'number' || !entry.etag)
          throw new Error('Invalid public projection cache entry')
        const age = (Date.now() - entry.generatedAt) / 1000
        if (age < maxAge) return stamp(entry, 'HIT')
        if (age < maxAge + staleMaxAge && event.context.waitUntil) {
          event.context.waitUntil(refresh().catch(() => {}))
          return stamp(entry, 'STALE')
        }
      } catch {
        if (cache) await cache.delete(request).catch(() => {})
      }
    }
    return stamp(await refresh(), cache ? 'MISS' : 'LOCAL')
  }
}
