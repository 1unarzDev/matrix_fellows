# Initial scene reveal

The server-rendered page includes an original inline-SVG dune preview and warm horizon gradient. Header, copy, and navigation remain available; the preview cannot intercept pointer events. A short illuminated segment travels along the header mark's orbit while the lazy world initializes.

Scene readiness is separate from scroll-controller readiness. `createWorld` reports its first completed composer render, which starts the canvas/preview opacity crossfade and stops the orbit indicator. There is no minimum wait or scroll reset. Reduced motion skips the indicator and WebGL, retaining the static preview. Initialization/context failure also settles on the preview. A 12-second watchdog stops the indicator for stalled initialization; a later successful first frame may still reveal the world.

The CSS animation is a Tailwind theme keyframe; no extra animation loop or loading asset is needed. Teardown clears the watchdog and uses the existing renderer disposal. The indicator does not restart during chapter navigation.

Validation: `node scripts/check-scene-loading.mjs` checks delayed initialization, first-frame readiness, reduced motion, and unavailable WebGL, including visible content and stopped indicators. Typecheck and the 20 unit/database tests pass.
