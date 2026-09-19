# Performance optimization sources

Checked against primary documentation on 2026-09-19. This note applies the
current Nuxt 4.5.2, Nitro 2.13.4, Three.js r180, and Cloudflare Workers setup in
this repository. It records implementation guidance, not measured gains; each
change still needs a before/after production-profile or physical-device result.

## Recommended order

1. **Add renderer measurements, then precompile shaders.** `renderer.info` is a
   stable, read-only way to count draw calls, primitives, textures, geometries,
   and programs. Because this site uses multiple render passes, set
   `info.autoReset = false` and reset once per logical frame or the default
   per-`render()` reset will undercount the frame. Once startup stalls are
   measured, use `compileAsync(scene, camera)` after the scene's lighting and
   environment are final and before revealing WebGL. Three.js recommends the
   asynchronous form where possible; it uses `KHR_parallel_shader_compile` and
   resolves when the scene can render without avoidable shader-compilation
   stalls. On implementations without that extension, Three.js cannot query
   non-blocking completion and first use can still stall. This does not replace
   testing: later material defines, lights, or render-target variants can still
   create new programs. These counters are not GPU timings or byte-accurate VRAM
   measurements, so retain the existing CPU/callback timings too.
   ([WebGLRenderer.info](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.info),
   [compile/compileAsync](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.compileAsync),
   [r180 implementation](https://github.com/mrdoob/three.js/blob/r180/src/renderers/WebGLRenderer.js#L1394-L1461))

2. **Self-host the two fonts at build time.** Replace the render-blocking Google
   stylesheet with `@nuxt/fonts`, explicitly limiting families, normal styles,
   weights/ranges, and subsets to those the CSS actually uses. The module
   rewrites provider URLs under `/_fonts`, downloads the files during the build,
   emits hashed local assets with long-lived headers, and generates
   metric-adjusted local fallback faces when metrics are available. That removes
   the runtime Google origins and reduces fallback-to-web-font layout shift.
   Preserve the current build-failure behavior for unresolved fonts and cache
   `node_modules/.cache/nuxt/fonts` in CI. Font discovery, self-hosting, fallback
   metrics, and the metric override descriptors are documented features;
   `variableAxis` is separately marked experimental and is unnecessary for the
   first pass.
   ([how Nuxt Fonts works](https://fonts.nuxt.com/advanced#how-it-works),
   [fallback configuration](https://fonts.nuxt.com/get-started/configuration#fallbacks),
   [preload behavior](https://fonts.nuxt.com/get-started/configuration#preload),
   [metric overrides](https://fonts.nuxt.com/get-started/configuration#ascentoverride-descentoverride-linegapoverride-and-sizeadjust))

3. **Cache the public content computation inside Nitro.** The page already uses
   `useFetch('/api/content')`, which is the correct SSR path: an internal
   server-side fetch directly invokes the API handler without an HTTP round trip,
   and Nuxt transfers its result in the payload rather than fetching it again on
   hydration. Raw component `$fetch` would run once on the server and again in
   the browser. Keep `useFetch`; optimize the handler's three Supabase reads with
   a cached function or successful-response cached handler instead.
   ([direct API calls](https://nuxt.com/docs/4.x/guide/concepts/server-engine#direct-api-calls),
   [`$fetch` SSR behavior](https://nuxt.com/docs/4.x/api/utils/dollarfetch),
   [`useFetch` payload transfer](https://nuxt.com/docs/4.x/api/composables/use-fetch))

   Nitro's cache APIs are stable, but their safety details matter here:

   - set an explicit `maxAge` (the default is only one second) and opt into
     bounded SWR only if stale public content is acceptable;
   - cache only validated successful content, never the handler's `unavailable`
     fallback, and retain `no-store` on failures;
   - prefer a cached function if publication should be invalidatable on demand;
     cached functions expose invalidation while cached handlers currently do not;
   - pass the H3 event as the first cached-function argument on edge runtimes so
     Nitro can attach background refresh to `waitUntil`; and
   - configure a persistent/shared `cache:` storage mount if cross-isolate hits
     are expected. Nitro's default cache storage is in-memory and does not survive
     process/Worker-instance replacement.

   Cached handlers narrow requests to the cache key: query values, cookies,
   authorization, and most headers are removed unless explicitly allowed or
   varied. That is useful for this public endpoint, but makes the same mechanism
   unsafe as a casual wrapper around authenticated endpoints.
   ([Nitro cached handlers/functions and edge guidance](https://nitro.build/docs/cache),
   [portable server imports](https://nuxt.com/docs/4.x/guide/going-further/server-imports#what-isnt-portable))

4. **Use delayed hydration only for measured, non-critical interactivity.** Nuxt
   4's lazy-hydration strategies (`visible`, `idle`, `interaction`, media query,
   time, condition, and never) are enabled by default and built on Vue hydration
   strategies. They are reasonable for extracted below-the-fold widgets, but not
   for above-the-fold navigation or content. The integration still lives under
   `experimental.lazyHydration` and has constraints: SFC-only, a hydration prop
   must appear directly in the template, direct `#components` imports do not
   work, and changing other props forces hydration. The existing Join and Admin
   dialogs already get the larger win—lazy chunks that are instantiated only
   when opened—so do not restructure the monolithic page without a profile that
   identifies hydration as a remaining bottleneck.
   ([Nuxt delayed hydration](https://nuxt.com/docs/4.x/directory-structure/app/components#delayed-or-lazy-hydration),
   [`lazyHydration` feature flag](https://nuxt.com/docs/4.x/guide/going-further/experimental-features#lazyhydration))

5. **Evaluate full-page caching last and canary it.** Cloudflare Static Assets
   are automatically cached in Cloudflare's tiered asset cache and send
   `Cache-Control: public, max-age=0, must-revalidate` plus a content-hash `ETag`
   to browsers by default. A `public/_headers` rule can give fingerprinted assets
   a one-year immutable browser lifetime, but `_headers` applies only to
   responses served as Static Assets—not SSR or other Worker-generated
   responses. SSR headers must be set by the Worker/Nitro response. Keep the
   default asset-first routing; `assets.run_worker_first` makes matching asset
   requests execute Worker logic and can add latency.
   ([Static Assets caching](https://developers.cloudflare.com/workers/static-assets/#caching-behavior),
   [default/custom headers](https://developers.cloudflare.com/workers/static-assets/headers/),
   [asset binding and routing](https://developers.cloudflare.com/workers/static-assets/binding/#run_worker_first))

   Current Workers Cache can sit in front of a Worker when `cache.enabled` is set
   and can avoid the Worker invocation entirely for cacheable `GET`/`HEAD`
   responses. The official surface is not labeled experimental, but it requires
   Wrangler 4.69.0 or newer (per-entrypoint and cross-version controls require
   4.107.0); this checkout currently resolves Wrangler 4.129.0. It is tiered and
   request-collapsing, but remains a newer operational surface with material
   constraints: response headers control cacheability;
   omitted `Cache-Control` can be cached heuristically (a `200` defaults to two
   hours); `Set-Cookie` responses and authorized requests bypass; query strings
   are part of the key; new Worker versions use cold, isolated caches by default;
   and current response-size and purge limits use Free-plan limits. Cache API
   (`caches.default`) is a different, data-center-local primitive, does not use
   tiered cache or request collapsing, and does not support
   `stale-while-revalidate` through `put`/`match`.
   ([Workers Cache overview](https://developers.cloudflare.com/workers/cache/),
   [configuration and version gates](https://developers.cloudflare.com/workers/cache/configuration/#enable-caching),
   [limitations](https://developers.cloudflare.com/workers/cache/limitations/),
   [Cache API limits](https://developers.cloudflare.com/workers/runtime-apis/cache/))

   The root page appears publicly shareable today, but whole-page caching is not
   yet a safe first change. Its internal `/api/content` failure switches that API
   response to `no-store`, while the outer SSR HTML response does not currently
   inherit a failure-aware policy. A full-page cache could therefore preserve
   fallback HTML after Supabase recovers. Before enabling it, make the outer page
   explicitly `no-store` when content is unavailable, explicitly `no-store` all
   authenticated/mutation routes, define query-key policy, choose a short bounded
   freshness window, and verify `CF-Cache-Status`, deploy invalidation, preview,
   and rollback behavior. Never use a broad Cache Rule that caches all HTML:
   Cloudflare warns that dynamic HTML can expose one visitor's information to
   another.
   ([Cache Everything warning](https://developers.cloudflare.com/cache/how-to/cache-rules/examples/cache-everything/),
   [cache-poisoning guidance](https://developers.cloudflare.com/cache/cache-security/avoid-web-poisoning/))

## Experimental or defer

- **Nuxt server components/islands:** explicitly experimental in Nuxt 4. They
  create isolated Vue apps, cannot share ordinary page state, serialize props in
  GET query parameters, and add an island request on client navigation. Selective
  `nuxt-client` hydration is experimental too. The current one-page public site
  is a poor first candidate; test the more mature, default-on delayed hydration
  before islands.
  ([server components](https://nuxt.com/docs/4.x/guide/concepts/server-components),
  [`componentIslands`](https://nuxt.com/docs/4.x/guide/going-further/experimental-features#componentislands))
- **Cross-version Workers caching:** improves hit rate across deploys but removes
  deployment-as-invalidation. Defer until purge-by-tag/path is automated and
  exercised.
- **Nuxt Fonts variable-axis instancing/subsetting:** explicitly experimental;
  begin with provider-hosted variable files or exact static faces and measure the
  emitted payload.

## Verification gates

- Record WebGL startup duration, first-frame time, program count, draw calls, and
  triangles per logical frame before and after `compileAsync`; keep the physical
  iPhone/Safari test required by the performance contract.
- Inspect the production HTML/CSS and Network panel: no request to
  `fonts.googleapis.com` or `fonts.gstatic.com`, only required faces emitted, no
  new CLS, and hashed font assets receive the intended immutable header.
- Prove content-cache miss/hit/stale/failure cases, concurrent-request
  deduplication, and publication invalidation. Confirm a failed Supabase read is
  never stored as healthy content.
- If full-page caching is trialed, test anonymous, query-string, authentication,
  error, preview, new-deploy, and rollback requests while recording
  `CF-Cache-Status`, `Age`, `Cache-Control`, `Vary`, and any `Set-Cookie` header.
