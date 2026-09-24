# Minh Pham interaction: localized reveal study

Research date: 2026-09-23. This is a first-party interaction study for the
Discovery chapter. It describes transferable mechanics, not permission to copy
the reference site's code, writing, or artwork. Desktop observations used a
1440 x 900 Playwright browser; mobile observations used iPhone 13 browser
emulation, not physical hardware.

## What the reference actually does

- [The live Minh Pham site](https://minhpham.design/) renders a normal dark page
  and a second, alternate red version of the page. The alternate layer contains
  corresponding text in the same positions, so the moving circle feels like a
  lens revealing another interpretation of the same composition rather than a
  tooltip placed over it.
- The site's [published stylesheet](https://minhpham.design/app.css?v=1.0.0.3)
  makes that alternate layer absolutely positioned, non-interactive, and visible
  through a CSS mask. Its mask image is a simple circle supplied by the site's
  [published mask SVG](https://minhpham.design/assets/icons/test-mask.svg). The
  layer is not a rounded card: the circle itself is the only visible boundary.
- The site's [published interaction bundle](https://minhpham.design/app.bundle.js?v=1.0.0.3)
  moves the mask with the pointer, interpolates its position, and animates its
  diameter. At a 1440-pixel viewport, the observed resting lens was about 33
  pixels wide and expanded to about 375 pixels over the main hero copy. The
  diameter eases outward over roughly 600 ms; interactive links contract it in
  roughly 300 ms. Pointer sampling confirmed a slight trailing response rather
  than a rigid attachment, and the mask's vertical position includes scroll
  offset so the two layers remain registered while the page moves.
- The reveal continues across the composition instead of being clipped to the
  hovered text element. This spatial continuity is the important quality in the
  reference: the hover target influences the lens size, but does not draw a box
  around the effect.
- On the emulated touch layout, the cursor lens is replaced by a fixed 78 x 78
  bottom-center control with a slowly rotating text ring. The reference requires
  a roughly 500 ms hold, expands the alternate
  layer across the viewport in about 800 ms, and collapses it on release in about
  600 ms. Its source listens for `touchstart` and `touchend`, but exposes neither
  a cancellation path nor an accessible name/pressed state in the published
  markup. Matrix Fellows should adopt the visual principle, not this mobile
  interaction or its accessibility shortcomings. The site's first-party
  [touch icon](https://minhpham.design/assets/icons/ic-touch.svg) and
  [ring asset](https://minhpham.design/assets/icons/ic-text-ring.svg) were
  inspected only to establish this behavior and must not be reused.

## Why the current Matrix treatment feels boxed in

The current `DiscoveryReveal.vue` puts the effect on a `max-w-xl` element with a
large border radius, adds a bordered gradient panel, expands the clip until it
covers that rectangle, and fades all of the original copy away. Those choices
read as a card hover/state swap. They remove the two features that make the
reference feel like an x-ray: the original and alternate states remain spatially
registered, and only the lens-local portion changes.

## Original Matrix adaptation

1. Make the **Discovery section**, not the copy box, the reveal plane. Keep the
   text as the activation target, but place a non-interactive alternate layer
   across a generous section-sized region. Do not give that layer a border,
   rounded rectangle, or opaque panel. The circular falloff should be its only
   edge.
2. Keep the original heading and paragraphs visible. Align a shorter alternate
   heading/message to the same typographic anchors and reveal only the fragment
   under the lens. Avoid fading the entire normal state on pointer entry.
3. Start with a quiet 8-16 px warm point and expand toward a responsive radius of
   roughly `clamp(105px, 14vw, 210px)`. Smooth the center toward the pointer and
   ease radius separately so the lens trails gently rather than sticking to raw
   pointer samples. Let the soft falloff extend beyond the copy without exposing
   a rectangular clipping edge.
4. Style the lens as Discovery, not as the reference: muted sun-gold refraction,
   a small cooler inner highlight borrowed from the water, slightly clarified
   local contrast, and perhaps 6-10 deterministic dust/pollen motes near the
   perimeter. Motes should drift only while the interaction is active, remain
   subordinate to the words, and dissolve with the lens. Do not add another
   particle canvas or a global animation loop.
5. Keep the alternate content concise. A useful reveal is a second thought about
   trying unfamiliar things, not a second full section competing with the primary
   explanation. Preserve readable contrast at every partial mask position.
6. On coarse pointers, use one deliberate tap to expand/toggle the reveal and a
   second tap to restore it. Keep native vertical scrolling untouched: do not
   call `preventDefault()` on touch movement and do not trigger from incidental
   scroll contact. A real button should expose an accessible name and
   `aria-pressed`; Enter and Space should perform the same toggle. The
   [WAI-ARIA button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
   specifies keyboard activation and the meaning of `aria-pressed` for toggles.
7. Fine-pointer focus should expose the same idea without requiring a mouse.
   Under
   [`prefers-reduced-motion`](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion),
   switch states immediately, omit motes and cursor lag, and retain the normal
   copy as the default. Do not make essential content available only through the
   visual mask.

## Performance and verification guardrails

- Do not duplicate the full homepage as the reference does. Duplicate only the
  small, aligned Discovery treatment and keep the alternate layer
  `pointer-events: none`. This preserves Matrix Fellows' existing single-world
  renderer and avoids a document-sized animated mask.
- Prefer one existing RAF owner (or a RAF scheduled only while the interaction
  is active) for pointer interpolation. Pointer events should only update a
  target coordinate; they should not perform layout reads and writes on every
  sample. Cache the section bounds on entry/resize.
- A CSS circle mask or `clip-path: circle()` is a valid starting point, but
  compositing is an outcome to verify, not an assumption. The
  [CSS Masking specification](https://www.w3.org/TR/css-masking-1/) defines both
  masking and clipping; profile paint/composite behavior on Safari and the
  budget Android path before choosing between them.
- Seed any particles once, cap their count by quality tier, pause them when the
  chapter is inactive, and remove them for reduced motion. Integrating a tiny
  accent into the existing scene/particle system is preferable to introducing a
  second continuously redrawn surface.
- Capture the lens at the copy center, beyond the copy edge, and while leaving
  the target. There should be no rectangular edge, abrupt text replacement, or
  stuck state. Test keyboard focus, repeated touch toggles, scroll-versus-tap,
  reverse chapter scrolling, direct `#discovery` entry, 320-430 px layouts, and
  physical iOS Safari when available.

The recommended text, palette, particle behavior, dimensions, and accessibility
behavior are original Matrix Fellows guidance inferred from the reference's
spatial technique; they are not claims about the reference site's design system.
