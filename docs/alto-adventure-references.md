# Alto’s Adventure: palette and atmospheric layering

Reference study: 2026-09-07. This note informs original Matrix Fellows shaders; no game artwork is incorporated into the website.

## Primary sources

- [Official Alto’s Adventure site](https://www.altosadventure.com/) supplies the screenshot gallery below and identifies the game as a snowboarding adventure. It links to **Alto’s Odyssey** as a separate next adventure. Adventure’s alpine scenes, not Odyssey’s desert scenes, are the principal reference for this pass.
- [Snowman’s official Adventure press kit](https://builtbysnowman.com/press/sheet.php?p=altos_adventure) describes an ever-changing alpine landscape, dynamic lighting/weather, procedurally generated terrain, and “beautifully minimalist and evocative visual design.” Its feature list explicitly includes thunderstorms, blizzards, fog, rainbows, and shooting stars.

## Direct visual observations

These are art-direction observations from the first-party screenshots, not claims about the game’s internal rendering implementation. Approximate palette descriptions are interpretive rather than sampled brand specifications.

| Screenshot | Observed color and composition | Matrix Fellows translation |
| --- | --- | --- |
| [Dawn](https://www.altosadventure.com/resources/screenshots/2_Dawn.png) | Peach/cream localized solar light, dusty rose/mauve atmosphere, muted sienna foreground. Multiple overlapping ridges become paler with distance. Small silhouettes give scale without detail clutter. | Oasis gets warm horizon light behind muted mauve distant mesas. Keep shoreline sand warm and water selectively turquoise; avoid one uniform yellow or green grade. |
| [Night](https://www.altosadventure.com/resources/screenshots/4_Night.png) | Inky blue foreground frames layered slate-blue peaks. A localized pale-cyan glow supplies the focus; stars remain sparse. Distinct terrain layers make the dark scene readable. | Underwater gets framing navy canyon/reef silhouettes, distant teal/slate strata, and cyan light entering from above. Let one fish stream cross this depth hierarchy; do not add a rainbow of effects. |
| [Storm](https://www.altosadventure.com/resources/screenshots/6_Storm.png) | Dusky violet/gray palette holds near-black foreground, midtone ridges, and pale distant peaks together. Rain and lightning do not erase the silhouette hierarchy. | Storm transitions converge toward restrained blue-violet with coherent land/water fog. Keep foreground distinctly darker than distance without crushing every palm to pure black. |
| [Forest](https://www.altosadventure.com/resources/screenshots/5_Forest.png) | Tall, simple foreground silhouettes frame warm fog and lighter distant mountains. Strong local warm light is balanced by subdued gray-violet shade. | Preserve oasis plants as framing/scale elements, not the only scenery. Shape light and layered distant land behind them. Underwater use rock silhouettes instead of transplanting alpine trees. |

Downloaded inspection copies: `/tmp/matrix-alto-adventure/dawn.png`, `night.png`, `storm.png`, `forest.png`. These are temporary visual references only and are not shipping assets.

## Implementation targets and guardrails

1. Increase environmental depth with three coherent distance tiers before adding surface noise. Distant oasis land should sit behind actual dunes/models and fade into fog; underwater strata should have independent depth/parallax cues.
2. Keep a restrained palette per chapter: peach/mauve/mint at discovery; blue-violet/slate under storm; ink/teal/cyan underwater. Transition those families through the existing master progression, not abrupt scene swaps.
3. Use broad localized illumination and low-frequency haze to tie shapes together. Avoid a uniformly bright gradient or a full-screen brown/green-to-blue wash.
4. Preserve text breathing room. Use stronger environmental silhouettes at the lower edges and distant horizon; keep fine detail away from primary copy.
5. Adventure is a visual composition reference, not an underwater simulation reference. The canyon/reef application is an original adaptation; no claim is made that these screenshots depict underwater scenery.
6. Preserve existing physically rising flood, storm timing, single subdued fish stream, and no-jellyfish preference. Do not reintroduce detailed new assets, bright rainbow effects, or decorative clutter.
7. Compare oasis, early flood, ocean and underwater captures on both desktop/mobile. Look for distinct distance tiers and focal light, not a close replica of one screenshot.

## Implemented mapping

- Oasis: peach/mauve sky and three distant angular ridge layers adapt the **Dawn** screenshot’s warm focal atmosphere and pale overlapping mountains. This adds composition behind the existing oasis without importing game imagery.
- Underwater: three parallax shelf silhouettes in navy/slate/teal adapt **Night**’s foreground-to-distance value separation. Sparse cyan rim light and a restrained violet distant glow provide focal depth instead of extra creatures or multicolored particles.
- The underwater interpretation remains original to Matrix Fellows: the reference supplies palette and layering principles, not literal geography or copied assets.

The implementing agent inspected desktop captures of these changes; final verification details belong in the task handoff rather than this source note.

## Social preview refinement

Reinspected the Dawn and Night screenshots for the 1200×630 Open Graph card. Retained Matrix Fellows’ purple/orange bloom, localized the warm horizon, and introduced muted mauve/slate ridges with darker foreground separation. A sparse Cassiopeia-inspired W and fine orbital geometry echo the website’s scientific identity. The typography remains on a quiet dark field; the lower-right domain replaces the decorative tagline. All artwork is original SVG, rasterized to PNG for social crawlers.
