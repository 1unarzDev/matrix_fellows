# Initial scene reveal

The first paint is server-rendered and complete. At the opening chapter, an original inline-SVG dune silhouette and warm horizon sit behind the header, hero, meeting summary, and navigation. Other hashes use the shared static atmospheric background rather than briefly painting the desert. These layers are pointer-transparent and never gate navigation.

There is no animated arrival canvas, procedural loading particle system, or percentage. While the opening scene is genuinely pending, one small orbital accent can rotate around a stable Matrix mark. It uses only a compositor transform, remains pointer-transparent, stops as soon as the scene is ready, and becomes static under reduced motion. The desktop accent temporarily occupies the later unexplored-marker area so two orbital motifs never overlap. This retains the calm static horizon while avoiding the former arrangement in which multiple independently animated loaders ran during WebGL compilation.

Scene readiness remains tied to `createWorld` completing its first valid composer frame at the restored scroll/hash position. The WebGL canvas and top-of-page preview then use one 300 ms opacity handoff. There is no minimum duration, scroll reset, or restart during chapter navigation. Deep links keep their chapter copy visible throughout initialization.

Navigation to the static resource routes uses a separately bounded route handoff. After a 110 ms anti-flash delay, a pointer-transparent ink veil adopts the guide library's existing violet/teal atmosphere and reuses the same orbital accent. It leaves on Nuxt's actual `page:finish` event while destination content enters by opacity and at most six CSS pixels of vertical movement. It does not delay a completed route, run WebGL, or impose a minimum display time.

Reduced motion skips WebGL and retains the static treatment. Initialization/context failure does the same. A 12-second watchdog bounds a stalled initialization, while teardown safely ignores late completion and disposes the existing renderer lifecycle.

Initialization yields between import/layout and scene-construction phases. It uses `scheduler.yield()` when available and a real zero-delay timer task otherwise; resolved promises are not treated as paint opportunities. Canvas diagnostics expose import, construction, shader-compilation, and first-scene timings.

Validation: `node scripts/check-scene-loading.mjs` covers delayed initialization, first-frame readiness, reduced motion, and unavailable WebGL. `node scripts/check-slow-start.mjs` exercises throttled cold/warm starts plus early mobile navigation. Neither check represents physical-phone performance.
