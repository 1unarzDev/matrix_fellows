# Matrix Fellows art direction

References inspected on 6–7 September 2026. Reference images are not redistributed or used as backgrounds. The website's shader imagery, layout, motion, and identity are original. The palm and desert dressing use the third-party models credited in `asset-licenses.md`.

## Visual references and adaptations

| Chapter / effect            | References                                                                                                                                                                                             | Observations and implementation decisions                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Desert / atmospheric reveal | [Journey — thatgamecompany](https://thatgamecompany.com/journey/), [Three.js Sky](https://threejs.org/examples/webgl_shaders_sky.html)                                                                 | Journey's official key art uses broad dune silhouettes, a luminous distant focal point, backlighting, and almost no visible distant detail. Use those depth cues with an off-axis sun, amber haze, wind-stretched grains, and layered dust. Keep the left side darker for the headline. Sky's sun elevation, forward scattering, and turbidity controls inform the analytic sky/glare treatment.       |
| Oasis composition           | Journey's silhouette economy, [Three.js Ocean](https://threejs.org/examples/webgl_shaders_ocean.html), [Quaternius Ultimate Stylized Nature](https://quaternius.com/packs/ultimatestylizednature.html) | Frame a small grove to the right, at the far edge of the water. The low-poly asset is more recognizable than generic generated fronds. Backlighting, distance, desaturated materials, and hazed shoreline hide detail. The grove fades into atmosphere before the shoreline opens.                                                                                                                     |
| Water / open ocean          | [Three.js Ocean](https://threejs.org/examples/webgl_shaders_ocean.html), [ABZÛ](https://www.abzugame.com/)                                                                                             | The ocean showcase's reflected sun is a strong compositional anchor. Use multi-scale moving wave normals, Fresnel, an analytic reflected sky, bright concentrated highlights, and depth-colored water. ABZÛ informs the contrast between warm surface visibility and a much darker descent. One water function and plane persist while the terrain basin opens and recedes. No water mesh replacement. |
| Deep sea / submersion       | ABZÛ's official underwater imagery, [Three.js volume cloud](https://threejs.org/examples/webgl_volume_cloud.html)                                                                                      | ABZÛ frames a brilliant overhead opening above selective silhouettes and deep blue shadows. Increase left-side light shafts, suspended grains, and darkness around the copy. The cloud demo informs density layering, but a cheaper analytic light field replaces a full 3D volume march. Surface distortion and a brief blue-green glare veil conceal the waterline.                                  |
| Particle continuity         | [Three.js GPU flocking](https://threejs.org/examples/webgl_gpgpu_birds.html), ABZÛ                                                                                                                     | Use persistent particle identity and shader-driven movement. This project does not need flock simulation or a computation texture: analytic seeded trajectories are cheaper and reversible through scroll. Sand, water motes, suspended deep-sea lights, and stars share a single buffer.                                                                                                              |
| Nebula / constellation      | [Webb Cosmic Cliffs — NASA/ESA/CSA/STScI](https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-image/), Three.js volume cloud                                                 | The Webb image combines contrasting blue/copper regions, a sculpted cloud boundary, layered wisps, dark gaps, and a wide range of stellar intensity. Use a diagonal violet/copper/teal density band and sparse bright stars; avoid a uniform purple fog. Domain-warped noise creates the cloud structure. Connections terminate at the same final coordinates as actual particles.                     |

## Oasis water refinement — 7 September 2026

Following the [primary-source water study](./discovery-water-references.md), longer
crossing currents and reduced fine-wave energy make the oasis less repetitive.
The experimental ripple and gathering particles were removed following feedback.
The original camera path and storm/ocean wave parameters are unchanged.

### Desert bank silhouettes

The user-supplied Alto-style sunset reference guides layered depth and negative
space: distant sandstone arch and buttes behind the right grove, sparse sage cacti
and angular bushes on dry banks, and an unobstructed water foreground. Eight small
CC0 Kenney assets are merged into one instanced batch per type (about 58 KiB total
uncompressed asset payload), retaining authored facets without texture downloads.
The existing warm fog, storm lighting, terrain depth and inundation clipping apply
to all additions. Source research is in `oasis-terrain-references.md`.

Central bank placements gather around two loose shared anchors, so palms, reeds,
stones and dry-bank plants form related clusters rather than an evenly scattered
row. Their inland offsets and scale variation remain; the open gap frames the
arch, and the outer shoreline silhouettes are unchanged.

`npx tsx scripts/check-discovery-water.mjs` compiles both modified shaders, captures
contact/expansion/dissolve and a narrow view, and checks that the ripple changes
oasis pixels but not desert/storm/deep-sea pixels. Full-world desktop captures were
also inspected with palms and text present; direct entry and return navigation worked
without console errors. An RTX 4070 Ti SUPER browser run maintained the 30 fps cap;
this is not a physical-phone performance claim.

## Rendering tradeoffs

- The full-screen shader traces an inexpensive heightfield for desert/oasis terrain and evaluates water from the same camera rays. Shared fog and water conceal the expanding basin. Full-ocean rendering skips terrain tracing.
- Water reflects the analytic sky and sun, not all scene objects. The distant palm silhouettes do not require a costly planar reflection render.
- Camera-aligned glare, grain, and depth haze are computed inside the shaders. Three.js UnrealBloomPass adds multiscale HDR bloom before the final exposure curve; only the WebGL world is processed, so DOM text stays sharp. Bloom uses the existing adaptive resolution and its render targets are disposed with the page.
- The deep-sea beams are volumetric-looking analytic fields, not physical participating-media simulation. The nebula uses layered procedural density, not a detailed model.
- Maximum particle count is 12,000 on desktop and 4,200 on mobile, with stable seeded positions. Pixel ratio and draw count reduce under sustained load. The frame loop targets 30 fps.
- All DOM presentation uses Tailwind utilities. The CSS entry contains only the Tailwind import and theme tokens.
- The analytic world writes perspective-correct depth, retained by the model pass, so dunes occlude the grove. The HDR render targets use up to 4× MSAA on desktop and 2× on mobile; palm cutouts use alpha-to-coverage. This avoids blurring DOM typography.

## Visual iteration record

1. Captured all six chapter positions at 1440 × 960. Improved desert wind streaks/haze, strengthened underwater light shafts, and increased nebula density after comparison with references.
2. The first oasis read as open ocean. Added a licensed 380 KB palm GLB and corrected the FBX child rotation to match its source prefab; the grove now gives the reveal a recognizable scale cue.
3. Added a dark gradient through research rows to preserve reading contrast over moving sunlight. Removed a visible rectangular tint behind the discovery text.
4. Verified the compact mobile typography and navigation at 390 × 844. Screenshots and measured frame data can be regenerated with `npm run capture`.

The implementation is an original, performance-conscious interpretation of these references, not a claim of production-VFX equivalence. Physical midrange-phone profiling remains a deployment acceptance check; desktop GPU and mobile viewport emulation are available locally.

## Revision — 7 September 2026

Revisited Journey's foreground ridges, the Three.js ocean highlights, and ABZÛ's dense schooling silhouettes before this revision. [Evan Wallace's WebGL Water](https://madebyevan.com/webgl-water/) provides an additional technical reference for combining displacement, refraction, and depth cues; no source code was copied.

- Replaced the opaque mobile navigation and individually colored tabs with a frosted, saturating glass surface and a single sliding pill. Six equal-width destinations keep the pill aligned during viewport changes. Reduced motion disables its travel animation.
- The shared accent now follows continuous scene progression: golden sand → tropical mint → ocean blue → underwater cyan → nebula violet. All existing Tailwind accent utilities inherit the animated token.
- Replaced the low terrain with asymmetric dune crests, windward/lee color differences, mineral variation, and wind ripples. The basin exists behind a tall foreground ridge from the start. The revised crest camera rises to 11 units, looking toward the grove rather than straight down at a circular pool, then descends to 4.4 units over the oasis.
- Following the palette corrections, restored Journey-inspired sand and then softened the overpowering yellow toward amber-orange, with warm brown shadows and less yellow scattering. The sun transitions from an amber limb to a cream core with moving atmospheric attenuation. Camera-projected glare, a horizontal streak, a faint lens ghost, and HDR bloom make it luminous without tinting the entire desert red.
- Water now combines seven differently oriented, domain-warped wave octaves, analytic slopes, displaced ray intersections, depth-dependent absorption, shoreline caustics/foam, layered sun highlights, and distance-filtered detail. Before ocean expansion it is bounded to the oasis basin. An exhausted terrain march is not treated as clear line of sight; near-surface samples are shaded conservatively. Wave correction is bounded and its resulting intersection rechecked against terrain depth and elevation.
- The final oasis-to-ocean transition is a thunderstorm-driven flood. Terrain and model positions remain fixed. The first two units of water rise happen against a steady-height camera, so the banks do not slide down the frame. A dense rain curtain hides the grove before the remaining rise and camera elevation. Turbulent foam stays low in frame; submersion happens only in the later intentional dive. There is no shoreline dilation or tree translation.
- A rippling waterline sweeps across the camera, distorting the view and catching light before giving way to overhead light and darkness. School particles are clipped against that waterline.
- The existing particle field becomes one broad, coordinated school underwater, then rejoins the star positions. Continuous thickness and depth replace discrete lanes. A restrained cyan-to-blue gradient follows the current rather than random per-fish colors. School width responds to the viewport; soft halos and brightness fall on the text side of the frame.
- Removed the rectangular story overlays. Content layers and individual project rows enter and recede with perspective, rotation, translation, and opacity driven from the same master ScrollTrigger. Community content shares the choreography; its background gradually settles to ink. Reduced motion clears spatial transforms.

Intermediate captures at progression 0.6 (crest) and 2.4 (waterline) were inspected alongside full chapter captures. Navigation, direct links, project expansion, and reduced-motion/WebGL fallback checks continue to pass.

The closing invitation replaces the solid accent-colored banner with a midnight-blue surface, restrained cool illumination, ice-blue/lilac headline, generous spacing, and a light action button when a membership URL is configured. The unconfigured state remains clearly labeled “Membership opens soon.” Desktop and 390-pixel mobile layouts were visually checked.

### Oasis composition and reveal

Inspected the official [Alto’s Odyssey](https://www.altosodyssey.com/) “Palm Kicker” and “Water Dive” screenshots for clustered vegetation, banks framing water, foreground/background separation, and varied palm heights. Combined these composition cues with the Three.js ocean reflections rather than copying the illustrated style.

The oasis now has an irregular, raised shoreline, nine shared-asset palms, 38 embedded stones, and 640 instanced grass/reed blades in 32 clumps. Leaves use shader-driven wind; the sand no longer transitions to green. The small palm asset starts loading with the already-lazy world, instead of being requested midway into the reveal. The dressing lives in `app/lib/scene/oasis.ts`, shares the terrain GLSL for grounding, and disposes its geometries, materials, and textures on teardown. Hero copy/details recede before the crest, and discovery copy waits until the reveal has had a clear visual beat.

### Storm and flood

The subsequent deep sea revisits ABZÛ's layered-school composition, relying on coordinated currents, suspended particles, and light shafts. The experimental jellyfish have been removed. The community section preserves a dim view of the nebula, complemented by broad violet/teal background accents that visually connect the closing invitation to its surroundings.

Inspected the Three.js r130 `webgl_lightningstrike` Storm showcase for branching bolts, localized glow, and cloud illumination. The implementation uses original analytic cloud fields and seeded lightning paths, not the showcase geometry. Time-driven strikes continue at a stationary scroll position, with one event per seven-second window and varied timing/branching. Illumination is localized rather than a full-screen white flash; reduced-motion mode keeps WebGL disabled.

Storm cloud cover and rainfall have separate envelopes. Clouds remain fully overcast through submersion, preventing the sun from returning before the dive. Rain diminishes at the waterline, is clipped above the surface, and is absent underwater. Flood-relative camera/particle heights preserve the subsequent deep-sea choreography.

The storm ocean adds two long-period swell directions beneath the fine wave layers. A bounded ray march and bisection resolve large crest silhouettes, including rays above the mean-water horizon. Broad-wave normals remain intact at distance while micro-detail is filtered; reduced water haze preserves distant contrast. Swells grow beyond the immediate camera area to avoid introducing another premature dive. Oasis materials remain present through the flood and clip below the actual mean water level, with wave-depth occlusion covering them from the camera instead of an early opacity fade.
