# Oasis terrain model references

Researched 2026-09-07 against first-party sources and the downloaded source archive. These are original third-party nature models, not artwork extracted from Alto’s Odyssey.

## Recommended pack and verified download

[Kenney Nature Kit](https://kenney.nl/assets/nature-kit) is the preferred source: its [official ZIP](https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip) contains ready-to-load binary glTF models under `Models/GLTF format/`, plus FBX, OBJ, DAE, STL and useful rendered previews. The archive identifies itself as Nature Kit 2.1. Its `License.txt` explicitly grants personal, educational and commercial use under [CC0](https://creativecommons.org/publicdomain/zero/1.0/) and states that credit is optional. This agrees with the license on the official pack page.

Downloaded research copy: `/tmp/matrix-oasis-assets.EGBA52/kenney_nature-kit.zip`; extracted root: `/tmp/matrix-oasis-assets.EGBA52/kenney/`. These temporary paths are implementation conveniences, not durable provenance sources.

All filenames and statistics below were checked directly in that official ZIP. Sizes are uncompressed GLB bytes; triangle counts come from the GLB index accessors. The proposed visual roles are art-direction judgments based on the pack’s own `Isometric/` and `Side/` previews.

| File under `Models/GLTF format/` | Bytes | Triangles | Recommended role |
| --- | ---: | ---: | --- |
| `cliff_cave_rock.glb` | 5,480 | 64 | A thin warm-rock cliff with an actual tapered opening: use as the distant arch, framed by buttes. |
| `rock_tallA.glb` | 12,072 | 136 | Tall stepped butte, an effective warm layered silhouette. |
| `rock_tallB.glb` | 14,060 | 172 | Wider stepped formation for variation and arch framing. |
| `rock_tallH.glb` | 7,792 | 78 | Smaller asymmetric formation. |
| `rock_largeA.glb` | 7,552 | 80 | Low foreground boulder/grouping. |
| `cactus_tall.glb` | 9,668 | 122 | Recognizable branched cactus silhouette; keep sparse. |
| `cactus_short.glb` | 8,844 | 116 | Short cactus variation. |
| `plant_bush.glb` | 4,396 | 32 | Very low angular leaf/rosette plant. |
| `plant_bushLarge.glb` | 6,436 | 60 | Larger angular rosette, not a rounded leafy shrub. |
| `plant_bushSmall.glb` | 3,212 | 16 | Small sparse ground accent. |

The archive also contains `cliff_blockCave_rock.glb`, but its preview has a strongly cubical tiled profile and bright green top. Prefer `cliff_cave_rock.glb` for a natural silhouette. The latter is a thin cliff facade, not a deep freestanding geological arch: local bounds are X −0.5…0.5, Y 0…1, Z 0.3315…0.5. Face it toward the viewer and flank/partially bury its square outer edges with the buttes. Every checked model has a child-node Y translation of −0.05; normalize using the complete loaded scene’s bounds rather than assuming geometry starts at world Y zero.

## Material and integration notes

The selected GLBs are textureless and use simple opaque materials, but their exported PBR materials set `metallicFactor` to 1. Replace them with the existing scene’s lit Lambert-material convention, or explicitly set metalness to zero. Recolor foliage from the pack’s bright turquoise toward restrained olive/sage. `rock_tallA/B/H` include `dirt`, `grass`, and `_defaultMat` material slots; recolor all slots coherently to sandstone/mauve so green or white patches do not survive unintentionally. These observations come directly from the GLB JSON chunks in the official archive.

The local integration source is [`app/lib/scene/oasis.ts`](../app/lib/scene/oasis.ts): it already uses an asynchronously imported `GLTFLoader`, shared geometry/material ownership, terrain clipping via `groundMaterial`, analytic grounding, flood-driven opacity, storm lighting, and a disposed-state guard. Reuse those conventions for the added model group. The current palm remains a separate Quaternius asset; do not replace its leaf alpha/wind behavior merely to unify asset sources. Retain instancing or shared geometry for repeated low plants and use only a few large formation silhouettes.

## Alternative checked

[Quaternius Ultimate Stylized Nature](https://quaternius.com/packs/ultimatestylizednature.html) also explicitly links CC0 and an [official Google Drive download folder](https://drive.google.com/drive/folders/1IV3bXHzkNvuNWFHPi4KPx-G4ghuxIuT-?usp=sharing). The existing palm’s provenance is already recorded in [`asset-licenses.md`](asset-licenses.md). Kenney is preferred for this addition because the direct archive supplies the verified small GLBs and cave-opening model above without conversion. No additional Quaternius filenames or archive contents were verified during this research.

## Source license text

The downloaded Nature Kit archive’s `License.txt` reads:

> Nature Kit (2.1)
> Created/distributed by Kenney (www.kenney.nl)
> Creation date: 29-04-2020 01:02
> License: (Creative Commons Zero, CC0)
> http://creativecommons.org/publicdomain/zero/1.0/
> This content is free to use in personal, educational and commercial projects.
> Support us by crediting Kenney or www.kenney.nl (this is not mandatory)

If shipping these models, retain a small source/license notice alongside the selected assets and update `asset-licenses.md` with the exact shipped filenames and runtime recoloring. The full source archive is unnecessary in the website payload.
