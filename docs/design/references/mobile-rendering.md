# iPhone rendering and mobile motion research

Researched 2026-09-07 against browser/library maintainers' documentation and source. Recommendations below are engineering judgments, not claims of physical iPhone testing.

## Safari chrome and safe areas

- WebKit explicitly introduced `theme-color` support in Safari 15 for the iOS **status bar and overscroll area**. Use an opaque, scene-appropriate color supplied in server-rendered head metadata, then update it with the same chapter progression as the scene. Keep `html` and `body` backgrounds intentional so loading, overscroll, and canvas gaps never expose the browser's default white. Theme color is a browser hint, not permission to render arbitrary imagery behind every version of Safari's controls. [WebKit, Safari 15](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/)
- `viewport-fit=cover` expands the layout to the screen edges; important controls must then respect `env(safe-area-inset-top)` and the other safe-area insets. Add those insets to the header and mobile navigation, not as blank padding around the entire cinematic background. Do not disable pinch zoom. [WebKit, Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- `apple-mobile-web-app-status-bar-style=black-translucent` is **not** the normal Safari fix: Apple's documentation says it has no effect without standalone/full-screen web-app mode. It may be configured for an installed experience, alongside the ordinary Safari fixes. [Apple, Supported Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)

## Motion cadence and touch scrolling

- Native scroll can run on a thread separate from animation updates. GSAP's own source documents this and includes Safari-specific immediate-update handling; adding another generic scroll-event debounce can make synchronization worse. Preserve one authoritative scroll progression. [GSAP ScrollTrigger source](https://github.com/greensock/GSAP/blob/master/src/ScrollTrigger.js)
- GSAP's `ignoreMobileResize` logic ignores small height-only changes (below its 25% threshold) on touch-only devices, while preserving width/orientation changes. This is directly relevant to collapsing Safari toolbars: avoid independently rebuilding the camera, postprocessing targets, and master timeline for every transient viewport-height change. Refresh real layout changes and orientation deliberately. [GSAP ScrollTrigger source](https://github.com/greensock/GSAP/blob/master/src/ScrollTrigger.js)
- Lenis defaults `syncTouch` to false and explicitly warns that enabling it may behave unexpectedly on iOS before 16. Keeping native touch scrolling is a defensible choice; desktop smoothing is not automatically a cure for mobile dropped frames. First remove expensive work and excessive lag between scroll and the rendered camera. [Lenis README](https://github.com/darkroomengineering/lenis#settings)
- Lenis documents 30fps in low-power mode. WebKit's animation controller also explicitly schedules animation callbacks according to page throttling and preferred frame intervals. Do not promise 60fps on a power-limited iPhone or infer low-power mode solely from a slow frame interval. Make time-dependent motion use elapsed time, and make the 30fps render limiter tolerant of small callback timing fluctuations rather than accidentally skipping an additional frame near 33.3ms. [Lenis limitations](https://github.com/darkroomengineering/lenis#limitations), [WebKit ScriptedAnimationController](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/dom/ScriptedAnimationController.cpp)
- Recommended mobile entrance treatment: short transform distances and opacity with a deliberate eased settle, retaining the desktop depth treatment on larger screens. Avoid animating large live blur/filter regions over the expensive full-screen canvas. This is a quality/performance recommendation; verify on the actual scene rather than assuming every CSS transform is free.

## Tree edges, pixel density, and GPU budget

- Three.js warns that high-DPI canvas rendering can create excessive GPU load and power consumption; its responsive-rendering guide recommends bounding internal pixel count. Pixel cost scales with **both** dimensions, so a DPR of 3 renders nine times as many pixels as DPR 1. Avoid blindly matching an iPhone's full native DPR. [Three.js responsive rendering](https://threejs.org/manual/en/responsive.html)
- Offscreen render targets have their own `samples` property; zero disables MSAA. Renderer canvas `antialias` alone does not establish a multisampled postprocessing target. Confirm the target used by EffectComposer, and retain modest supported MSAA on mobile rather than compensating solely with a very high DPR. [Three.js RenderTarget source](https://github.com/mrdoob/three.js/blob/dev/src/core/RenderTarget.js)
- `alphaToCoverage` can smooth alpha-tested/clipped edges when MSAA is enabled; it is not a general solution for undersampled opaque geometry or a substitute for adequate drawing-buffer resolution. Use it only where the tree material actually uses alpha clipping. [Three.js Material source](https://github.com/mrdoob/three.js/blob/dev/src/materials/Material.js)
- Initial repository inspection found mobile drawing-buffer DPR capped at 1 and offscreen MSAA at 2 samples. A modest bounded mobile DPR increase should improve small fronds; offset its cost by reducing mobile-only expensive shader iterations/overdraw and avoiding inactive effects. Prefer stable quality tiers and sustained-cost measurements over changing resolution whenever the OS limits callback cadence.

## Visual polish recommendations

- Replace arrow Unicode glyphs in navigation/date controls with small stroke SVGs: this removes platform font/emoji presentation differences entirely.
- Give stacked “Infinite connections” a shared neighboring cool hue family on mobile, preserving the wider blue–purple composition on desktop.
- Add a soft, localized mobile-only dark gradient behind the discovery/oasis text, not a rectangular translucent card. Protect text contrast without recoloring the whole scene.

## Validation limits and checklist

## Implemented verification (2026-09-07)

- `npx playwright test tests/e2e/mobile-rendering.spec.ts --project=mobile --workers=1` initially failed on public arrow glyphs, missing dark browser metadata, and height-only canvas resizing (664 → 780 pixels). All three passed after the fixes.
- Added a frame-clock regression covering 90 consecutive 33.1 ms callbacks and a 60 Hz input stream. The renderer now tolerates early callbacks without accidentally halving its cadence.
- Mobile uses stable large-viewport canvas dimensions, ignores toolbar-only buffer reallocations, avoids inactive DOM-layer updates, and uses opacity/short translation entrances rather than desktop perspective and scale. Native touch inertia is retained.
- Fully occluded underwater pixels skip sky/ocean raymarch work. Four supported MSAA samples and a mobile-only FXAA resolve improve bounded-resolution edges. Hardware frame-rate improvement is not claimed from emulation.
- Added server-rendered dark color-scheme/root backgrounds and viewport-fit with header safe-area padding. SVG icons and a neighboring lavender headline palette remove platform glyph/color differences; discovery text receives a local soft contrast scrim.

Browser emulation can check SVG rendering, viewport overflow, safe-area declarations, animation properties, and responsive colors. It does **not** reproduce an iPhone GPU, Safari browser chrome, thermal throttling, or low-power mode. Final acceptance should include Safari on a physical iPhone: normal/low-power modes, toolbar expanded/collapsed, portrait/landscape, reload/deep link, fast native swipes, and the storm-to-underwater transition. Record frame cadence and sustained GPU cost separately; a compositor-smooth scroll with a late canvas frame still feels disconnected.
