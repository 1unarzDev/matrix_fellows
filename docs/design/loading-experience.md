# Initial scene reveal

The first paint is server-rendered and complete. At the opening chapter, an original inline-SVG dune silhouette and warm horizon sit behind the header, hero, meeting summary, and navigation. Other hashes use the shared static atmospheric background rather than briefly painting the desert. These layers are pointer-transparent and never gate navigation.

There is no animated arrival canvas, procedural loading particle system, percentage, or orbiting identity mark. The Matrix mark remains stable. This resolves the former overlap in which the static horizon, animated header orbit, and a separately redrawn 2D canvas all ran while the WebGL world was compiling.

Scene readiness remains tied to `createWorld` completing its first valid composer frame at the restored scroll/hash position. The WebGL canvas and top-of-page preview then use one 300 ms opacity handoff. There is no minimum duration, scroll reset, or restart during chapter navigation. Deep links keep their chapter copy visible throughout initialization.

Reduced motion skips WebGL and retains the static treatment. Initialization/context failure does the same. A 12-second watchdog bounds a stalled initialization, while teardown safely ignores late completion and disposes the existing renderer lifecycle.

Initialization yields between import/layout and scene-construction phases. It uses `scheduler.yield()` when available and a real zero-delay timer task otherwise; resolved promises are not treated as paint opportunities. Canvas diagnostics expose import, construction, shader-compilation, and first-scene timings.

Validation: `node scripts/check-scene-loading.mjs` covers delayed initialization, first-frame readiness, reduced motion, and unavailable WebGL. `node scripts/check-slow-start.mjs` exercises throttled cold/warm starts plus early mobile navigation. Neither check represents physical-phone performance.
