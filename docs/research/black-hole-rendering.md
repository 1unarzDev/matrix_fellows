# Black-hole rendering references

Verified 2026-10-07. Scope: visual and implementation inspiration for the restrained login backdrop, not a replacement for the homepage renderer. No application changes made during this research.

## ScienceClic attribution

[The supplied video](https://www.youtube.com/watch?v=ABFGKdKKKyg) is ScienceClic English’s **“Let's reproduce the calculations from Interstellar”** (26:06). Its black-hole simulation chapter begins at 12:12; wormholes begin at 4:33. The published description links creator [Alessandro Roussel’s official site](https://www.alessandroroussel.com/en), but neither the checked description nor that homepage provides a simulation-source/GitHub download. **No creator-owned public code was verified.** This is not proof that none exists elsewhere. Do not describe unrelated repositories as ScienceClic’s implementation or reuse the video’s artwork without permission.

## Reusable implementations and technical references

| Source                                                                                                                                                                                                                        | What is verified                                                                                                                                                                                               | Reuse / practical limitation                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Eric Bruneton: black_hole_shader](https://github.com/ebruneton/black_hole_shader), [article](https://ebruneton.github.io/black_hole_shader/index.html), [demo](https://ebruneton.github.io/black_hole_shader/demo/demo.html) | WebGL2 renderer of a nonrotating black hole, accretion disk, and stars. Precomputed tables find curved-beam intersections in constant time per pixel; special filtering integrates light over beam footprints. | [BSD-3-Clause](https://github.com/ebruneton/black_hole_shader/blob/master/LICENSE): retain copyright, conditions/disclaimer in redistributed source and distribution materials; no author endorsement. Independent of ScienceClic. Not Kerr/rotating Gargantua. Full demo is more machinery than a login backdrop needs; benchmark rather than assume mobile affordability.    |
| [Bruneton, _A Real-time High-quality Black Hole Shader_ (2020)](https://arxiv.org/abs/2010.08735)                                                                                                                             | Author’s technical paper for that implementation: beam tracing, precomputed intersections, footprint filtering.                                                                                                | Best deeper implementation reference for avoiding iterative per-fragment geodesic integration. Paper availability is not permission to copy arbitrary imagery/assets.                                                                                                                                                                                                          |
| [Pim Schreurs / sirxemic: Interstellar](https://github.com/sirxemic/Interstellar)                                                                                                                                             | Browser wormhole/black-hole demonstration. README explicitly says its curvature effects are “hacked” approximations, not general-relativistic equations.                                                       | [MIT code license](https://github.com/sirxemic/Interstellar/blob/master/LICENSE), copyright 2015 Pim Schreurs: include copyright/permission notice when copying substantial code. README separately credits externally sourced textures; do not assume those assets inherit MIT permission. Independent of ScienceClic. Useful artistic comparator, not scientific validation. |
| [James, von Tunzelmann, Franklin & Thorne, _Gravitational Lensing by Spinning Black Holes in Astrophysics, and in the Movie Interstellar_ (2015)](https://arxiv.org/abs/1502.03808)                                           | Film team’s description of DNGR, curved elliptical ray bundles, Kerr spacetime, and flicker-resistant IMAX rendering.                                                                                          | Primary scientific/artistic reference for disk images wrapping above/below the shadow. This paper does **not** establish an open-source DNGR software release. Not an appropriate runtime architecture to import wholesale into the login page.                                                                                                                                |

## Actionable low-cost direction

The following is an engineering recommendation, **not a claim that ScienceClic uses these shortcuts**:

1. **Flow the disk, not just its outline.** Use disk-plane/polar coordinates and advect a small tileable density texture through angle at a radius-dependent speed. Bruneton’s [DefaultDiscColor](https://github.com/ebruneton/black_hole_shader/blob/master/black_hole/model.glsl) provides a concrete reference: orbital phase advances with `dphi_dt = u_avg * sqrt(0.5 * u_avg)`, and textured particle density shapes emitted light. Its full particle loop need not be copied to obtain coherent shearing motion. Prefer a small number of broad density bands plus fine texture over dozens of fragment-noise octaves.
2. **Share the material between direct and lensed disk images.** The front disk and upper/lower wrapped images should sample one disk field/time; independent rotating ellipses look like disconnected rings. For a fixed decorative composition, analytically mapping screen position to that field is a bounded approximation worth testing. For stronger physical consistency, investigate Bruneton’s precomputed lookup representation rather than hundreds of integration steps per pixel.
3. **Keep silhouettes sharp and glow selective.** Render the shadow/photon-edge coverage at display-appropriate resolution; add soft energy around bright disk regions without globally blurring the image. Use derivative-aware/filtered texture sampling to avoid moving fine bands flickering. Bruneton’s beam-footprint filtering and the DNGR paper are the important antialiasing references, not proof that adding bloom solves aliasing.
4. **Keep the composition restrained.** Dark shadow, gold-white emission, muted violet outer haze, asymmetric density and gentle orbital drift fit the current page. Do not assert exact Doppler physics for a stylized gold/purple shader. The direct disk crossing the shadow’s lower region plus arcing lensed images should remain readable at mobile scale and behind the form.
5. **Measure the bounded alternative.** Compare fixed-time matched crops and short motion captures at phone/iPad CSS size and actual DPR; record rendering dimensions and active frame cadence. Check disk-edge shimmer, repeated texture seams, startup compilation, background pause/resume, and reduced motion. None of these sources constitutes a measured performance pass for Matrix Fellows.

Implementation recommendation: write a small original single-pass shader using one shared flowing disk field and analytic lens-inspired remapping. Keep the verified repositories as references; if substantial code is adopted later, add the relevant notices and audit asset provenance. A physically accurate lookup-table renderer is a separate, benchmarked experiment, not a prerequisite for this decorative login improvement.

## Implementation checkpoint · October 7, 2026

Release `bf52d86` replaces the successful WebGL path's breathing SVG with an
original single-pass shader in `app/lib/scene/access-cosmos.ts`. Disk density is
advected at radius-dependent angular speeds; a periodic angular field avoids an
atan seam. Resolved gold-white emission, a dark shadow, upper/lower lens-inspired
disk images and violet outer material provide the enlarged composition. Fine
bands use derivative-aware attenuation. This is an artistic approximation, not
a numerical Schwarzschild/Kerr solution or ScienceClic/DNGR implementation.
No third-party renderer code or artwork was copied.

Drawing follows available RAF cadence, without throttling the UI ticker. Hidden
tabs stop drawing, reduced motion renders a still frame, and teardown disposes
GPU resources/listeners. WebGL failure retains the vector recovery scene and
usable form. Drawing buffers use actual CSS dimensions and DPR capped at 2;
this is not a claim of native DPR-3 output or measured physical-device 60 fps.

Three visual passes reviewed desktop, mobile and iPad-emulated compositions,
including password preview and successive animation captures. First-pass fine
texture looked fabric-like; lower-frequency bands with analytic coverage were
retained after the second pass. Final crops preserve a sharp shadow and brighter
inner emission without brightening the whole page. Diagnostic captures live at
`/tmp/matrix-dynamic-{pass1,pass2,final}-*.png` and `/tmp/matrix-dynamic-ipad.png`.

Clean isolated production checkout: typecheck/build pass; 225 unit/SQL tests
and 30 Chromium desktop/mobile browser tests pass. Scene tests compare actual
canvas screenshots across time, verify still reduced-motion captures, check
real drawing-buffer dimensions, shader errors and context-loss form recovery.
These are browser/software-GPU regression checks, not physical Safari, thermal,
battery or screen-presentation performance evidence.

Login audit removed the decorative badge and redundant prose, added an animated
Email link/Password switch, provider rows and passkey option. Existing email
link/code functionality remains; password/passkey are disabled previews and
Google/Microsoft respect backend availability. No password/passkey backend,
credentials, Auth policy changes or new OAuth grants were implemented here.

Reproduce against a production preview without custom-domain routes:

```sh
npm run typecheck
npm run build
npx vitest run --maxWorkers=2
TEST_BASE_URL=http://localhost:8798 npx playwright test tests/e2e/login-interface.spec.ts tests/e2e/access-cosmos.spec.ts tests/e2e/workspace.spec.ts --workers=2
```

Next verification: physical iPad Safari and phone motion/heat at normal and
battery-saving settings. Authentication backend integration is a separate next
phase; do not relabel disabled previews as working login methods.
